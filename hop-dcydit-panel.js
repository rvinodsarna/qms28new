/* hop-dcydit-panel.js
   Appends a DCY/DIT analytics panel to the HOP Dashboard.
   Non-invasive. Only runs for role=hop. */
(function () {
  if (window.__hopDcyDitInstalled) return;
  window.__hopDcyDitInstalled = true;

  var PROGRAMMES = ["DCY", "DIT"];
  var LABEL = { DCY: "DCY · Diploma in Cybersecurity", DIT: "DIT · Diploma in Info Tech" };

  function sb() { return window.qmsSupabase || window.supabaseClient; }
  function esc(s) { return window.escHtml ? escHtml(String(s == null ? "" : s)) : String(s == null ? "" : s); }

  function injectStyles() {
    if (document.getElementById("hopdcyd-styles")) return;
    var s = document.createElement("style");
    s.id = "hopdcyd-styles";
    s.textContent = [
      ".hdy-panel{margin-top:24px;padding:22px 24px;}",
      ".hdy-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px;}",
      ".hdy-eyebrow{font-family:var(--font-mono);font-size:10.5px;letter-spacing:1.8px;opacity:0.6;color:var(--color-primary);margin-bottom:4px;}",
      ".hdy-title{font-family:var(--font-display);font-size:22px;font-weight:800;letter-spacing:-0.3px;}",
      ".hdy-sub{font-size:12.5px;opacity:0.7;margin-top:3px;}",
      ".hdy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:20px;}",
      ".hdy-stat{padding:16px 18px;border:1px solid rgba(255,255,255,0.08);border-radius:12px;background:rgba(255,255,255,0.02);}",
      ".hdy-stat-label{font-size:10.5px;letter-spacing:1.5px;opacity:0.55;margin-bottom:6px;font-family:var(--font-mono);}",
      ".hdy-stat-value{font-family:var(--font-display);font-size:30px;font-weight:800;line-height:1;}",
      ".hdy-stat-sub{font-size:11.5px;opacity:0.55;margin-top:6px;}",
      ".hdy-tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}",
      ".hdy-tab{padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:transparent;cursor:pointer;font-size:12px;font-weight:600;color:inherit;font-family:inherit;transition:all .15s;}",
      ".hdy-tab.active{background:var(--color-primary);color:#000;border-color:var(--color-primary);}",
      ".hdy-table-wrap{overflow-x:auto;}",
      ".hdy-table{width:100%;border-collapse:collapse;font-size:12.5px;}",
      ".hdy-table th{text-align:left;padding:8px 10px;font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.5;border-bottom:1px solid rgba(255,255,255,0.08);font-family:var(--font-mono);font-weight:600;}",
      ".hdy-table td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.05);}",
      ".hdy-table tr:last-child td{border-bottom:none;}",
      ".hdy-badge{display:inline-block;padding:2px 9px;border-radius:999px;font-family:var(--font-mono);font-size:10.5px;font-weight:700;letter-spacing:0.5px;}",
      ".hdy-badge-dcy{background:rgba(0,245,255,0.14);color:#00f5ff;}",
      ".hdy-badge-dit{background:rgba(168,85,247,0.16);color:#c084fc;}",
      ".hdy-loading{font-size:12.5px;opacity:0.55;padding:14px 0;}"
    ].join("\n");
    document.head.appendChild(s);
  }

  async function fetchAnalytics() {
    var results = { students: {}, courses: {}, intakes: {} };

    for (var i = 0; i < PROGRAMMES.length; i++) {
      var p = PROGRAMMES[i];
      var stu = await sb().from("sp_students").select("enrollment_no, intake").eq("programme", p);
      var co = await sb().from("sp_courses").select("course_code").eq("programme", p);

      var students = stu.data || [];
      var courses = co.data || [];

      results.students[p] = students.length;
      results.courses[p] = courses.length;

      var byIntake = {};
      students.forEach(function (s) {
        var k = s.intake || "Unknown";
        byIntake[k] = (byIntake[k] || 0) + 1;
      });
      results.intakes[p] = Object.entries(byIntake)
        .map(function (e) { return { intake: e[0], count: e[1] }; })
        .sort(function (a, b) { return b.count - a.count; });
    }
    return results;
  }

  function buildPanel(data, active) {
    var totalStu = (data.students.DCY || 0) + (data.students.DIT || 0);
    var totalCo = (data.courses.DCY || 0) + (data.courses.DIT || 0);

    var stats =
      '<div class="hdy-stat">' +
        '<div class="hdy-stat-label">TOTAL DIPLOMA STUDENTS</div>' +
        '<div class="hdy-stat-value" style="color:var(--color-primary);">' + totalStu + '</div>' +
        '<div class="hdy-stat-sub">' + (data.students.DCY || 0) + ' DCY · ' + (data.students.DIT || 0) + ' DIT</div>' +
      '</div>' +
      '<div class="hdy-stat">' +
        '<div class="hdy-stat-label">DCY STUDENTS</div>' +
        '<div class="hdy-stat-value" style="color:#00f5ff;">' + (data.students.DCY || 0) + '</div>' +
        '<div class="hdy-stat-sub">' + (data.courses.DCY || 0) + ' courses in catalogue</div>' +
      '</div>' +
      '<div class="hdy-stat">' +
        '<div class="hdy-stat-label">DIT STUDENTS</div>' +
        '<div class="hdy-stat-value" style="color:#c084fc;">' + (data.students.DIT || 0) + '</div>' +
        '<div class="hdy-stat-sub">' + (data.courses.DIT || 0) + ' courses in catalogue</div>' +
      '</div>' +
      '<div class="hdy-stat">' +
        '<div class="hdy-stat-label">CATALOGUE</div>' +
        '<div class="hdy-stat-value" style="color:var(--color-green);">' + totalCo + '</div>' +
        '<div class="hdy-stat-sub">Combined diploma courses</div>' +
      '</div>';

    var tabs =
      '<div class="hdy-tabs">' +
        PROGRAMMES.map(function (p) {
          return '<button class="hdy-tab ' + (p === active ? "active" : "") + '" data-hdy-tab="' + p + '">' + esc(LABEL[p]) + '</button>';
        }).join("") +
      '</div>';

    var rows = data.intakes[active] || [];
    var maxCount = rows.reduce(function (m, r) { return Math.max(m, r.count); }, 1);
    var totalForTab = (data.students[active] || 0);

    var table =
      '<div class="hdy-table-wrap">' +
        '<table class="hdy-table">' +
          '<thead><tr>' +
            '<th>Intake</th>' +
            '<th>Students</th>' +
            '<th style="width:40%;">Distribution</th>' +
            '<th>Share</th>' +
          '</tr></thead>' +
          '<tbody>' +
            (rows.length
              ? rows.map(function (r) {
                  var pct = totalForTab ? ((r.count / totalForTab) * 100).toFixed(1) : "0.0";
                  var bar = Math.round((r.count / maxCount) * 100);
                  return '<tr>' +
                    '<td><span class="hdy-badge hdy-badge-' + active.toLowerCase() + '">' + esc(r.intake) + '</span></td>' +
                    '<td><strong>' + r.count + '</strong></td>' +
                    '<td><div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">' +
                      '<div style="height:100%;width:' + bar + '%;background:linear-gradient(90deg,var(--color-primary),#a855f7);border-radius:3px;"></div>' +
                    '</div></td>' +
                    '<td>' + pct + '%</td>' +
                  '</tr>';
                }).join("")
              : '<tr><td colspan="4" style="opacity:0.5;">No students in this programme.</td></tr>') +
          '</tbody>' +
        '</table>' +
      '</div>';

    return '<div class="glass-card hdy-panel" data-hopdcyd-panel="1">' +
      '<div class="hdy-head">' +
        '<div>' +
          '<div class="hdy-eyebrow">DIPLOMA PROGRAMMES · ANALYTICS</div>' +
          '<div class="hdy-title">Diploma Student Distribution</div>' +
          '<div class="hdy-sub">DCY and DIT intakes from the Sept 2026 term</div>' +
        '</div>' +
        '<button class="btn btn-sm btn-outline" onclick="navigate(\'student-management\')">Open Student Management →</button>' +
      '</div>' +
      '<div class="hdy-grid">' + stats + '</div>' +
      tabs +
      table +
    '</div>';
  }

  var cachedData = null;
  var activeTab = "DCY";

  async function refresh(force) {
    var panel = document.querySelector("[data-hopdcyd-panel]");
    if (!panel) return;
    if (!cachedData || force) {
      panel.innerHTML = '<div class="hdy-head"><div><div class="hdy-eyebrow">DIPLOMA PROGRAMMES · ANALYTICS</div><div class="hdy-title">Diploma Student Distribution</div></div></div><div class="hdy-loading">Loading DCY/DIT analytics…</div>';
      cachedData = await fetchAnalytics();
    }
    var p2 = document.querySelector("[data-hopdcyd-panel]");
    if (!p2) return;
    p2.outerHTML = buildPanel(cachedData, activeTab);
    bindTabs();
  }

  function bindTabs() {
    document.querySelectorAll("[data-hdy-tab]").forEach(function (btn) {
      btn.onclick = function () {
        activeTab = btn.getAttribute("data-hdy-tab");
        if (cachedData) {
          var p = document.querySelector("[data-hopdcyd-panel]");
          if (p) { p.outerHTML = buildPanel(cachedData, activeTab); bindTabs(); }
        }
      };
    });
  }

  var inflight = false;
  async function injectIfNeeded() {
    if (inflight) return;
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || u.role !== "hop") return;
    var mc = document.getElementById("main-content");
    if (!mc) return;
    if (mc.querySelector("[data-hopdcyd-panel]")) return;
    // Only run when HOP dashboard is mounted
    var isHop = mc.querySelector(".stats-grid") || mc.querySelector(".kpi-grid") || /HOP\s*Dashboard/i.test(mc.textContent || "");
    if (!isHop) return;

    inflight = true;
    try {
      injectStyles();
      mc.insertAdjacentHTML("beforeend", '<div class="glass-card hdy-panel" data-hopdcyd-panel="1"><div class="hdy-loading">Loading DCY/DIT analytics…</div></div>');
      cachedData = await fetchAnalytics();
      var p = document.querySelector("[data-hopdcyd-panel]");
      if (p) { p.outerHTML = buildPanel(cachedData, activeTab); bindTabs(); }
      console.log("[hop-dcydit] panel injected");
    } catch (e) {
      console.warn("[hop-dcydit] error", e);
      var p2 = document.querySelector("[data-hopdcyd-panel]");
      if (p2) p2.remove();
    } finally {
      inflight = false;
    }
  }

  function hook() {
    if (typeof window.renderDashboard !== "function" || window.__hopDcyDitHooked) return;
    var orig = window.renderDashboard;
    window.renderDashboard = function () {
      var r = orig.apply(this, arguments);
      setTimeout(injectIfNeeded, 500);
      return r;
    };
    window.__hopDcyDitHooked = true;
  }

  function boot() {
    hook();
    if (typeof window.navigate === "function" && !window.__hopDcyDitNav) {
      var origNav = window.navigate;
      window.navigate = function (route) {
        var x = origNav.apply(this, arguments);
        if (route === "dashboard" || route === "hop-dashboard") {
          cachedData = null;
          setTimeout(injectIfNeeded, 700);
        }
        return x;
      };
      window.__hopDcyDitNav = true;
    }
    setTimeout(injectIfNeeded, 1000);
    var tries = 0;
    var iv = setInterval(function () {
      injectIfNeeded();
      if (++tries > 40) clearInterval(iv);
    }, 1000);
    console.log("[hop-dcydit] installed");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();