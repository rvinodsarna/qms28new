#!/usr/bin/env node

/**
 * dedupe_faces.js
 *
 * Purpose:
 *   Detect and remove redundant face descriptors that are near-duplicates of
 *   each other using the 128-d descriptor vectors already stored in the app.
 *
 * This is designed for the QMS face-auth flow in this repo, where each entry in
 * `face_credentials.descriptors` is a list of face vectors from face-api.js.
 *
 * HOW IT WORKS:
 *   - Loads face credential rows from Supabase or a JSON file.
 *   - Compares each descriptor against previously kept representative faces.
 *   - Uses L2 distance on normalized descriptors as a similarity metric.
 *   - If distance is below a threshold, it is treated as a duplicate.
 *   - Writes a report and optional cleaned JSON export.
 *
 * SAFETY:
 *   - Default behavior is dry-run: no database deletes are performed.
 *   - Review the output before running with --apply.
 *
 * USAGE:
 *   1) Dry-run from JSON file:
 *      node dedupe_faces.js --input face-db.json --dry-run
 *
 *   2) Dry-run from Supabase:
 *      SUPABASE_URL=... SUPABASE_ANON_KEY=... node dedupe_faces.js --dry-run
 *
 *   3) Apply deduplication to Supabase:
 *      SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node dedupe_faces.js --apply
 *
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_THRESHOLD = Number(process.env.DEDUPE_THRESHOLD || 0.45);
const DEFAULT_MAX_PER_CLUSTER = Number(process.env.DEDUPE_MAX_PER_CLUSTER || 1);

function log(msg) {
  console.log(msg);
}

function warn(msg) {
  console.warn(msg);
}

function clampNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseArgs(argv) {
  const args = { dryRun: true, apply: false, input: null, output: null, threshold: DEFAULT_THRESHOLD, maxPerCluster: DEFAULT_MAX_PER_CLUSTER };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--apply') args.apply = true; 
    if (token === '--dry-run') args.dryRun = true;
    if (token === '--input') args.input = argv[++i];
    if (token === '--output') args.output = argv[++i];
    if (token === '--threshold') args.threshold = clampNumber(argv[++i], DEFAULT_THRESHOLD);
    if (token === '--max-per-cluster') args.maxPerCluster = clampNumber(argv[++i], DEFAULT_MAX_PER_CLUSTER);
    if (token === '--no-dry-run') args.dryRun = false;
  }
  if (args.apply) args.dryRun = false;
  return args;
}

function normalizeVector(vec) {
  if (!Array.isArray(vec)) return [];
  const arr = vec.map((v) => Number(v));
  const norm = Math.sqrt(arr.reduce((sum, x) => sum + x * x, 0) || 1);
  return arr.map((x) => (norm === 0 ? 0 : x / norm));
}

function l2Distance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return Infinity;
  const maxLen = Math.max(a.length, b.length);
  let total = 0;
  for (let i = 0; i < maxLen; i++) {
    const av = Number(a[i] || 0);
    const bv = Number(b[i] || 0);
    total += (av - bv) * (av - bv);
  }
  return Math.sqrt(total);
}

function toDescriptorList(descriptors) {
  if (Array.isArray(descriptors)) {
    return descriptors;
  }
  if (Array.isArray(descriptors?.[0])) {
    return descriptors;
  }
  return [];
}

function getBestRepresentative(cluster) {
  if (!cluster || !cluster.samples || !cluster.samples.length) return null;
  return cluster.samples.reduce((best, sample) => {
    if (!best) return sample;
    if ((sample.quality || 0) > (best.quality || 0)) return sample;
    return best;
  }, null);
}

function descriptorQualityScore(row) {
  const desc = toDescriptorList(row?.descriptors);
  if (!desc.length) return 0;

  // A crude signal: more samples usually means stronger identity confidence.
  // We will prefer entries with more representative descriptor vectors if needed.
  const sampleCount = Array.isArray(desc[0]) ? desc.length : 1;
  return Number(sampleCount || 0);
}

function dedupeRows(rows, threshold, maxPerCluster) {
  const clusters = [];

  for (const row of rows) {
    const descriptors = toDescriptorList(row.descriptors);
    if (!descriptors.length) continue;

    let matchedCluster = null;
    let bestDistance = Infinity;

    for (const cluster of clusters) {
      const rep = getBestRepresentative(cluster);
      if (!rep) continue;

      const repDesc = toDescriptorList(rep.descriptors);
      for (const candidate of repDesc) {
        const repVec = normalizeVector(candidate);
        for (const current of descriptors) {
          const currentVec = normalizeVector(current);
          const d = l2Distance(repVec, currentVec);
          if (d < bestDistance) {
            bestDistance = d;
            matchedCluster = cluster;
          }
        }
      }
    }

    if (matchedCluster && bestDistance <= threshold) {
      const cluster = matchedCluster;
      cluster.samples.push({
        ...row,
        quality: descriptorQualityScore(row),
      });

      if (cluster.samples.length > maxPerCluster) {
        // Keep the best sample only; drop the rest from the cluster.
        cluster.samples.sort((a, b) => (b.quality || 0) - (a.quality || 0));
        cluster.samples = cluster.samples.slice(0, maxPerCluster);
      }
      continue;
    }

    clusters.push({
      samples: [{ ...row, quality: descriptorQualityScore(row) }],
    });
  }

  return clusters.map((cluster) => ({
    kept: getBestRepresentative(cluster),
    duplicates: cluster.samples.slice(1).map((s) => ({ id: s.id, user_id: s.user_id || null })),
    total: cluster.samples.length,
  }));
}

async function readJsonFile(filePath) {
  if (!filePath) return [];
  const absolute = path.resolve(filePath);
  const txt = fs.readFileSync(absolute, 'utf8');
  const parsed = JSON.parse(txt);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.data)) return parsed.data;
  if (parsed && Array.isArray(parsed.rows)) return parsed.rows;
  return [];
}

async function loadFromSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SERVICE_KEY / SUPABASE_ANON_KEY environment variables.');
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.from('face_credentials').select('id, user_id, descriptors, enrolled_at, updated_at');
  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }
  return data || [];
}

function buildReport(rows, threshold, maxPerCluster) {
  const deduped = dedupeRows(rows, threshold, maxPerCluster);
  const duplicates = deduped.filter((c) => c.duplicates.length > 0).reduce((sum, c) => sum + c.duplicates.length, 0);
  const kept = deduped.length;
  return {
    threshold,
    maxPerCluster,
    inputRows: rows.length,
    uniqueClusters: kept,
    duplicateRowsRemoved: duplicates,
    clusters: deduped,
  };
}

async function maybeApplyToSupabase(report) {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_KEY required when using --apply.');
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, serviceKey, { auth: { persistSession: false } });

  const deleteIds = [];
  for (const cluster of report.clusters) {
    for (const dup of cluster.duplicates) {
      if (dup && dup.id) deleteIds.push(dup.id);
    }
  }

  if (!deleteIds.length) {
    log('No duplicate rows to delete.');
    return { deleted: 0, ids: [] };
  }

  const { error } = await supabase.from('face_credentials').delete().in('id', deleteIds);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }

  return { deleted: deleteIds.length, ids: deleteIds };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  try {
    let rows = [];

    if (args.input) {
      rows = await readJsonFile(args.input);
      log(`Loaded ${rows.length} rows from ${args.input}`);
    } else {
      rows = await loadFromSupabase();
      log(`Loaded ${rows.length} rows from Supabase`);
    }

    const report = buildReport(rows, args.threshold, args.maxPerCluster);

    const totalDuplicateRows = report.duplicateRowsRemoved;
    log('--- Duplicate report ---');
    log(`Input rows: ${report.inputRows}`);
    log(`Unique facial clusters: ${report.uniqueClusters}`);
    log(`Rows flagged as duplicates: ${totalDuplicateRows}`);
    log(`Distance threshold: ${report.threshold}`);
    log(`Max items kept per cluster: ${report.maxPerCluster}`);

    if (args.output) {
      fs.writeFileSync(path.resolve(args.output), JSON.stringify(report, null, 2), 'utf8');
      log(`Saved report to ${args.output}`);
    }

    if (args.dryRun) {
      log('Dry run only. No records were deleted. Use --apply to commit the cleanup.');
      return;
    }

    const result = await maybeApplyToSupabase(report);
    log(`Deleted duplicate rows: ${result.deleted}`);
    if (result.ids.length) {
      log(`Deleted IDs: ${result.ids.join(', ')}`);
    }
  } catch (err) {
    console.error('dedupe_faces.js failed');
    console.error(err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();

module.exports = {
  normalizeVector,
  l2Distance,
  dedupeRows,
  buildReport,
};

// End of file
'},