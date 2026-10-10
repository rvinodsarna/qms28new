/* hop-dashboard-v2.js
   Overrides mountHOPDashboard at runtime — shows all 4 programmes.
   Uses sp_students (not legacy students table). */
(function () {
  if (window.__hopDashV2Installed) return;
  window.__hopDashV2Installed = true;

  var PROGS = ["BCY", "BDS", "DCY", "DIT"];
  var LABELS = { BCY: "B. Cybersecurity", BDS: "B. Data Science", DCY: "Dip. Cybersecurity", DIT: "Dip. Info Tech" };
  var LEVEL  = { BCY: "Bachelor", BDS: "Bachelor", DCY: "Diploma", DIT: "Diploma" };
  var COLOR  = { BCY: "#00f5ff", BDS: "#ffb800", DCY: "#00ff88", DIT: "#a855f7" };

  function esc(s) { return window.escHtml ? escHtml(String(s == null ? "" : s)) : String(s == null ? "" : s); }
  function sb()  { return window.qmsSupabase || window.supabaseClient; }
  function fmtDateSafe(x) { try { return window.fmtDate ? fmtDate(x) : new Date(x).toLocaleDateString(); } catch (e) { return ""; } }

  async function newMountHOPDashboard() {
    var mc = document.getElementById("main-content");
    var u  = window.QMS && QMS.state && QMS.state.user;
    if (!u || (u.role !== "hop" && u.role !== "dean")) {
      mc.innerHTML = '<div class="page-anim"><div class="alert alert-error"><span>🚫</span><div><strong>Access Denied</strong><br/>Only HOP or Dean can view this dashboard.</div></div></div>';
      return;
    }

    mc.innerHTML = '<div class="page-anim"><div class="loading-wrap"><div class="spinner"></div></div></div>';

    var results = await Promise.all([
      sb().from("sp_students").select("enrollment_no, name, programme, intake, current_semester"),
      sb().from("sp_courses").select("programme, course_code, credit_hours"),
      sb().from("complaints").select("id, status, subject, programme, ts"),
      sb().from("evaluations").select("average_score, submitted_at, programme"),
      sb().from("staff").select("id, name, role, programme")
    ]);

    var students   = (results[0] && results[0].data) || [];
    var courses    = (results[1] && results[1].data) || [];
    var complaints = (results[2] && results[2].data) || [];
    var evals      = (results[3] && results[3].data) || [];
    var staff      = (results[4] && results[4].data) || [];

    var byProg = {};
    PROGS.forEach(function (p) { byProg[p] = { students: 0, courses: 0, credits: 0, lecturers: 0, intakes: {} }; });

    students.forEach(function (s) {
      if (!byProg[s.programme]) return;
      byProg[s.programme].students++;
      var k = s.intake || "Unknown";
      byProg[s.programme].intakes[k] = (byProg[s.programme].intakes[k] || 0) + 1;
    });
    courses.forEach(function (c) {
      if (!byProg[c.programme]) return;
      byProg[c.programme].courses++;
      byProg[c.programme].credits += Number(c.credit_hours) || 0;
    });
    staff.forEach(function (s) {
      if (s.role !== "lecturer") return;
      var ps = (s.programme || "ALL").split(",").map(function (x) { return x.trim(); });
      PROGS.forEach(function (p) {
        if (ps.indexOf(p) !== -1 || ps.indexOf("ALL") !== -1) byProg[p].lecturers++;
      });
    });

    var totalStudents    = students.length;
    var totalCourses     = courses.length;
    var totalLecturers   = staff.filter(function (s) { return s.role === "lecturer"; }).length;
    var pendingComplaints = complaints.filter(function (c) { return c.status === "Pending"; }).length;
    var avgEval = evals.length
      ? (evals.reduce(function (s, e) { return s + (Number(e.average_score) || 0); }, 0) / evals.length).toFixed(2)
      : "—";

    window.__hopTab = "overview";

    function renderOverview() {
      var kpi =
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-bottom:20px;">' +
          kpiCard("🎓", totalStudents,     "Total Students",     "#00f5ff") +
          kpiCard("📚", totalCourses,      "Courses",            "#00e5c0") +
          kpiCard("👨‍🏫", totalLecturers, "Lecturers",          "#a855f7") +
          kpiCard("📝", avgEval,           "Avg Eval Score",     "#00ff88") +
          kpiCard("📣", pendingComplaints, "Pending Complaints", "#ffb800") +
        '</div>';

      var progCards = '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.55;margin-bottom:10px;font-family:var(--font-mono);">PROGRAMME BREAKDOWN</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:20px;">' +
          PROGS.map(function (p) {
            return '<div class="glass-card" style="padding:18px;border-left:3px solid ' + COLOR[p] + ';">' +
              '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">' +
                '<span class="badge badge-cyan" style="font-size:11px;">' + p + '</span>' +
                '<span style="font-size:10px;opacity:0.5;font-family:var(--font-mono);">' + LEVEL[p] + '</span>' +
              '</div>' +
              '<div style="font-size:12px;opacity:0.65;margin-bottom:10px;">' + LABELS[p] + '</div>' +
              '<div style="font-family:var(--font-display);font-size:32px;font-weight:800;color:' + COLOR[p] + ';line-height:1;">' + byProg[p].students + '</div>' +
              '<div style="font-size:11px;opacity:0.55;margin-top:2px;">students</div>' +
              '<div style="display:flex;gap:12px;margin-top:12px;font-size:11.5px;opacity:0.7;">' +
                '<span>📚 ' + byProg[p].courses + ' courses</span>' +
                '<span>👨‍🏫 ' + byProg[p].lecturers + ' lecturers</span>' +
              '</div>' +
            '</div>';
          }).join("") +
        '</div>';

      var intakeBlocks = PROGS.map(function (p) {
        var entries = Object.keys(byProg[p].intakes).map(function (k) { return [k, byProg[p].intakes[k]]; })
          .sort(function (a, b) { return b[1] - a[1]; });
        if (!entries.length) return "";
        var max = entries[0][1];
        return '<div class="glass-card" style="padding:16px;margin-bottom:12px;">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:10px;">' +
            '<span class="badge badge-cyan">' + p + '</span>' +
            '<span style="font-size:11px;opacity:0.55;">' + byProg[p].students + ' total</span>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table" style="font-size:12px;">' +
            '<thead><tr><th>Intake</th><th>Students</th><th style="width:50%;">Distribution</th></tr></thead>' +
            '<tbody>' +
              entries.map(function (e) {
                var pct = ((e[1] / max) * 100).toFixed(0);
                return '<tr>' +
                  '<td><strong>' + esc(e[0]) + '</strong></td>' +
                  '<td>' + e[1] + '</td>' +
                  '<td><div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">' +
                    '<div style="height:100%;width:' + pct + '%;background:' + COLOR[p] + ';border-radius:3px;"></div>' +
                  '</div></td>' +
                '</tr>';
              }).join("") +
            '</tbody>' +
          '</table></div>' +
        '</div>';
      }).join("");

      return kpi + progCards +
        '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.55;margin-bottom:10px;font-family:var(--font-mono);">INTAKE DISTRIBUTION</div>' +
        intakeBlocks;
    }

    function kpiCard(icon, value, label, color) {
      return '<div class="kpi-card" style="padding:16px;">' +
        '<div class="kpi-icon">' + icon + '</div>' +
        '<div class="kpi-value" style="font-size:26px;color:' + color + ';">' + value + '</div>' +
        '<div class="kpi-label">' + label + '</div>' +
      '</div>';
    }

    function renderStudents() {
      return '<div class="glass-card" style="padding:0;">' +
        '<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);">' +
          '<strong>All Students (' + students.length + ')</strong>' +
        '</div>' +
        '<div class="table-wrap" style="max-height:600px;overflow-y:auto;">' +
          '<table class="data-table">' +
            '<thead><tr><th>Enrollment</th><th>Name</th><th>Programme</th><th>Intake</th><th>Semester</th></tr></thead>' +
            '<tbody>' +
              students.slice(0, 150).map(function (s) {
                return '<tr>' +
                  '<td style="font-family:var(--font-mono);font-size:11.5px;">' + esc(s.enrollment_no) + '</td>' +
                  '<td>' + esc(s.name || "") + '</td>' +
                  '<td><span class="badge badge-cyan">' + s.programme + '</span></td>' +
                  '<td>' + esc(s.intake || "") + '</td>' +
                  '<td>' + esc(s.current_semester || "") + '</td>' +
                '</tr>';
              }).join("") +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
    }

    function renderComplaints() {
      if (!complaints.length) return '<div class="glass-card" style="padding:20px;"><div class="empty-state" style="padding:20px;"><div class="empty-icon">📭</div><div class="empty-title">No complaints</div></div></div>';
      return '<div class="glass-card" style="padding:0;">' +
        '<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);"><strong>Complaints (' + complaints.length + ')</strong></div>' +
        '<div class="table-wrap"><table class="data-table">' +
          '<thead><tr><th>Subject</th><th>Programme</th><th>Status</th><th>Date</th></tr></thead>' +
          '<tbody>' +
            complaints.slice(0, 60).map(function (c) {
              var cls = c.status === "Pending" ? "badge-warning" : c.status === "Resolved" ? "badge-green" : "badge-cyan";
              return '<tr>' +
                '<td>' + esc(c.subject || "") + '</td>' +
                '<td>' + esc(c.programme || "") + '</td>' +
                '<td><span class="badge ' + cls + '">' + esc(c.status || "") + '</span></td>' +
                '<td style="font-size:11.5px;opacity:0.6;">' + (c.ts ? fmtDateSafe(c.ts) : "") + '</td>' +
              '</tr>';
            }).join("") +
          '</tbody>' +
        '</table></div>' +
      '</div>';
    }

    function renderEvals() {
      if (!evals.length) return '<div class="glass-card" style="padding:20px;"><div class="empty-state" style="padding:20px;"><div class="empty-icon">📝</div><div class="empty-title">No evaluations</div></div></div>';
      return '<div class="glass-card" style="padding:0;">' +
        '<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);"><strong>Evaluations (' + evals.length + ')</strong></div>' +
        '<div class="table-wrap"><table class="data-table">' +
          '<thead><tr><th>Programme</th><th>Avg Score</th><th>Submitted</th></tr></thead>' +
          '<tbody>' +
            evals.slice(0, 60).map(function (e) {
              return '<tr>' +
                '<td>' + esc(e.programme || "") + '</td>' +
                '<td>' + (e.average_score != null ? Number(e.average_score).toFixed(2) : "—") + '</td>' +
                '<td style="font-size:11.5px;opacity:0.6;">' + (e.submitted_at ? fmtDateSafe(e.submitted_at) : "") + '</td>' +
              '</tr>';
            }).join("") +
          '</tbody>' +
        '</table></div>' +
      '</div>';
    }

    function render() {
      var content = document.getElementById("hop-dash-content");
      if (!content) return;
      var tab = window.__hopTab;
      var body = tab === "overview"  ? renderOverview()
               : tab === "students"  ? renderStudents()
               : tab === "complaints"? renderComplaints()
               : tab === "evaluations" ? renderEvals()
               : renderOverview();

      var tabs = ["overview", "students", "complaints", "evaluations"].map(function (t) {
        var active = t === tab ? "active" : "";
        var label = t.charAt(0).toUpperCase() + t.slice(1);
        return '<button class="tab-item ' + active + '" data-hop-tab="' + t + '">' + label + '</button>';
      }).join("");

      content.innerHTML = '<div class="tab-bar" style="margin-bottom:16px;">' + tabs + '</div>' + body;

      content.querySelectorAll("[data-hop-tab]").forEach(function (btn) {
        btn.onclick = function () {
          window.__hopTab = btn.getAttribute("data-hop-tab");
          render();
        };
      });
    }

    mc.innerHTML =
      '<div class="page-anim">' +
        '<div class="page-header">' +
          '<div class="page-eyebrow">HOP · ALL PROGRAMMES</div>' +
          '<div class="page-title">📊 HOP Monitoring Dashboard</div>' +
          '<div class="page-desc">Combined overview · BCY · BDS · DCY · DIT</div>' +
        '</div>' +
        '<div id="hop-dash-content"></div>' +
      '</div>';

    render();
  }

  window.__newMountHOPDashboard = newMountHOPDashboard;

  // Hook window.navigate to intercept hop-dashboard route
  function hook() {
    if (typeof window.navigate !== "function" || window.__hopDashV2Hooked) return false;
    var orig = window.navigate;
    window.navigate = function (route) {
      if (route === "hop-dashboard") {
        try {
          return newMountHOPDashboard();
        } catch (e) {
          console.error("[hop-dash-v2]", e);
          return orig.apply(this, arguments);
        }
      }
      return orig.apply(this, arguments);
    };
    window.__hopDashV2Hooked = true;
    return true;
  }

  function boot() {
    if (hook()) return;
    var tries = 0;
    var iv = setInterval(function () {
      if (hook() || ++tries > 40) clearInterval(iv);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  console.log("[hop-dash-v2] installed");
})();