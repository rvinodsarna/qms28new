/* HOP / Dean Dashboard: So-CSI stats panel with programme breakdown */
(function () {
  "use strict";
  if (window.__hopStatsLoaded) return;
  window.__hopStatsLoaded = true;

  var PROGRAMMES = ["BCY", "BDS", "DCY", "DIT"];
  var PROGRAMME_FULL = {
    BCY: "Bachelor of Cybersecurity",
    BDS: "Bachelor of Data Science",
    DCY: "Diploma in Cybersecurity",
    DIT: "Diploma in Information Technology"
  };
  var HIDE_LABELS = [
    "Total Students", "Avg RISE Points", "Avg Eval Score", "Attendance Rate", "Total Courses",
    "Pending Complaints", "Pending Feedback", "Pending Appeals", "Open Complaints",
    "Total Lecturers", "Total Staff", "Avg Attendance"
  ];

  function sb(){ return window.qmsSupabase || window.supabaseClient; }

  function hideExistingKpiCards() {
    var nodes = document.querySelectorAll("*");
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.children.length > 0) continue;
      var t = n.textContent.trim();
      if (HIDE_LABELS.indexOf(t) === -1) continue;
      var card = n;
      for (var j = 0; j < 5 && card.parentElement; j++) {
        card = card.parentElement;
        if (card.parentElement && card.parentElement.children.length >= 2) break;
      }
      if (card && card.parentElement && card.getAttribute("data-hidden-kpi") !== "1") {
        card.style.display = "none";
        card.setAttribute("data-hidden-kpi", "1");
      }
    }
  }

  async function fetchStats() {
    var out = { socsi: 0, byProg: {}, pending: 0, active: 0, avgPoints: "0.0", sumPoints: 0 };
    PROGRAMMES.forEach(function(p){ out.byProg[p] = 0; });

    var progRes = await sb().from("sp_students")
      .select("programme")
      .in("programme", PROGRAMMES);

    if (!progRes.error && progRes.data) {
      out.socsi = progRes.data.length;
      progRes.data.forEach(function(r){
        if (out.byProg[r.programme] !== undefined) out.byProg[r.programme]++;
      });
    }

    // Fetch RISE points separately from rise_points table
    var ptsRes = await sb().from("rise_points").select("student_id, pts");
    if (!ptsRes.error && ptsRes.data) {
      var sumPts = ptsRes.data.reduce(function(s, r) { return s + Number(r.pts || 0); }, 0);
      out.sumPoints = sumPts;
      out.avgPoints = out.socsi > 0 ? (sumPts / out.socsi).toFixed(1) : "0.0";
    }

    var pendingRes = await sb().from("student_clubs")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending_hop","pending_dean"]);
    out.pending = pendingRes.count || 0;

    var activeRes = await sb().from("student_clubs")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    out.active = activeRes.count || 0;

    return out;
  }

  function cardHtml(o) {
    var badge = o.badge
      ? '<div style="font-size:10px;letter-spacing:1.5px;padding:4px 8px;border-radius:6px;background:' + o.accent + '22;color:' + o.accent + ';font-weight:600;">' + o.badge + '</div>'
      : '';
    var sub = o.sub
      ? '<div style="font-size:11px;opacity:0.5;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);">' + o.sub + '</div>'
      : '';
    return ''
      + '<div style="position:relative;overflow:hidden;padding:22px;border-radius:16px;background:linear-gradient(160deg, ' + o.bg1 + ' 0%, ' + o.bg2 + ' 100%);border:1px solid ' + o.border + ';">'
      +   '<div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg, transparent, ' + o.accent + ', transparent);"></div>'
      +   '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">'
      +     '<div style="width:42px;height:42px;border-radius:11px;background:' + o.accent + '22;border:1px solid ' + o.accent + '55;display:flex;align-items:center;justify-content:center;font-size:20px;">' + o.icon + '</div>'
      +     badge
      +   '</div>'
      +   '<div style="font-size:38px;font-weight:800;line-height:1;color:' + o.accent + ';letter-spacing:-1px;">' + o.value + '</div>'
      +   '<div style="font-size:13px;opacity:0.7;margin-top:6px;letter-spacing:0.5px;">' + o.label + '</div>'
      +   sub
      + '</div>';
  }

  function buildHtml(stats) {
    var maxCount = 1;
    PROGRAMMES.forEach(function(p){ if ((stats.byProg[p]||0) > maxCount) maxCount = stats.byProg[p]; });

    var cards = ''
      + cardHtml({ icon: "🎓", value: stats.socsi, label: "So-CSI Students",
          accent: "#00f5ff", bg1: "rgba(0,245,255,0.06)", bg2: "rgba(0,245,255,0.01)",
          border: "rgba(0,245,255,0.22)", badge: "SCHOOL",
          sub: "Active enrolment across 4 programmes" })
      + cardHtml({ icon: "🏛️", value: stats.active, label: "Active Club Memberships",
          accent: "#00e5c0", bg1: "rgba(0,229,192,0.06)", bg2: "rgba(0,229,192,0.01)",
          border: "rgba(0,229,192,0.22)", sub: "Approved across all clubs" })
      + cardHtml({ icon: "⏳", value: stats.pending, label: "Pending Approvals",
          accent: "#ffb800", bg1: "rgba(255,184,0,0.06)", bg2: "rgba(255,184,0,0.01)",
          border: "rgba(255,184,0,0.22)", badge: stats.pending > 0 ? "ACTION" : null,
          sub: "Club requests awaiting HOP / Dean" })
      + cardHtml({ icon: "⭐", value: stats.avgPoints, label: "Avg RISE Points",
          accent: "#a855f7", bg1: "rgba(168,85,247,0.06)", bg2: "rgba(168,85,247,0.01)",
          border: "rgba(168,85,247,0.22)",
          sub: "Per So-CSI student · total " + stats.sumPoints + " pts" });

    var breakdownRows = PROGRAMMES.map(function(p){
      var count = stats.byProg[p] || 0;
      var share = stats.socsi > 0 ? ((count / stats.socsi) * 100).toFixed(1) : "0.0";
      var barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
      return ''
        + '<div style="display:grid;grid-template-columns:80px 1fr 90px 70px;gap:16px;align-items:center;padding:16px;border-bottom:1px solid rgba(255,255,255,0.05);">'
        +   '<div style="font-size:16px;font-weight:800;color:#00f5ff;letter-spacing:1px;">' + p + '</div>'
        +   '<div>'
        +     '<div style="font-size:13px;">' + PROGRAMME_FULL[p] + '</div>'
        +     '<div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.06);overflow:hidden;margin-top:8px;">'
        +       '<div style="height:100%;width:' + barWidth + '%;background:linear-gradient(90deg,#00f5ff,#00e5c0);border-radius:3px;"></div>'
        +     '</div>'
        +   '</div>'
        +   '<div style="text-align:right;font-size:24px;font-weight:700;">' + count + '</div>'
        +   '<div style="text-align:right;font-size:13px;opacity:0.6;">' + share + '%</div>'
        + '</div>';
    }).join("");

    var breakdown = ''
      + '<div style="padding:22px 22px 12px;border-radius:16px;background:linear-gradient(160deg, rgba(0,245,255,0.04) 0%, rgba(0,245,255,0.005) 100%);border:1px solid rgba(0,245,255,0.18);">'
      +   '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">'
      +     '<div style="font-size:11px;letter-spacing:2px;opacity:0.6;">PROGRAMME BREAKDOWN</div>'
      +     '<div style="font-size:11px;opacity:0.5;">' + stats.socsi + ' total active</div>'
      +   '</div>'
      +   '<div style="display:grid;grid-template-columns:80px 1fr 90px 70px;gap:16px;padding:0 16px 10px;font-size:10px;opacity:0.5;letter-spacing:1.5px;border-bottom:1px solid rgba(255,255,255,0.08);">'
      +     '<div>CODE</div><div>PROGRAMME</div><div style="text-align:right;">STUDENTS</div><div style="text-align:right;">SHARE</div>'
      +   '</div>'
      +   breakdownRows
      + '</div>';

    return ''
      + '<div data-hop-stats="1" style="margin-bottom:24px;display:flex;flex-direction:column;gap:18px;">'
      +   '<div>'
      +     '<div style="font-size:11px;letter-spacing:2px;opacity:0.6;margin-bottom:14px;">SO-CSI COMMAND OVERVIEW</div>'
      +     '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;">'
      +       cards
      +     '</div>'
      +   '</div>'
      +   breakdown
      + '</div>';
  }

  var rendering = false;
  async function inject() {
    if (rendering) return;
    rendering = true;
    try {
      var u = window.QMS && QMS.state && QMS.state.user;
      if (!u || (u.role !== "hop" && u.role !== "dean" && u.role !== "admin")) { rendering = false; return; }
      var main = document.getElementById("main-content");
      if (!main) { rendering = false; return; }

      var hasDefault = false;
      var nodes = document.querySelectorAll("*");
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].children.length > 0) continue;
        if (HIDE_LABELS.indexOf(nodes[i].textContent.trim()) !== -1) { hasDefault = true; break; }
      }
      if (!hasDefault && !document.querySelector("[data-hop-stats]")) { rendering = false; return; }

      hideExistingKpiCards();
      var stats = await fetchStats();
      var html = buildHtml(stats);
      var wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      var newPanel = wrapper.firstElementChild;

      var existing = document.querySelector("[data-hop-stats]");
      if (existing) existing.replaceWith(newPanel);
      else main.insertBefore(newPanel, main.firstChild);

      // Also hide any leftover old KPI cards below our panel
      setTimeout(hideExistingKpiCards, 300);
    } catch (e) {
      console.error("[hop-stats] failed:", e);
    }
    rendering = false;
  }

  setTimeout(inject, 700);
  setTimeout(inject, 2000);

  setInterval(function () {
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || (u.role !== "hop" && u.role !== "dean" && u.role !== "admin")) return;
    if (!document.querySelector("[data-hop-stats]")) inject();
    else hideExistingKpiCards();
  }, 5000);

  if (typeof window.navigate === "function" && !window.__hopStatsNavWrapped) {
    var orig = window.navigate;
    window.navigate = function (route) {
      var r = orig.apply(this, arguments);
      if (route === "hop-dashboard" || route === "dashboard") setTimeout(inject, 600);
      return r;
    };
    window.__hopStatsNavWrapped = true;
  }
})();