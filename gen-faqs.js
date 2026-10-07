const fs = require("fs");

const RAW = `
System Overview|what|UNIMY QMS RISE|UNIMY QMS RISE is the University Malaysia of Computer Science & Engineering's Quality Management System with gamification. It tracks attendance, evaluations, quizzes, and bonuses across all programmes.
System Overview|who|UNIMY QMS RISE|Used by students, lecturers, Heads of Programme (HOPs), Deans, quality-assurance personnel, and administrators across So-CSI - the School of CyberSecurity and Data Intelligence.
System Overview|why|UNIMY QMS RISE|It centralises academic quality work - attendance, evidence, evaluation, CLO attainment, CQI, audits, and reporting - replacing disconnected spreadsheets, folders, chats, and emails.
System Overview|what|So-CSI|So-CSI stands for School of CyberSecurity and Data Intelligence. It is the academic school context for the QMS RISE system.
System Overview|what|the institutional hierarchy|So-CSI (School) contains programmes; programmes contain courses; courses involve lecturers, students, attendance, assessments, and evidence.
System Overview|why|centralising academic operations|It reduces duplicate work, lost files, and dependence on disconnected tools. Every record lives in one workspace.
System Overview|what|the vision of QMS RISE|To make academic quality work visible, structured, traceable, and easier to improve through a common workspace.
System Overview|who|the system architect|The system was conceived, developed, and built by R. Vinod Sarna, Dean of So-CSI and HOP for BCY and BDS.
System Overview|what|the current version|QMS RISE - So-CSI v27.0 Web Application.
System Overview|what|the platform type|A responsive, web-based Quality Management System accessible from desktop and mobile browsers.
System Overview|why|the objectives of QMS RISE|To centralise academic operations, support So-CSI governance, improve evidence readiness, strengthen student support, support continuous improvement, improve monitoring, and provide secure role-aware access.
System Overview|what|the QMS abbreviation|QMS stands for Quality Management System - a platform or method used to plan, monitor, evidence, review, and improve quality.
System Overview|why|the QMS works as a continuous cycle|Quality is a repeating process of Plan, Deliver, Capture Evidence, Measure, Review, Improve, and Report - not a single audit event.
System Overview|why|evidence readiness|It supports course files, documents, attendance logs, evaluations, audits, and CQI records to create traceable evidence for review, accreditation, and decision-making.
System Overview|why|strengthening student support|It provides study planning, timetable, attendance, messages, quizzes, support tools, and profile functions to help students manage their academic journey.
System Overview|why|continuous improvement|It records quality observations and CQI follow-up activity to ensure identified issues lead to accountable action.
System Overview|why|role-aware access|It uses role-based navigation and database access controls to protect student, staff, and institutional information.
Architecture|what|the presentation layer|HTML, CSS, responsive UI, navigation, dashboards, cards, forms, tables, modals, and charts. It shows information and captures user actions.
Architecture|what|the application layer|The main JavaScript application, feature modules, role-aware routing, validation, and dynamic rendering. It coordinates user workflows.
Architecture|what|the data layer|Supabase and PostgreSQL database tables, storage, database functions, and policies. It stores academic, user, quality, and service records.
Architecture|what|the access and session layer|Authentication, user roles, active-session controls, and Row Level Security policies. It identifies users and limits access.
Architecture|what|the integration layer|QR scanner, camera features, face-auth module, charts, PDF, OCR, and spreadsheet tools. It extends system functions beyond normal forms.
Architecture|what|the reporting layer|Tables, dashboards, browser print and PDF support, and spreadsheet-capable tools. It converts records into reviewable information.
Architecture|what|the deployment layer|Web hosting and HTTPS deployment configuration. It delivers the QMS to users through a browser.
Architecture|how|the QMS adapts to mobile screens|Large grids collapse to one or two columns, navigation moves to a hamburger menu, and UI elements stay inside the main screen frame.
Architecture|why|responsive design matters|Students, lecturers, and leaders access the system from phones, tablets, laptops, and desktops - the QMS must work everywhere.
Architecture|what|the backend platform|Supabase - providing PostgreSQL database, storage, and related application services.
Features|what|secure login|Student and staff login, session handling, logout, active-device session controls, and password workflows. It confirms identity before showing protected information.
Features|what|user profile management|View and update permitted personal data, profile avatar, account details, and preferences.
Features|what|the role-aware dashboard|A dashboard and navigation appropriate to the signed-in user role.
Features|what|the student dashboard|Student-focused academic shortcuts, activities, points, progress information, and notices.
Features|what|lecturer and staff management|Maintains staff identity, school, programme, role, title, account state, and authorised permissions.
Features|what|So-CSI school and programme mapping|Associates staff and students with So-CSI and relevant programmes.
Features|what|the course catalogue|Stores subject code, subject name, type, study level, credit hour, prerequisites, grading method, pass criteria, status, semester, and academic year.
Features|what|academic term management|Defines academic terms and periods used by planning and reporting tools.
Features|what|the timetable feature|Displays teaching schedule and timetable information for students, lecturers, and HOPs.
Features|what|the study plan feature|Builds or displays planned study pathways across semesters.
Features|what|enrolment requests|Captures and tracks requests related to enrolment or registration.
Features|what|course prerequisites|Records prerequisite requirements for courses.
Features|what|QR attendance session creation|Creates attendance sessions with code, subject, location, points, expiry, issuer, and active status.
Features|what|QR attendance capture|Uses mobile camera and QR capability for attendance check-in.
Features|what|attendance records|Stores attendance events, student identity, subject, location, type, points, and timestamp.
Features|what|attendance bonus tracking|Supports point-based recognition connected to attendance activity.
Features|what|face authentication|Uses camera and face-related workflows where enabled and approved.
Features|what|the course file register|Registers and manages course-related evidence or files.
Features|what|document management|Uploads, retrieves, organises, and reviews documents.
Features|what|the question bank|Maintains reusable assessment questions and related course information.
Features|what|the Quiz Battle Arena|Supports quiz attempts, quiz results, topics, and performance history.
Features|what|RISE points and tiers|Allocates and calculates points across attendance, evaluation, quizzes, bonuses, streaks, workshops, competitions, and Coursera activity.
Features|what|badges and certificates|Records badges, student badges, and certificates.
Features|what|certificate review|Supports review of submitted certificate evidence, including analysis workflow.
Features|what|evaluations|Supports submission and review of evaluation-related records.
Features|what|evaluation reports|Presents evaluation-related reports and analysis.
Features|what|lecturer evaluation|Stores or supports review of lecturer evaluation data.
Features|what|the lecturer KPI tracker|Tracks approved lecturer Key Performance Indicators.
Features|what|CLO attainment|Records Course Learning Outcome achievement data.
Features|what|QS1 papers|Supports records connected to quality-system or assessment-paper processes.
Features|what|CQI reports|Creates, reviews, tracks, and follows up Continuous Quality Improvement actions.
Features|what|the QA and CQI queue|A structured view of quality or improvement items for review.
Features|what|internal audits|Records and manages internal audit activity.
Features|what|mock audits|Supports readiness reviews before formal audit or accreditation activity.
Features|what|complaints management|Captures, tracks, and supports resolution of complaints.
Features|what|academic support|Provides student-support or academic-assistance workflows.
Features|what|messages|Supports internal messages and communication.
Features|what|notification preferences|Stores user communication preferences.
Features|what|peer chat|Supports student chat requests, approval, rejection, messages, read status, and block controls.
Features|what|live presence|Supports online presence awareness for selected interaction features.
Features|what|FAQ and self-service help|Provides frequently asked questions and guided support information for all users.
Features|what|the AI assistant interface|Provides an AI-assistant entry point where configured.
Features|what|events and bookings|Supports events, event bookings, and staff visibility of participation.
Features|what|credit transfer|Supports credit transfer applications with transcript matching, review, justification, and decision steps.
Features|what|transcript and PDF OCR extraction|Reduces manual retyping and supports faster preliminary transcript review.
Features|what|reporting and export|Produces printable, PDF-capable, and spreadsheet-compatible views.
Features|what|the mobile-responsive interface|Uses adaptive layout, responsive grid behaviour, mobile navigation, and touch interaction.
User Roles|what|the Student role|Students participate in learning and manage permitted academic activities: dashboard, timetable, attendance, study plan, quizzes, documents, messages, peer chat, profile, evaluations, complaints, events, and academic support.
User Roles|what|the Lecturer role|Lecturers deliver teaching, manage course-related evidence, and support students: attendance generation, course files, question bank, document tools, evaluation activity, academic support, and assigned reports.
User Roles|what|the HOP role|Heads of Programme coordinate programme delivery and quality: programme monitoring, academic support, reports, review of course and evidence activity, study-plan support, and approved quality workflows.
User Roles|what|the Dean role|The Dean leads academic quality for So-CSI: school and programme monitoring, quality review, CQI oversight, audit visibility, staff and lecturer review, and strategic reporting.
User Roles|what|the Staff role|Staff carry out assigned operational or support work. Access varies by assigned role and approved permission.
User Roles|what|the Administrator role|Administrators maintain authorised system and data operations: database administration tools, selected configuration, and controlled user and role administration.
User Roles|why|role-based access|A QMS stores personal data, attendance, academic evidence, evaluations, complaints, staff records, and reports. Not all users should see all records.
User Roles|why|students see only their own data|Role-based access ensures students see their own permitted information without exposing staff or school-level records.
User Roles|why|HOPs see programme-relevant data|HOPs need programme-level visibility to coordinate and monitor delivery.
User Roles|why|Deans see school-level data|Deans need school-level information to lead academic quality across all So-CSI programmes.
Database|where|student and staff profiles|In the students and staff tables. They hold profile, role, programme and school context, active status, and session-related fields.
Database|where|course catalogue data|In the courses, course_prerequisites, and academic_terms tables.
Database|where|study planning data|In semester_plans, sp_courses, sp_semester_buckets, sp_student_courses, sp_students, and sp_timetable.
Database|where|attendance data|In attendance, attendance_sessions, and attendance_logs.
Database|where|learning quality data|In clo_attainments, cqi_reports, and qs1_papers.
Database|where|audit and compliance data|In internal_audits and mock_audits.
Database|where|feedback and staff performance data|In evaluations, lecturer_evaluations, and lecturer_kpi.
Database|where|documents and course evidence|In documents and course_files.
Database|where|assessment engagement data|In question_bank, quiz_attempts, and quiz_results.
Database|where|recognition and achievement data|In rise_points, badges, student_badges, and certificates.
Database|where|communication and support data|In messages, notification_preferences, faqs, and complaints.
Database|where|peer interaction data|In peer_chat_requests, peer_chat_messages, and peer_chat_blocks.
Database|where|events and services data|In events, event_bookings, enrolment_requests, and credit_transfers.
Database|what|the students table|Stores student profile, role, programme and school context, active status, and session-related fields.
Database|what|the staff table|Stores staff profile, school, programme, role, title, active status, and session fields.
Database|what|the attendance_sessions table|Stores controlled attendance events with a code, subject, location, points, expiry, issuer, and active status.
Database|what|the attendance_logs table|Stores individual attendance check-ins with student identity, subject, location, type, points, and timestamp.
Database|what|the cqi_reports table|Stores Continuous Quality Improvement actions with context, affected programme or course, issue description, proposed action, owner, target date, and required evidence.
Database|what|the clo_attainments table|Stores Course Learning Outcome attainment data linking assessment evidence to intended outcomes.
Database|what|the faqs table|Stores frequently asked questions and answers used by the self-service help and AI assistant features.
Quality Workflow|what|the quality cycle stages|Plan, Deliver, Capture Evidence, Measure, Review, Improve, Report. Quality is a repeating process, not a single event.
Quality Workflow|what|the CQI workflow|A concern is documented in a CQI report with context, affected programme or course, issue, proposed action, owner, target date, and required evidence. It is reviewed, implemented, evidenced, and closed only when authorised.
Quality Workflow|how|CQI actions are closed|The record is closed only when an authorised reviewer accepts the evidence that the action has been implemented and was effective.
Quality Workflow|why|CQI is important|It creates a visible link: observed issue, decision, assigned action, evidence of implementation, review of result.
Quality Workflow|who|can raise a CQI concern|A lecturer, HOP, reviewer, audit team, or Dean can identify and document a concern in a CQI report.
Quality Workflow|what|questions the Dean dashboard answers|Which programmes need attention? Are course files and quality evidence complete? What CLO attainment patterns need discussion? Which CQI actions remain pending? What audit observations need follow-up?
Quality Workflow|how|internal audits work|They systematically check process effectiveness and evidence completeness to support quality review and accreditation readiness.
Quality Workflow|how|mock audits work|They simulate formal audit activity to find evidence gaps early and reduce avoidable audit risk.
Quality Workflow|how|the QA and CQI queue works|It shows pending actions with status, ownership, and follow-up so nothing gets lost between meetings.
Quality Workflow|who|approves CQI closure|The appropriate academic authority - typically the Dean, HOP, or quality reviewer who owns the affected programme or course.
Terminology|what|an academic year|The institutional year covering teaching, assessment, and reporting periods.
Terminology|what|an academic term|A defined teaching period, such as a semester.
Terminology|what|an attendance session|A controlled attendance event created for a class with a code, time limit, subject, and issuer.
Terminology|what|an audit trail|A traceable record of actions, dates, decisions, and responsible people.
Terminology|what|a CLO|Course Learning Outcome - a measurable statement of what a student should achieve after a course.
Terminology|what|CLO attainment|The measured level at which students achieve a CLO.
Terminology|what|a course file|A structured collection of evidence related to course delivery, assessment, review, and improvement.
Terminology|what|CQI|Continuous Quality Improvement - a formal process for identifying issues, taking action, and checking results.
Terminology|what|a dashboard|A visual summary of key information, indicators, status, and shortcuts.
Terminology|what|the Dean role|School-level academic leader responsible for oversight and academic governance.
Terminology|what|evidence in QMS context|A document, result, record, log, or file that supports a statement or decision.
Terminology|what|a HOP|Head of Programme - the person coordinating programme-level academic delivery and quality.
Terminology|what|a KPI|Key Performance Indicator - a measurable value used to assess performance or progress.
Terminology|what|least privilege|The security principle of giving each user only the access they need.
Terminology|what|QR attendance|Attendance recorded by scanning a QR code tied to an active attendance session.
Terminology|what|RLS|Row Level Security - database rules that control which database rows a user can read or change.
Terminology|what|a study plan|A structured plan showing courses across future or current academic terms.
Terminology|what|Supabase|The backend platform providing PostgreSQL database and related application services.
Security|why|role-based access|It stops unauthorised users from accessing sensitive functions by showing and permitting actions according to approved user role.
Security|why|Row Level Security|It enforces database-level policies that limit records available to each user.
Security|why|least privilege|Giving only the minimum access necessary limits damage from mistakes or compromised accounts.
Security|why|secure authentication|It establishes reliable user identity and prevents unauthorised access.
Security|why|active-session handling|Monitoring active session identifiers helps reduce simultaneous or unauthorised account use.
Security|why|password protection|Passwords, hashes, service-role keys, and private secrets must never be exposed in browser code.
Security|why|face data governance|Face authentication must be used only with formal approval, consent, retention rules, and data-protection safeguards.
Security|why|document controls|Limiting document access by role and purpose protects course, staff, student, and audit evidence.
Security|why|auditability|Useful timestamps, status changes, responsible person details, and evidence references allow decisions to be verified.
Security|why|backups and change control|Regular backups and pre-deployment inspection enable recovery and reduce disruption when changes fail.
Security|what|the important security rule|The browser application must use only safe public config values. Secret service-role keys must never appear in client-side HTML or JavaScript.
Security|how|to validate mobile workflows|Test all major workflows on a phone after UI changes, especially navigation, modals, forms, tables, camera use, and document uploads.
Procedures|what|the start-of-semester checklist|Confirm academic term and year, verify course catalogue, confirm staff role and student status, review timetable, prepare course files, and test login and role-specific navigation.
Procedures|what|the during-semester checklist|Create attendance sessions, review attendance patterns, maintain course files, use quizzes and support tools, record quality concerns, and review programme indicators.
Procedures|what|the end-of-semester checklist|Record or validate CLO attainment, review evaluation and performance indicators, review course files and audit readiness, create CQI reports, collect evidence, generate reports, and carry approved improvements into the next cycle.
Procedures|why|confirming the academic term|It ensures all records use a consistent time reference.
Procedures|why|verifying course catalogue details|Course delivery information must be correct before students use it.
Procedures|why|preparing course files before teaching|Evidence processes must be ready before teaching begins.
Procedures|why|reviewing programme and school indicators|HOPs and the Dean can intervene before issues grow.
Benefits|why|students benefit|Timetable access, attendance visibility, study planning, quizzes, messages, peer support, documents, events, recognition, and support tools.
Benefits|why|lecturers benefit|Attendance generation, evidence management, question bank, evaluation support, documents, course-file tools, and reports.
Benefits|why|HOPs benefit|Programme-level visibility, course coordination, quality follow-up, study planning, and support workflows.
Benefits|why|the Dean benefits|School-level oversight of programmes, evidence, attainment, CQI, audits, staff performance, and reports.
Benefits|why|quality personnel benefit|Access to course evidence, CLO data, CQI records, audit records, reports, and documents.
Benefits|why|administrators benefit|Centralised records, role-aware operations, database-backed workflows, and controlled administrative capabilities.
Justification|why|a central database|Academic quality cannot be managed reliably when critical evidence is spread across personal devices, email, paper, and disconnected spreadsheets.
Justification|why|the school to programme to course structure|Quality responsibility needs to be visible at the appropriate level, especially within So-CSI.
Justification|why|a role-based interface|Users should not need to navigate through unrelated or confidential institutional functions.
Justification|why|quiz, points, badges, and certificates|Appropriate engagement features can encourage participation and recognise achievement.
Justification|why|mobile-responsive design|QMS access must work where users are, including on phones used for attendance and quick academic checks.
Justification|why|security and RLS|Personal, academic, and institutional data requires access controls at both interface and database levels.
Justification|why|reporting and export|Data becomes useful to leadership only when it can be interpreted, reviewed, presented, and acted upon.
`;

