/* Award & Recognition — student detail page */
(function () {
  "use strict";
  if (window.__awardPage) return;
  window.__awardPage = true;

  function sb(){ return window.qmsSupabase || window.supabaseClient; }
  function esc(s){ return window.escHtml ? escHtml(String(s==null?"":s)) : String(s==null?"":s); }

  var LEVEL_COLORS = {
    Gold: "#ffb800", Silver: "#c0c0c0", Bronze: "#cd7f32",
    Merit: "#00e5c0", Participation: "#9fb0d0",
    Programme: "#00f5ff", School: "#a855f7", National: "#ff3860", International: "#ffb800"
  };

  var ICONS = {
    medal: "🥇", award: "🏅"
  };

  async function mountAwardPage() {
    var el = document.getElementById("main-content");
    if (!el) return;
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || u.role !== "student") return;

    el.innerHTML = '<div class="page-anim"><div class="page-title">🏅 Award &amp; Recognition</div><p>Loading…</p></div>';

    // Get awards this student received
    var r = await sb()
      .from("award_recipients")
      .select("awarded_at, award_batches!inner(id, award_type, award_level, title, points_per_student, notes, created_at)")
      .eq("student_id", u.id)
      .order("awarded_at", { ascending: false });

    if (r.error) {
      console.error("[award-page]", r.error);
      el.innerHTML = '<div class="page-anim"><div class="page-title">🏅 Award &amp; Recognition</div><p style="color:#ff2d7a;">Failed to load awards.</p></div>';
      return;
    }

    var rows = r.data || [];
    var total = rows.reduce(function(a, x){ return a + Number(x.award_batches.points_per_student || 0); }, 0);

    // Get cap
    var catRes = await sb().from("rise_point_categories").select("*").eq("code", "award_recognition").single();
    var isDip = (u.programme || "").toLowerCase().indexOf("dip") !== -1
             || ["DIT","DCY"].indexOf(u.programme) !== -1;
    var cap = catRes.data
      ? (isDip ? Number(catRes.data.max_points_diploma) : Number(catRes.data.max_points_degree))
      : 200;
    var capped = Math.min(total, cap);
    var pct = cap > 0 ? (capped / cap) * 100 : 0;

    var summaryCard = ''
      + '<div style="padding:22px;border:1px solid rgba(255,184,0,0.25);border-radius:14px;background:linear-gradient(160deg,rgba(255,184,0,0.06) 0%,rgba(255,184,0,0.01) 100%);margin-bottom:22px;">'
      +   '<div style="display:flex;justify-content:space-between;align-items:baseline;">'
      +     '<div>'
      +       '<div style="font-size:11px;letter-spacing:2px;opacity:0.6;">AWARD &amp; RECOGNITION POINTS</div>'
      +       '<div style="font-size:13px;opacity:0.7;margin-top:4px;">' + rows.length + ' award' + (rows.length === 1 ? '' : 's') + ' received</div>'
      +     '</div>'
      +     '<div style="text-align:right;">'
      +       '<div style="font-size:34px;font-weight:800;color:#ffb800;line-height:1;">' + capped + '</div>'
      +       '<div style="font-size:11px;opacity:0.5;">of ' + cap + ' (' + pct.toFixed(1) + '%)</div>'
      +     '</div>'
      +   '</div>'
      +   '<div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;margin-top:16px;">'
      +     '<div style="height:100%;width:' + pct.toFixed(1) + '%;background:linear-gradient(90deg,#ffb800,#00e5c0);border-radius:4px;"></div>'
      +   '</div>'
      + '</div>';

    var body = rows.length ? rows.map(function (row) {
      var b = row.award_batches;
      var color = LEVEL_COLORS[b.award_level] || "#ffb800";
      var icon = ICONS[b.award_type] || "🏅";
      var date = new Date(row.awarded_at).toLocaleDateString();

      return ''
        + '<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border:1px solid ' + color + '33;border-radius:10px;margin-bottom:10px;background:' + color + '0a;">'
        +   '<div style="font-size:28px;">' + icon + '</div>'
        +   '<div style="flex:1;min-width:0;">'
        +     '<div style="font-weight:600;">' + esc(b.title) + '</div>'
        +     '<div style="font-size:12px;opacity:0.7;margin-top:3px;">' + esc(b.award_type) + ' · ' + esc(b.award_level) + '</div>'
        +     '<div style="font-size:11px;opacity:0.5;margin-top:4px;">Awarded ' + date + '</div>'
        +   '</div>'
        +   '<div style="text-align:right;">'
        +     '<div style="font-weight:700;color:' + color + ';font-size:18px;">+' + b.points_per_student + '</div>'
        +     '<div style="font-size:10px;opacity:0.5;">pts</div>'
        +   '</div>'
        + '</div>';
    }).join("") : '<p style="opacity:0.6;">No awards yet. Awards appear here when the Dean or HOP recognises your achievements.</p>';

    el.innerHTML = ''
      + '<div class="page-anim">'
      +   '<div class="page-title">🏅 Award &amp; Recognition</div>'
      +   '<p style="opacity:0.7;margin-bottom:18px;font-size:13px;">Formal honours and achievements recognised by So-CSI leadership.</p>'
      +   summaryCard
      +   '<div style="font-size:11px;letter-spacing:2px;opacity:0.6;margin-bottom:12px;">AWARDS RECEIVED</div>'
      +   body
      + '</div>';
  }

  window.mountAwardPage = mountAwardPage;

  if (typeof window.navigate === "function" && !window.__awardPageNav) {
    var orig = window.navigate;
    window.navigate = function (route) {
      if (route === "award-recognition") {
        try { return mountAwardPage(); } catch (e) { console.error("[award-page]", e); }
      }
      return orig.apply(this, arguments);
    };
    window.__awardPageNav = true;
  }

  console.log("[award-page] loaded");
})();