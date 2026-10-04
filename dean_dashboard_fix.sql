-- ============================================================
-- DEAN DASHBOARD DATA FIX
-- Run in Supabase SQL Editor.
-- Safe to re-run. Review the duplicate-staff section first.
-- ============================================================

-- 1) SAFE STAFF DIRECTORY VIEW
-- Prevents the Dean dashboard from selecting sensitive staff fields.
CREATE OR REPLACE VIEW public.staff_directory AS
SELECT id, name, email, role, programme, school, avatar_url, title, active
FROM public.staff
WHERE active IS DISTINCT FROM false;

GRANT SELECT ON public.staff_directory TO authenticated;

-- 2) DEAN KPI SUMMARY VIEW
-- Returns pre-aggregated values so the browser does not need
-- SELECT * from students, evaluations, attendance_logs and staff.
CREATE OR REPLACE VIEW public.dean_kpi_summary AS
SELECT
  (SELECT count(*) FROM public.students WHERE active IS DISTINCT FROM false) AS total_students,
  (SELECT count(*) FROM public.students WHERE active IS DISTINCT FROM false AND coalesce(points,0) > 0) AS active_engaged_students,
  (SELECT round(avg(coalesce(points,0))) FROM public.students WHERE active IS DISTINCT FROM false) AS average_points,
  (SELECT round(avg(coalesce(average_score, avg_score, 0))::numeric, 1) FROM public.evaluations) AS average_evaluation_score,
  (SELECT count(*) FROM public.evaluations) AS total_evaluations,
  (SELECT count(*) FROM public.complaints WHERE lower(coalesce(status,'')) = 'pending') AS pending_complaints,
  (SELECT count(*) FROM public.staff WHERE active IS DISTINCT FROM false) AS active_staff,
  (SELECT count(*) FROM public.attendance_logs) AS total_attendance_logs;

GRANT SELECT ON public.dean_kpi_summary TO authenticated;

-- 3) PROGRAMME EVALUATION SUMMARY VIEW
-- Uses the evaluation's own programme when available; otherwise falls back
-- to the assigned lecturer's programme.
CREATE OR REPLACE VIEW public.dean_programme_summary AS
SELECT
  coalesce(NULLIF(trim(e.programme), ''), NULLIF(trim(s.programme), ''), 'Unassigned') AS programme,
  count(e.id) AS evaluation_count,
  round(avg(coalesce(e.average_score, e.avg_score, 0))::numeric, 1) AS average_score
FROM public.evaluations e
LEFT JOIN public.staff s ON s.id = e.lecturer_id
GROUP BY 1;

GRANT SELECT ON public.dean_programme_summary TO authenticated;

-- 4) STUDENT TIER SUMMARY VIEW
CREATE OR REPLACE VIEW public.dean_tier_summary AS
SELECT
  coalesce(NULLIF(trim(tier), ''), 'Unassigned') AS tier,
  count(*) AS student_count
FROM public.students
WHERE active IS DISTINCT FROM false
GROUP BY 1;

GRANT SELECT ON public.dean_tier_summary TO authenticated;

-- 5) ATTENDANCE SUMMARY VIEW
-- Counts attendance per active session instead of assuming
-- seven records per student.
CREATE OR REPLACE VIEW public.dean_attendance_summary AS
SELECT
  count(DISTINCT s.id) AS total_sessions,
  count(DISTINCT s.id) FILTER (WHERE s.active) AS active_sessions,
  count(l.id) AS total_attendance_logs,
  count(DISTINCT l.student_id) AS students_with_attendance
FROM public.attendance_sessions s
LEFT JOIN public.attendance_logs l
  ON lower(l.code) = lower(s.code);

GRANT SELECT ON public.dean_attendance_summary TO authenticated;

-- ============================================================
-- 6) DUPLICATE STAFF CLEANUP
-- IMPORTANT: Run the audit query first, then choose the official
-- record for each person. Deactivate rather than delete first.
-- ============================================================

-- Audit duplicate staff by normalized name
SELECT
  lower(regexp_replace(name, '\s+', ' ', 'g')) AS normalized_name,
  count(*) AS record_count,
  string_agg(id || ' | ' || coalesce(email,'') || ' | ' || name, E'\n') AS records
FROM public.staff
GROUP BY 1
HAVING count(*) > 1
ORDER BY record_count DESC;

-- Example: keep vnittiya@unimy.edu.my and deactivate nithya@unimy.edu.my
-- UPDATE public.staff SET active = false WHERE lower(email) = 'nithya@unimy.edu.my';

-- Example: keep faiqah.fauzi@unimy.edu.my and deactivate faiqah@unimy.edu.my
-- UPDATE public.staff SET active = false WHERE lower(email) = 'faiqah@unimy.edu.my';

-- 7) EMAIL FORMAT CONSTRAINTS
-- Add only after existing invalid emails are corrected.
-- Staff: any valid local part @unimy.edu.my
-- DO $$ BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_constraint WHERE conname = 'staff_email_format_check'
--   ) THEN
--     ALTER TABLE public.staff
--       ADD CONSTRAINT staff_email_format_check
--       CHECK (email ~* '^[A-Za-z0-9._%+-]+@unimy\.edu\.my$');
--   END IF;
-- END $$;

-- Student: studentnumber.alias@student.unimy.edu.my
-- DO $$ BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_constraint WHERE conname = 'student_email_format_check'
--   ) THEN
--     ALTER TABLE public.students
--       ADD CONSTRAINT student_email_format_check
--       CHECK (
--         email IS NULL
--         OR email = ''
--         OR email ~* '^[0-9]+\.[A-Za-z0-9._%+-]+@student\.unimy\.edu\.my$'
--       );
--   END IF;
-- END $$;
