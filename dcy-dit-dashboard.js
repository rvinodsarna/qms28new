/* dcy-dit-dashboard.js
   Adds a "My Courses & Timetable" panel to the student dashboard
   for DCY and DIT students only. Non-invasive append. */
(function () {
  if (window.__dcyDitDashInstalled) return;
  window.__dcyDitDashInstalled = true;

  var PROGRAMMES = ["DCY", "DIT"];
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
    if (document.getElementById("dcydit-styles")) return;
    var s = document.createElement("style");
    s.id = "dcydit-styles";
    s.textContent = [
      ".dcyd-panel{padding:22px 24px;}",
      ".dcyd-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px;}",
      ".dcyd-eyebrow{font-family:var(--font-mono);font-size:10.5px;letter-spacing:1.8px;opacity:0.6;color:var(--color-primary);margin-bottom:4px;}",
      ".dcyd-title{font-family:var(--font-display);font-size:22px;font-weight:800;letter-spacing:-0.3px;}",
      ".dcyd-sub{font-size:12.5px;opacity:0.7;margin-top:3px;}",
      ".dcyd-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}",
      "@media (max-width:900px){.dcyd-grid{grid-template-columns:1fr;}}",
      ".dcyd-col{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px 16px;}",
      ".dcyd-col-head{font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;opacity:0.75;margin-bottom:10px;}",
      ".dcyd-course-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;}",
      ".dcyd-course-row:last-child{border-bottom:none;}",
      ".dcyd-course-code{font-family:var(--font-mono);font-size:11.5px;color:var(--color-primary);font-weight:700;}",
      ".dcyd-course-name{opacity:0.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      ".dcyd-course-cr{font-family:var(--font-mono);font-size:11.5px;opacity:0.55;}",
      ".dcyd-tt-row{display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;}",
      ".dcyd-tt-row:last-child{border-bottom:none;}",
      ".dcyd-tt-time{font-family:var(--font-mono);font-size:11.5px;color:var(--color-primary);white-space:nowrap;}",
      ".dcyd-tt-subj{opacity:0.85;}",
      ".dcyd-tt-venue{font-size:11.5px;opacity:0.55;white-space:nowrap;}",
      ".dcyd-empty{font-size:12.5px;opacity:0.55;padding:8px 0;font-style:italic;}"
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
    var courseHTML = courses.length
      ? courses.map(function (c) {
          return '<div class="dcyd-course-row">' +
            '<span class="dcyd-course-code">' + esc(c.course_code) + '</span>' +
            '<span class="dcyd-course-name">' + esc(c.course_name || "") + '</span>' +
            '<span class="dcyd-course-cr">' + (c.credit_hours != null ? c.credit_hours + " cr" : "") + '</span>' +
          '</div>';
        }).join("")
      : '<div class="dcyd-empty">No courses in your study plan yet. Contact your HOP to plan your semester.</div>';

    var ttHTML = tt.length
      ? tt.map(function (t) {
          return '<div class="dcyd-tt-row">' +
            '<span class="dcyd-tt-time">' + fmtTime(t.start_time) + ' – ' + fmtTime(t.end_time) + '</span>' +
            '<span class="dcyd-tt-subj">' + esc(t.subject_name) + '</span>' +
            '<span class="dcyd-tt-venue">' + esc(t.venue || "") + (t.level ? ' · L' + t.level : '') + '</span>' +
          '</div>';
        }).join("")
      : '<div class="dcyd-empty">No classes scheduled for today (' + todayName() + ').</div>';

    return '<div class="glass-card dcyd-panel" style="margin-top:24px;">' +
      '<div class="dcyd-head">' +
        '<div>' +
          '<div class="dcyd-eyebrow">DIPLOMA STUDENT · ' + esc(student.programme) + '</div>' +
          '<div class="dcyd-title">My Courses &amp; Timetable</div>' +
          '<div class="dcyd-sub">' + esc(student.intake || "") + ' intake · ' + esc(student.current_semester || "") + ' · ' + total + ' credits planned</div>' +
        '</div>' +
        '<button class="btn btn-sm btn-outline" onclick="navigate(\'study-plan\')">Open Study Plan →</button>' +
      '</div>' +
      '<div class="dcyd-grid">' +
        '<div class="dcyd-col">' +
          '<div class="dcyd-col-head">📚 My Semester Courses (' + courses.length + ')</div>' +
          courseHTML +
        '</div>' +
        '<div class="dcyd-col">' +
          '<div class="dcyd-col-head">📅 Today · ' + todayName() + ' (' + tt.length + ')</div>' +
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
    if (mc.querySelector(".dcyd-panel")) return;
    // Only inject on the RISE dashboard
    if (!mc.querySelector(".sd-cats-grid") && !mc.querySelector(".sd-hero") && !mc.querySelector(".sd-wrap")) return;

    inflight = true;
    try {
      var student = await resolveStudent(u);
      if (!student || PROGRAMMES.indexOf(student.programme) === -1) return;
      var res = await Promise.all([loadCourses(student.enrollment_no), loadTodayTimetable(student.programme)]);
      if (mc.querySelector(".dcyd-panel")) return;
      injectStyles();
      mc.insertAdjacentHTML("beforeend", buildPanel(student, res[0], res[1]));
      console.log("[dcy-dit] panel injected for", student.programme, student.enrollment_no);
    } catch (e) {
      console.warn("[dcy-dit] error", e);
    } finally {
      inflight = false;
    }
  }

  function hook() {
    if (typeof window.renderDashboard !== "function") return false;
    if (window.__dcyDitDashHooked) return true;
    var orig = window.renderDashboard;
    window.renderDashboard = function () {
      var r = orig.apply(this, arguments);
      setTimeout(injectIfNeeded, 400);
      return r;
    };
    window.__dcyDitDashHooked = true;
    return true;
  }

  function boot() {
    hook();
    if (typeof window.navigate === "function" && !window.__dcyDitDashNav) {
      var origNav = window.navigate;
      window.navigate = function (route) {
        var x = origNav.apply(this, arguments);
        if (route === "dashboard") setTimeout(injectIfNeeded, 700);
        return x;
      };
      window.__dcyDitDashNav = true;
    }
    setTimeout(injectIfNeeded, 900);
    var tries = 0;
    var iv = setInterval(function () {
      injectIfNeeded();
      if (++tries > 40) clearInterval(iv);
    }, 1000);
    console.log("[dcy-dit] installed");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();