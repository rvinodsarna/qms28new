const fs = require("fs");
const path = "app.js";
let src = fs.readFileSync(path, "utf8");
const before = src;

// Function boundaries
const START_RE = /async function mountHOPDashboard\(\)\{/;
const END_RE = /async function mountWeeklyReport\(\)\{/;

const s = src.search(START_RE);
if (s === -1) { console.error("❌ start not found"); process.exit(1); }

const e = src.slice(s).search(END_RE);
if (e === -1) { console.error("❌ end not found"); process.exit(1); }
const eAbs = s + e;

const NEW_FN = `async function mountHOPDashboard(){
  const mc = document.getElementById("main-content");
  const u = QMS.state.user;
  if (u.role !== "hop" && u.role !== "dean") {
    mc.innerHTML = '<div class="page-anim"><div class="alert alert-error"><span>🚫</span><div><strong>Access Denied</strong><br/>Only HOP or Dean can view this dashboard.</div></div></div>';
    return;
  }

  const PROGS = ["BCY","BDS","DCY","DIT"];
  const LABELS = {
    BCY: "B. Cybersecurity",
    BDS: "B. Data Science",
    DCY: "Dip. Cybersecurity",
    DIT: "Dip. Info Tech"
  };
  const LEVEL = { BCY:"Bachelor", BDS:"Bachelor", DCY:"Diploma", DIT:"Diploma" };
  const COLORS = {
    BCY: "var(--color-primary)",
    BDS: "var(--color-warning)",
    DCY: "var(--color-green)",
    DIT: "#a855f7"
  };

  const [spS, spC, comp, ev, st] = await Promise.all([
    supabaseClient.from("sp_students").select("enrollment_no, programme, intake, current_semester, name"),
    supabaseClient.from("sp_courses").select("programme, course_code, credit_hours"),
    supabaseClient.from("complaints").select("id, status, programme, subject, ts"),
    supabaseClient.from("evaluations").select("id, programme, average_score, submitted_at"),
    supabaseClient.from("staff").select("id, name, role, programme, school")
  ]);

  const students = spS.data || [];
  const courses = spC.data || [];
  const complaints = comp.data || [];
  const evals = ev.data || [];
  const staff = st.data || [];

  const byProg = {};
  PROGS.forEach(p => { byProg[p] = { students: 0, courses: 0, credits: 0, lecturers: 0, intakes: {} }; });
  students.forEach(s => {
    if (byProg[s.programme]) {
      byProg[s.programme].students++;
      const k = s.intake || "Unknown";
      byProg[s.programme].intakes[k] = (byProg[s.programme].intakes[k] || 0) + 1;
    }
  });
  courses.forEach(c => {
    if (byProg[c.programme]) {
      byProg[c.programme].courses++;
      byProg[c.programme].credits += Number(c.credit_hours) || 0;
    }
  });
  staff.forEach(s => {
    if (s.role !== "lecturer") return;
    const progs = (s.programme || "ALL").split(",").map(x => x.trim());
    PROGS.forEach(p => {
      if (progs.includes(p) || progs.includes("ALL")) byProg[p].lecturers++;
    });
  });

  const totalStudents = students.length;
  const totalCourses = courses.length;
  const totalLecturers = staff.filter(s => s.role === "lecturer").length;
  const pendingComplaints = complaints.filter(c => c.status === "Pending").length;
  const avgEval = evals.length
    ? (evals.reduce((s, e) => s + (Number(e.average_score) || 0), 0) / evals.length).toFixed(2)
    : "—";

  mc.innerHTML = '<div class="page-anim">' +
    '<div class="page-header">' +
      '<div class="page-eyebrow">HOP · ALL PROGRAMMES</div>' +
      '<div class="page-title">📊 HOP Monitoring Dashboard</div>' +
      '<div class="page-desc">Combined overview across BCY · BDS · DCY · DIT</div>' +
    '</div>' +
    '<div id="hop-dash-content"></div>' +
  '</div>';

  function renderOverview() {
    return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-bottom:20px;">' +
      '<div class="kpi-card" style="padding:16px;"><div class="kpi-icon">🎓</div><div class="kpi-value" style="font-size:26px;">' + totalStudents + '</div><div class="kpi-label">Total Students</div></div>' +
      '<div class="kpi-card" style="padding:16px;"><div class="kpi-icon">📚</div><div class="kpi-value" style="font-size:26px;color:var(--color-primary);">' + totalCourses + '</div><div class="kpi-label">Courses</div></div>' +
      '<div class="kpi-card" style="padding:16px;"><div class="kpi-icon">👨‍🏫</div><div class="kpi-value magenta" style="font-size:26px;">' + totalLecturers + '</div><div class="kpi-label">Lecturers</div></div>' +
      '<div class="kpi-card" style="padding:16px;"><div class="kpi-icon">📝</div><div class="kpi-value green" style="font-size:26px;">' + avgEval + '</div><div class="kpi-label">Avg Eval Score</div></div>' +
      '<div class="kpi-card" style="padding:16px;"><div class="kpi-icon">📣</div><div class="kpi-value warning" style="font-size:26px;">' + pendingComplaints + '</div><div class="kpi-label">Pending Complaints</div></div>' +
    '</div>' +
    '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.55;margin-bottom:10px;font-family:var(--font-mono);">PROGRAMME BREAKDOWN</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin-bottom:20px;">' +
      PROGS.map(p =>
        '<div class="glass-card" style="padding:18px;border-left:3px solid ' + COLORS[p] + ';">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">' +
            '<span class="badge badge-cyan" style="font-size:11px;">' + p + '</span>' +
            '<span style="font-size:10px;opacity:0.5;font-family:var(--font-mono);">' + LEVEL[p] + '</span>' +
          '</div>' +
          '<div style="font-size:12px;opacity:0.65;margin-bottom:10px;">' + LABELS[p] + '</div>' +
          '<div style="font-family:var(--font-display);font-size:32px;font-weight:800;color:' + COLORS[p] + ';line-height:1;">' + byProg[p].students + '</div>' +
          '<div style="font-size:11px;opacity:0.55;margin-top:2px;">students</div>' +
          '<div style="display:flex;gap:12px;margin-top:12px;font-size:11.5px;opacity:0.7;">' +
            '<span>📚 ' + byProg[p].courses + ' courses</span>' +
            '<span>👨‍🏫 ' + byProg[p].lecturers + ' lecturers</span>' +
          '</div>' +
        '</div>'
      ).join("") +
    '</div>' +
    '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.55;margin-bottom:10px;font-family:var(--font-mono);">INTAKE DISTRIBUTION</div>' +
    PROGS.map(p => {
      const intakes = Object.entries(byProg[p].intakes).sort((a,b) => b[1] - a[1]);
      if (!intakes.length) return "";
      const max = Math.max.apply(null, intakes.map(x => x[1]));
      return '<div class="glass-card" style="padding:16px;margin-bottom:12px;">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:10px;">' +
          '<span class="badge badge-cyan">' + p + '</span>' +
          '<span style="font-size:11px;opacity:0.55;">' + byProg[p].students + ' total</span>' +
        '</div>' +
        '<div class="table-wrap"><table class="data-table" style="font-size:12px;">' +
          '<thead><tr><th>Intake</th><th>Students</th><th style="width:50%;">Distribution</th></tr></thead>' +
          '<tbody>' +
            intakes.map(([k,v]) =>
              '<tr>' +
                '<td><strong>' + escHtml(k) + '</strong></td>' +
                '<td>' + v + '</td>' +
                '<td><div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">' +
                  '<div style="height:100%;width:' + ((v/max)*100).toFixed(0) + '%;background:' + COLORS[p] + ';border-radius:3px;"></div>' +
                '</div></td>' +
              '</tr>'
            ).join("") +
          '</tbody>' +
        '</table></div>' +
      '</div>';
    }).join("") ;
  }

  function renderStudents() {
    return '<div class="glass-card" style="padding:0;">' +
      '<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;">' +
        '<strong>All Students (' + students.length + ')</strong>' +
        '<span style="font-size:11px;opacity:0.55;">Showing first 100</span>' +
      '</div>' +
      '<div class="table-wrap" style="max-height:600px;overflow-y:auto;">' +
        '<table class="data-table">' +
          '<thead><tr><th>Enrollment</th><th>Name</th><th>Programme</th><th>Intake</th><th>Semester</th></tr></thead>' +
          '<tbody>' +
            students.slice(0,100).map(s =>
              '<tr>' +
                '<td style="font-family:var(--font-mono);font-size:11.5px;">' + escHtml(s.enrollment_no) + '</td>' +
                '<td>' + escHtml(s.name || "") + '</td>' +
                '<td><span class="badge badge-cyan">' + s.programme + '</span></td>' +
                '<td>' + escHtml(s.intake || "") + '</td>' +
                '<td>' + escHtml(s.current_semester || "") + '</td>' +
              '</tr>'
            ).join("") +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
  }

  function renderComplaints() {
    return '<div class="glass-card" style="padding:0;">' +
      '<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);"><strong>Complaints (' + complaints.length + ')</strong></div>' +
      '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr><th>Subject</th><th>Programme</th><th>Status</th><th>Date</th></tr></thead>' +
        '<tbody>' +
          (complaints.slice(0,50).map(c =>
            '<tr>' +
              '<td>' + escHtml(c.subject || "") + '</td>' +
              '<td>' + escHtml(c.programme || "") + '</td>' +
              '<td><span class="badge ' + (c.status === "Pending" ? "badge-warning" : c.status === "Resolved" ? "badge-green" : "badge-cyan") + '">' + escHtml(c.status || "") + '</span></td>' +
              '<td style="font-size:11.5px;opacity:0.6;">' + (c.ts ? fmtDate(c.ts) : "") + '</td>' +
            '</tr>'
          ).join("") || '<tr><td colspan="4" style="text-align:center;opacity:0.55;">No complaints</td></tr>') +
        '</tbody>' +
      '</table></div>' +
    '</div>';
  }

  function renderEvaluations() {
    return '<div class="glass-card" style="padding:0;">' +
      '<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);"><strong>Evaluations (' + evals.length + ')</strong></div>' +
      '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr><th>Programme</th><th>Avg Score</th><th>Submitted</th></tr></thead>' +
        '<tbody>' +
          (evals.slice(0,50).map(e =>
            '<tr>' +
              '<td>' + escHtml(e.programme || "") + '</td>' +
              '<td>' + (e.average_score != null ? Number(e.average_score).toFixed(2) : "—") + '</td>' +
              '<td style="font-size:11.5px;opacity:0.6;">' + (e.submitted_at ? fmtDate(e.submitted_at) : "") + '</td>' +
            '</tr>'
          ).join("") || '<tr><td colspan="3" style="text-align:center;opacity:0.55;">No evaluations</td></tr>') +
        '</tbody>' +
      '</table></div>' +
    '</div>';
  }

  window.__hopTab = "overview";
  window.renderHOPTab = function() {
    const el = document.getElementById("hop-dash-content");
    if (!el) return;
    const tab = window.__hopTab;
    let body = "";
    if (tab === "overview") body = renderOverview();
    else if (tab === "students") body = renderStudents();
    else if (tab === "complaints") body = renderComplaints();
    else if (tab === "evaluations") body = renderEvaluations();
    el.innerHTML = '<div class="tab-bar" style="margin-bottom:16px;">' +
      ["overview","students","complaints","evaluations"].map(t =>
        '<button class="tab-item ' + (tab === t ? "active" : "") + '" onclick="window.__hopTab=\\'' + t + '\\';window.renderHOPTab();">' + t.charAt(0).toUpperCase() + t.slice(1) + '</button>'
      ).join("") +
    '</div>' + body;
  };
  window.renderHOPTab();
}
`;

src = src.slice(0, s) + NEW_FN + src.slice(eAbs);

if (src === before) { console.error("❌ No change made"); process.exit(1); }
fs.writeFileSync(path, src, "utf8");
console.log("✅ mountHOPDashboard replaced (" + NEW_FN.length + " chars)");