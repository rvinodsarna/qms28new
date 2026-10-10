// ============================================================
// REPLACE THE EXISTING mountDeanDashboard() FUNCTION WITH THIS.
// Paste it in the same <script> block where mountDeanDashboard
// is currently defined.
// ============================================================

async function mountDeanDashboard() {
  const main = document.getElementById('main-content');
  const user = QMS.state.user;

  if (!user || user.role !== 'dean') {
    main.innerHTML = `
      <div class="page-anim">
        <div class="alert alert-error">
          <span>🚫</span>
          <div><strong>Access Denied</strong><br/>Only the Dean can view this dashboard.</div>
        </div>
      </div>`;
    return;
  }

  main.innerHTML = `
    <div class="page-anim">
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading Dean Analytics…</p>
      </div>
    </div>`;

  try {
    const [
      kpiRes,
      programmeRes,
      tierRes,
      attendanceRes,
      complaintsRes
    ] = await Promise.all([
      supabaseClient.from('dean_kpi_summary').select('*').single(),
      supabaseClient.from('dean_programme_summary').select('*').order('programme'),
      supabaseClient.from('dean_tier_summary').select('*').order('student_count', { ascending: false }),
      supabaseClient.from('dean_attendance_summary').select('*').single(),
      supabaseClient.from('complaints')
        .select('id,title,status,created_at')
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    if (kpiRes.error) throw kpiRes.error;
    if (programmeRes.error) throw programmeRes.error;
    if (tierRes.error) throw tierRes.error;
    if (attendanceRes.error) throw attendanceRes.error;
    if (complaintsRes.error) throw complaintsRes.error;

    const kpi = kpiRes.data || {};
    const programmes = programmeRes.data || [];
    const tiers = tierRes.data || [];
    const attendance = attendanceRes.data || {};
    const complaints = complaintsRes.data || [];

    const attendanceRate = attendance.total_sessions > 0
      ? Math.min(
          100,
          Math.round(
            (attendance.total_attendance_logs /
             Math.max(1, attendance.total_sessions * Math.max(1, kpi.total_students))) * 100
          )
        )
      : 0;

    const maxTierCount = Math.max(1, ...tiers.map(t => t.student_count || 0));
    const maxProgrammeScore = Math.max(1, ...programmes.map(p => Number(p.average_score) || 0));

    main.innerHTML = `
      <div class="page-anim dean-dashboard">

        <section class="glass-card dh-hero-card">
          <div class="dh-hero">
            <div>
              <p class="dh-eyebrow">Dean Command Center</p>
              <h1 class="dh-title">Institution Overview</h1>
              <p class="dh-subtitle">
                Live academic, engagement, attendance and compliance insight.
              </p>
            </div>
          </div>

          <div class="dean-kpi-grid">
            ${deanKpiCard('🎓', 'Total Students', kpi.total_students ?? 0)}
            ${deanKpiCard('⚡', 'Average Points', kpi.average_points ?? 0)}
            ${deanKpiCard('⭐', 'Average Evaluation', kpi.average_evaluation_score ?? '-')}
            ${deanKpiCard('📸', 'Attendance Rate', attendanceRate + '%')}
            ${deanKpiCard('📣', 'Pending Complaints', kpi.pending_complaints ?? 0)}
            ${deanKpiCard('👥', 'Active Staff', kpi.active_staff ?? 0)}
          </div>
        </section>

        <div class="dean-grid-2">

          <section class="glass-card">
            <div class="card-header">
              <div class="card-title"> Programme Evaluation Health</div>
            </div>
            ${
              programmes.length === 0
                ? deanEmptyState('No evaluation data available yet.')
                : programmes.map(p => `
                    <div class="dean-metric-row">
                      <div class="dean-metric-label">${escapeHtml(p.programme)}</div>
                      <div class="dean-metric-bar">
                        <span style="width:${Math.round(((Number(p.average_score) || 0) / maxProgrammeScore) * 100)}%"></span>
                      </div>
                      <div class="dean-metric-value">
                        ${p.average_score ?? '-'} <small>(${p.evaluation_count})</small>
                      </div>
                    </div>
                  `).join('')
            }
          </section>

          <section class="glass-card">
            <div class="card-header">
              <div class="card-title">🏆 Student Tier Distribution</div>
            </div>
            ${
              tiers.length === 0
                ? deanEmptyState('No student tier data available yet.')
                : tiers.map(t => `
                    <div class="dean-metric-row">
                      <div class="dean-metric-label">${escapeHtml(t.tier)}</div>
                      <div class="dean-metric-bar">
                        <span style="width:${Math.round(((t.student_count || 0) / maxTierCount) * 100)}%"></span>
                      </div>
                      <div class="dean-metric-value">${t.student_count || 0}</div>
                    </div>
                  `).join('')
            }
          </section>

        </div>

        <div class="dean-grid-2">

          <section class="glass-card">
            <div class="card-header">
              <div class="card-title">📸 Attendance Overview</div>
            </div>
            <div class="dean-kpi-grid compact">
              ${deanKpiCard('🗂️', 'Sessions', attendance.total_sessions ?? 0)}
              ${deanKpiCard('✅', 'Active Sessions', attendance.active_sessions ?? 0)}
              ${deanKpiCard('📝', 'Attendance Logs', attendance.total_attendance_logs ?? 0)}
              ${deanKpiCard('👤', 'Students Scanned', attendance.students_with_attendance ?? 0)}
            </div>
          </section>

          <section class="glass-card">
            <div class="card-header">
              <div class="card-title">📣 Recent Complaints</div>
              <button class="btn btn-sm btn-ghost" onclick="navigate('complaints')">View All</button>
            </div>
            ${
              complaints.length === 0
                ? deanEmptyState('No recent complaints.')
                : complaints.map(c => `
                    <div class="dean-list-row">
                      <div>
                        <strong>${escapeHtml(c.title || 'Untitled complaint')}</strong>
                        <small>${escapeHtml(c.created_at ? new Date(c.created_at).toLocaleString() : '')}</small>
                      </div>
                      <span class="approval-badge ${String(c.status || '').toLowerCase()}">
                        ${escapeHtml(c.status || 'Unknown')}
                      </span>
                    </div>
                  `).join('')
            }
          </section>

        </div>

        <section class="glass-card">
          <div class="card-header">
            <div class="card-title">📌 Dean Quick Actions</div>
          </div>
          <div class="dean-action-grid">
            <button class="dean-action-btn" onclick="navigate('staff-management')">👥 Manage Staff</button>
            <button class="dean-action-btn" onclick="navigate('student-management')">🎓 Manage Students</button>
            <button class="dean-action-btn" onclick="openDeanEvaluationAudit()">🔎 Evaluation Audit</button>
            <button class="dean-action-btn" onclick="navigate('weekly-report')">📋 Weekly Report</button>
            <button class="dean-action-btn" onclick="navigate('credit-transfer')">🔄 Credit Transfer</button>
            <button class="dean-action-btn" onclick="navigate('database-admin')">🔐 Database Admin</button>
          </div>
        </section>

      </div>`;
  } catch (error) {
    console.error('Dean dashboard error:', error);
    main.innerHTML = `
      <div class="page-anim">
        <div class="alert alert-error">
          <span>⚠️</span>
          <div>
            <strong>Unable to load Dean Analytics</strong><br/>
            ${escapeHtml(error.message || 'Please check the database views and try again.')}
          </div>
        </div>
      </div>`;
  }
}

function deanKpiCard(icon, label, value) {
  return `
    <div class="dean-kpi-card">
      <div class="dean-kpi-icon">${icon}</div>
      <div class="dean-kpi-value">${escapeHtml(String(value ?? '0'))}</div>
      <div class="dean-kpi-label">${escapeHtml(label)}</div>
    </div>`;
}

function deanEmptyState(message) {
  return `<div class="dean-empty">${escapeHtml(message)}</div>`;
}

// ============================================================
// ADD THIS CSS near the other Dean Dashboard styles.
// ============================================================
const DEAN_DASHBOARD_CSS = `
.dean-dashboard { display:flex; flex-direction:column; gap:18px; }
.dean-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; }
.dean-kpi-grid.compact { grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); }
.dean-kpi-card { padding:16px; border-radius:16px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); }
.dean-kpi-icon { font-size:20px; }
.dean-kpi-value { font-size:26px; font-weight:800; margin-top:6px; }
.dean-kpi-label { font-size:12px; opacity:.72; margin-top:2px; }
.dean-grid-2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:18px; }
.dean-metric-row { display:grid; grid-template-columns:110px 1fr 84px; align-items:center; gap:10px; margin-bottom:12px; }
.dean-metric-label { font-size:13px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dean-metric-bar { height:9px; border-radius:99px; background:rgba(255,255,255,.08); overflow:hidden; }
.dean-metric-bar span { display:block; height:100%; background:linear-gradient(90deg,#00f5ff,#7c3aed); }
.dean-metric-value { font-size:13px; font-weight:800; text-align:right; }
.dean-list-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.07); }
.dean-list-row small { display:block; opacity:.65; }
.dean-action-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; }
.dean-action-btn { padding:14px; border-radius:14px; border:1px solid rgba(0,245,255,.22); background:rgba(0,245,255,.06); color:inherit; font-weight:700; cursor:pointer; }
.dean-empty { padding:18px; text-align:center; opacity:.65; font-size:13px; }
@media (max-width:640px) {
  .dean-metric-row { grid-template-columns:88px 1fr 66px; }
  .dean-kpi-value { font-size:22px; }
  .dean-action-btn { width:100%; }
}
`;
document.head.insertAdjacentHTML('beforeend', `<style>${DEAN_DASHBOARD_CSS}</style>`);
