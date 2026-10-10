/* all-programme-dashboard.js
   Shows "My Courses & Timetable" on the student dashboard for ALL programmes:
   BCY, BDS, DCY, DIT. Non-invasive append. */
(function () {
  if (window.__allProgDashInstalled) return;
  window.__allProgDashInstalled = true;

  var PROGRAMMES = ["BCY", "BDS", "DCY", "DIT"];
  var LABEL = {
    BCY: "Bachelor of Cybersecurity",
    BDS: "Bachelor of Data Science",
    DCY: "Diploma in Cybersecurity",
    DIT: "Diploma in Information Technology"
  };
  var LEVEL = {
    BCY: "BACHELOR",
    BDS: "BACHELOR",
    DCY: "DIPLOMA",
    DIT: "DIPLOMA"
  };
  var DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  function sb() { return window.qmsSupabase || window.supabaseClient; }
  function esc(s) { return window.escHtml ? escHtml(String(s == null ? "" : s)) : String(s == null ? "" : s); }
  function todayName() { return DAYS[new Date().getDay()]; }

  function fmtTime(t) {
    if (!t) return "";
    var p = String(t).split(":");
    var h = parseInt(p[0], 10), m = (p[1] || "00").padStart(2, "0");
    var ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12;
    return h12 + ":" + m + " " + ap;
  }

  function injectStyles() {
    if (document.getElementById("allprog-styles")) return;
    var s = document.createElement("style");
    s.id = "allprog-styles";
    s.textContent = [
      ".apd-panel{padding:22px 24px;}",
      ".apd-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px;}",
      ".apd-eyebrow{font-family:var(--font-mono);font-size:10.5px;letter-spacing:1.8px;opacity:0.6;color:var(--color-primary);margin-bottom:4px;}",
      ".apd-title{font-family:var(--font-display);font-size:22px;font-weight:800;letter-spacing:-0.3px;}",
      ".apd-sub{font-size:12.5px;opacity:0.7;margin-top:3px;}",
      ".apd-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}",
      "@media (max-width:900px){.apd-grid{grid-template-columns:1fr;}}",
      ".apd-col{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px 16px;}",
      ".apd-col-head{font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;opacity:0.75;margin-bottom:10px;}",
      ".apd-course-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;}",
      ".apd-course-row:last-child{border-bottom:none;}",
      ".apd-course-code{font-family:var(--font-mono);font-size:11.5px;color:var(--color-primary);font-weight:700;}",
      ".apd-course-name{opacity:0.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      ".apd-course-cr{font-family:var(--font-mono);font-size:11.5px;opacity:0.55;}",
      ".apd-tt-row{display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;}",
      ".apd-tt-row:last-child{border-bottom:none;}",
      ".apd-tt-time{font-family:var(--font-mono);font-size:11.5px;color:var(--color-primary);white-space:nowrap;}",
      ".apd-tt-subj{opacity:0.85;}",
      ".apd-tt-venue{font-size:11.5px;opacity:0.55;white-space:nowrap;}",
      ".apd-empty{font-size:12.5px;opacity:0.55;padding:8px 0;font-style:italic;}",
      ".apd-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-family:var(--font-mono);font-size:10.5px;font-weight:700;letter-spacing:0.6px;margin-left:8px;vertical-align:middle;}",
      ".apd-badge-bcy{background:rgba(0,245,255,0.15);color:#00f5ff;}",
      ".apd-badge-bds{background:rgba(255,184,0,0.16);color:#ffb800;}",
      ".apd-badge-dcy{background:rgba(0,255,136,0.14);color:#00ff88;}",
      ".apd-badge-dit{background:rgba(168,85,247,0.16);color:#c084fc;}"
    ].join("\n");
    document.head.appendChild(s);
  }

  async function resolveStudent(u) {
    if (!u) return null;
    var prefix = (u.email || "").split("@")[0].trim();
    if (prefix) {
      var r1 = await sb().from("sp_students")
        .select("enrollment_no, name, programme, intake, current_semester")
        .eq("enrollment_no", prefix).maybeSingle();
      if (!r1.error && r1.data) return r1.data;
    }
    if (u.name) {
      var r2 = await sb().from("sp_students")
        .select("enrollment_no, name, programme, intake, current_semester")
        .eq("name", u.name).maybeSingle();
      if (!r2.error && r2.data) return r2.data;
    }
    if (u.id) {
      var r3 = await sb().from("sp_students")
        .select("enrollment_no, name, programme, intake, current_semester")
        .eq("student_no", u.id).maybeSingle();
      if (!r3.error && r3.data) return r3.data;
    }
    return null;
  }

  async function loadCourses(enr) {
    var r = await sb().from("sp_student_courses")
      .select("course_code, course_name, credit_hours, status")
      .eq("enrollment_no", enr)
      .order("course_code");
    return r.error ? [] : (r.data || []);
  }

  async function loadTodayTimetable(prog) {
    var r = await sb().from("lecture_timetable")
      .select("start_time, end_time, subject_name, venue, level, notes")
      .eq("day_of_week", todayName())
      .contains("programmes", [prog])
      .order("start_time");
    return r.error ? [] : (r.data || []);
  }

  function buildPanel(student, courses, tt) {
    var total = courses.reduce(function (s, c) { return s + (Number(c.credit_hours) || 0); }, 0);
    var prog = student.programme;
    var badgeClass = "apd-badge apd-badge-" + prog.toLowerCase();

    var courseHTML = courses.length
      ? courses.map(function (c) {
          return '<div class="apd-course-row">' +
            '<span class="apd-course-code">' + esc(c.course_code) + '</span>' +
            '<span class="apd-course-name">' + esc(c.course_name || "") + '</span>' +
            '<span class="apd-course-cr">' + (c.credit_hours != null ? c.credit_hours + " cr" : "") + '</span>' +
          '</div>';
        }).join("")
      : '<div class="apd-empty">No courses in your study plan yet. Contact your HOP to plan your semester.</div>';

    var ttHTML = tt.length
      ? tt.map(function (t) {
          return '<div class="apd-tt-row">' +
            '<span class="apd-tt-time">' + fmtTime(t.start_time) + ' – ' + fmtTime(t.end_time) + '</span>' +
            '<span class="apd-tt-subj">' + esc(t.subject_name) + '</span>' +
            '<span class="apd-tt-venue">' + esc(t.venue || "") + (t.level ? ' · L' + t.level : '') + '</span>' +
          '</div>';
        }).join("")
      : '<div class="apd-empty">No classes scheduled for today (' + todayName() + ').</div>';

    return '<div class="glass-card apd-panel" style="margin-top:24px;">' +
      '<div class="apd-head">' +
        '<div>' +
          '<div class="apd-eyebrow">' + esc(LEVEL[prog] || "") + ' STUDENT · ' + esc(prog) + '</div>' +
          '<div class="apd-title">My Courses &amp; Timetable<span class="' + badgeClass + '">' + esc(prog) + '</span></div>' +
          '<div class="apd-sub">' + esc(LABEL[prog] || "") + ' · ' + esc(student.intake || "") + ' intake · ' + esc(student.current_semester || "") + ' · ' + total + ' credits planned</div>' +
        '</div>' +
        '<button class="btn btn-sm btn-outline" onclick="navigate(\'study-plan\')">Open Study Plan →</button>' +
      '</div>' +
      '<div class="apd-grid">' +
        '<div class="apd-col">' +
          '<div class="apd-col-head">📚 My Semester Courses (' + courses.length + ')</div>' +
          courseHTML +
        '</div>' +
        '<div class="apd-col">' +
          '<div class="apd-col-head">📅 Today · ' + todayName() + ' (' + tt.length + ')</div>' +
          ttHTML +
        '</div>' +
      '</div>' +
    '</div>';
  }

  var inflight = false;
  async function injectIfNeeded() {
    if (inflight) return;
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || u.role !== "student") return;
    var mc = document.getElementById("main-content");
    if (!mc) return;
    if (mc.querySelector(".apd-panel")) return;
    // Only inject on the RISE dashboard
    if (!mc.querySelector(".sd-cats-grid") && !mc.querySelector(".sd-hero") && !mc.querySelector(".sd-wrap")) return;

    inflight = true;
    try {
      var student = await resolveStudent(u);
      if (!student || PROGRAMMES.indexOf(student.programme) === -1) return;
      var res = await Promise.all([loadCourses(student.enrollment_no), loadTodayTimetable(student.programme)]);
      if (mc.querySelector(".apd-panel")) return;
      injectStyles();
      mc.insertAdjacentHTML("beforeend", buildPanel(student, res[0], res[1]));
      console.log("[all-prog] panel injected for", student.programme, student.enrollment_no);
    } catch (e) {
      console.warn("[all-prog] error", e);
    } finally {
      inflight = false;
    }
  }

  function hook() {
    if (typeof window.renderDashboard !== "function") return false;
    if (window.__allProgDashHooked) return true;
    var orig = window.renderDashboard;
    window.renderDashboard = function () {
      var r = orig.apply(this, arguments);
      setTimeout(injectIfNeeded, 400);
      return r;
    };
    window.__allProgDashHooked = true;
    return true;
  }

  function boot() {
    hook();
    if (typeof window.navigate === "function" && !window.__allProgDashNav) {
      var origNav = window.navigate;
      window.navigate = function (route) {
        var x = origNav.apply(this, arguments);
        if (route === "dashboard") setTimeout(injectIfNeeded, 700);
        return x;
      };
      window.__allProgDashNav = true;
    }
    setTimeout(injectIfNeeded, 900);
    var tries = 0;
    var iv = setInterval(function () {
      injectIfNeeded();
      if (++tries > 40) clearInterval(iv);
    }, 1000);
    console.log("[all-prog] installed");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();