const TEMPLATES = {
  what:  ["What is {S}?", "Define {S}.", "Explain {S}.", "Tell me about {S}.", "What does {S} mean?"],
  how:   ["How does {S} work?", "Explain how {S} works.", "What is the process for {S}?", "Describe {S}.", "Walk me through {S}."],
  why:   ["Why is {S} important?", "What is the purpose of {S}?", "Why do we need {S}?", "What benefit does {S} provide?", "Justify {S}."],
  who:   ["Who uses {S}?", "Which roles have access to {S}?", "Who is responsible for {S}?", "What user roles interact with {S}?", "Who can see {S}?"],
  where: ["Where is {S} stored?", "Which tables contain {S}?", "What database tables support {S}?", "Where does {S} live in the database?", "What data store holds {S}?"]
};

function escSql(s) {
  return String(s).replace(/'/g, "''");
}

const facts = RAW.trim().split("\n").filter(Boolean).map(line => {
  const parts = line.split("|");
  return { cat: parts[0], type: parts[1], subj: parts[2], ans: parts.slice(3).join("|") };
});

const out = [];
const seen = new Set();

for (const f of facts) {
  const tmpls = TEMPLATES[f.type] || TEMPLATES.what;
  for (const t of tmpls) {
    const q = t.replace("{S}", f.subj);
    if (seen.has(q)) continue;
    seen.add(q);
    out.push({ q: q, a: f.ans, c: f.cat });
  }
}

let seed = 42;
for (let i = out.length - 1; i > 0; i--) {
  seed = (seed * 9301 + 49297) % 233280;
  const j = Math.floor((seed / 233280) * (i + 1));
  const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
}

const final = out.slice(0, 1000);
console.log("Generated " + final.length + " unique Q&As from " + facts.length + " facts");

const sql = ["-- FAQ rows from QMS RISE documentation"];
for (const r of final) {
  sql.push("insert into faqs (question, answer, category) values ('" + escSql(r.q) + "', '" + escSql(r.a) + "', '" + escSql(r.c) + "');");
}
fs.writeFileSync("faqs-1000.sql", sql.join("\n"), "utf8");
fs.writeFileSync("faqs-1000.json", JSON.stringify(final.map(r => ({ question: r.q, answer: r.a, category: r.c }))), "utf8");
console.log("Wrote faqs-1000.sql and faqs-1000.json");
console.log("Categories: " + Array.from(new Set(final.map(r => r.c))).join(", "));