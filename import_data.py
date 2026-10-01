import os
import pandas as pd
from supabase import create_client, Client
from datetime import datetime
import hashlib
import qrcode
from tenacity import retry, stop_after_attempt, wait_fixed
import ollama  # optional

# ── Supabase credentials ──
SUPABASE_URL = "https://dilyshvzxpaplqnrievh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpbHlzaHZ6eHBhcGxxbnJpZXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTA0MzgsImV4cCI6MjA5NDI2NjQzOH0.dw3Arny3Sv8COdCYEM-PIPf3rFcYy7kwgrMuGZKgG4U"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def sha256_hash(text):
    return hashlib.sha256(text.encode()).hexdigest()

EXCEL_FILE = "UAMQS_Data.xlsx"
xl = pd.ExcelFile(EXCEL_FILE)

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def import_staff():
    df = pd.read_excel(xl, sheet_name="staff")
    for _, row in df.iterrows():
        email = row['email']
        if pd.isna(email):
            continue
        existing = supabase.table('staff').select('id').eq('email', email).execute()
        if existing.data:
            continue
        name = row['name']
        role = row['position'] if not pd.isna(row['position']) else 'staff'
        programme = row['programme'] if not pd.isna(row['programme']) else 'ALL'
        pwd_hash = row['password'] if not pd.isna(row['password']) else sha256_hash('password123')
        must_change = row['must_change'] if not pd.isna(row['must_change']) else False
        data = {
            'email': email, 'name': name, 'role': role.lower(),
            'programme': programme, 'pwd_hash': pwd_hash,
            'active': True, 'first_login': must_change, 'eval_avg': None
        }
        supabase.table('staff').insert(data).execute()
        print(f"Imported staff: {name}")

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def import_students():
    df = pd.read_excel(xl, sheet_name="students")
    for _, row in df.iterrows():
        email = row['Email'] if not pd.isna(row['Email']) else None
        if not email or pd.isna(email):
            continue
        existing = supabase.table('students').select('id').eq('email', email).execute()
        if existing.data:
            continue
        name = row['Name'] if not pd.isna(row['Name']) else 'Unknown'
        programme = row['Programme'] if not pd.isna(row['Programme']) else 'CS'
        pwd_hash = row['password_hash'] if not pd.isna(row['password_hash']) else sha256_hash('password123')
        student_id = row['Student No.'] if not pd.isna(row['Student No.']) else str(row['No'])
        data = {
            'email': email, 'name': name, 'programme': programme,
            'pwd_hash': pwd_hash, 'student_id': str(student_id),
            'points': 0, 'tier': 'Bronze', 'streak': 0,
            'active': True, 'first_login': True, 'joined': datetime.now().isoformat()
        }
        supabase.table('students').insert(data).execute()
        print(f"Imported student: {name}")

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def import_courses():
    df = pd.read_excel(xl, sheet_name="courses")
    for _, row in df.iterrows():
        code = row['code'] if not pd.isna(row['code']) else None
        if not code:
            continue
        existing = supabase.table('courses').select('id').eq('code', code).execute()
        if existing.data:
            continue
        name = row['course_name'] if not pd.isna(row['course_name']) else code
        credits = row['credits'] if not pd.isna(row['credits']) else 3
        programme = row['programme_name'] if not pd.isna(row['programme_name']) else 'CS'
        lecturer_email = row['lecturer_email'] if not pd.isna(row['lecturer_email']) else None
        lecturer_id = None
        if lecturer_email:
            lec = supabase.table('staff').select('id').eq('email', lecturer_email).execute()
            if lec.data:
                lecturer_id = lec.data[0]['id']
        data = {
            'code': code, 'name': name, 'credits': credits,
            'programme': programme, 'lecturer_id': lecturer_id
        }
        supabase.table('courses').insert(data).execute()
        print(f"Imported course: {code}")

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def import_enrolments():
    df = pd.read_excel(xl, sheet_name="enrolments")
    for _, row in df.iterrows():
        email = row['Email'] if not pd.isna(row['Email']) else None
        if not email:
            continue
        student = supabase.table('students').select('id').eq('email', email).execute()
        if not student.data:
            continue
        student_id = student.data[0]['id']
        course_code = row['Subject Code'] if not pd.isna(row['Subject Code']) else None
        if not course_code:
            continue
        course = supabase.table('courses').select('id').eq('code', course_code).execute()
        if not course.data:
            continue
        course_id = course.data[0]['id']
        existing = supabase.table('enrolments').select('id').eq('student_id', student_id).eq('course_id', course_id).execute()
        if existing.data:
            continue
        data = {'student_id': student_id, 'course_id': course_id, 'semester': 'May2026'}
        supabase.table('enrolments').insert(data).execute()
        print(f"Enrolled {email} -> {course_code}")

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def import_evaluations():
    df = pd.read_excel(xl, sheet_name="lecturer_evaluations")
    for _, row in df.iterrows():
        student_email = row['student_email'] if not pd.isna(row['student_email']) else None
        if not student_email:
            continue
        student = supabase.table('students').select('id', 'name').eq('email', student_email).execute()
        if not student.data:
            continue
        student_id = student.data[0]['id']
        student_name = student.data[0]['name']
        course_code = row['course_code'] if not pd.isna(row['course_code']) else None
        if not course_code:
            continue
        lecturer_email = row['lecturer_email'] if not pd.isna(row['lecturer_email']) else None
        if not lecturer_email:
            continue
        lecturer = supabase.table('staff').select('id', 'name').eq('email', lecturer_email).execute()
        if not lecturer.data:
            continue
        lecturer_id = lecturer.data[0]['id']
        lecturer_name = lecturer.data[0]['name']
        week = row['week_number'] if not pd.isna(row['week_number']) else '1'
        scores = {
            'teaching': [row.get('teaching_skills', 3), row.get('knowledge', 3), row.get('teaching_method', 3), row.get('punctuality', 3), row.get('engaging', 3)],
            'communication': [row.get('voice_body_language', 3), row.get('confidence', 3), row.get('attitude', 3), row.get('professionalism', 3), row.get('attire_looks', 3)],
            'assessment': [row.get('assessment_quality', 3), row.get('moral_values', 3), row.get('motivation_advice', 3), 3, 3],
            'engagement': [row.get('class_cancellation', 3), row.get('short_change_classes', 3), 3, 3, 3]
        }
        all_scores = [v for sublist in scores.values() for v in sublist]
        avg_score = sum(all_scores) / len(all_scores)
        data = {
            'student_id': student_id, 'student_name': student_name,
            'lecturer_id': lecturer_id, 'lecturer_name': lecturer_name,
            'week': week, 'scores': scores, 'avg_score': round(avg_score, 2),
            'ts': datetime.now().isoformat()
        }
        supabase.table('evaluations').insert(data).execute()
        print(f"Imported evaluation for {student_name} on {course_code}")

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def import_attendance():
    df = pd.read_excel(xl, sheet_name="attendance")
    for _, row in df.iterrows():
        student_id_val = row['student_id'] if not pd.isna(row['student_id']) else None
        if not student_id_val:
            continue
        student = supabase.table('students').select('id').eq('student_id', str(student_id_val)).execute()
        if not student.data:
            student = supabase.table('students').select('id').eq('email', student_id_val).execute()
            if not student.data:
                continue
        student_id = student.data[0]['id']
        course_code = row['course_code'] if not pd.isna(row['course_code']) else None
        if not course_code:
            continue
        course = supabase.table('courses').select('id').eq('code', course_code).execute()
        if not course.data:
            continue
        course_id = course.data[0]['id']
        data = {
            'student_id': student_id, 'course_id': course_id,
            'week': row.get('week', 1), 'slot': row.get('slot', ''),
            'points': row.get('points', 2),
            'timestamp': row.get('timestamp', datetime.now().isoformat()) if not pd.isna(row.get('timestamp')) else datetime.now().isoformat(),
            'venue': row.get('venue', 'BAC Tower'), 'attended': True
        }
        supabase.table('attendance_logs').insert(data).execute()
        print(f"Imported attendance for student {student_id_val}")

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def import_complaints():
    df = pd.read_excel(xl, sheet_name="complaints")
    for _, row in df.iterrows():
        student_id_val = row['student_id'] if not pd.isna(row['student_id']) else None
        if not student_id_val:
            continue
        student = supabase.table('students').select('id', 'name').eq('student_id', str(student_id_val)).execute()
        if not student.data:
            student = supabase.table('students').select('id', 'name').eq('email', student_id_val).execute()
            if not student.data:
                continue
        student_id = student.data[0]['id']
        student_name = student.data[0]['name']
        data = {
            'student_id': student_id, 'student_name': student_name,
            'anonymous': False, 'category': row.get('category', 'Academic'),
            'subject': row.get('subject', 'No subject'),
            'description': row.get('description', ''),
            'status': row.get('status', 'Pending'),
            'remarks': row.get('response', ''),
            'programme': row.get('programme', 'CS'),
            'ts': row.get('submitted_at', datetime.now().isoformat()) if not pd.isna(row.get('submitted_at')) else datetime.now().isoformat()
        }
        supabase.table('complaints').insert(data).execute()
        print(f"Imported complaint from {student_name}")

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def import_messages():
    df = pd.read_excel(xl, sheet_name="chats")
    for _, row in df.iterrows():
        from_role = row['from_role'] if not pd.isna(row['from_role']) else 'student'
        from_id = row['from_id'] if not pd.isna(row['from_id']) else None
        to_role = row['to_role'] if not pd.isna(row['to_role']) else 'staff'
        to_id = row['to_id'] if not pd.isna(row['to_id']) else None
        if not from_id or not to_id:
            continue
        # find from user
        if from_role == 'student':
            from_user = supabase.table('students').select('id', 'name').eq('student_id', str(from_id)).execute()
            if not from_user.data:
                from_user = supabase.table('students').select('id', 'name').eq('email', from_id).execute()
            if not from_user.data:
                continue
            from_user_id = from_user.data[0]['id']
            from_name = from_user.data[0]['name']
        else:
            from_user = supabase.table('staff').select('id', 'name').eq('email', from_id).execute()
            if not from_user.data:
                continue
            from_user_id = from_user.data[0]['id']
            from_name = from_user.data[0]['name']
        # find to user
        if to_role == 'student':
            to_user = supabase.table('students').select('id', 'name').eq('student_id', str(to_id)).execute()
            if not to_user.data:
                to_user = supabase.table('students').select('id', 'name').eq('email', to_id).execute()
            if not to_user.data:
                continue
            to_user_id = to_user.data[0]['id']
            to_name = to_user.data[0]['name']
        else:
            to_user = supabase.table('staff').select('id', 'name').eq('email', to_id).execute()
            if not to_user.data:
                continue
            to_user_id = to_user.data[0]['id']
            to_name = to_user.data[0]['name']
        data = {
            'from_id': from_user_id, 'from_name': from_name,
            'to_id': to_user_id, 'to_name': to_name,
            'subject': '', 'body': row.get('message', ''),
            'read': row.get('read', False), 'programme': 'ALL',
            'ts': row.get('timestamp', datetime.now().isoformat()) if not pd.isna(row.get('timestamp')) else datetime.now().isoformat()
        }
        supabase.table('messages').insert(data).execute()
        print(f"Imported message from {from_name} to {to_name}")

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def import_rise_points():
    df = pd.read_excel(xl, sheet_name="rise_points")
    for _, row in df.iterrows():
        student_id_val = row['student_id'] if not pd.isna(row['student_id']) else None
        if not student_id_val:
            continue
        student = supabase.table('students').select('id').eq('student_id', str(student_id_val)).execute()
        if not student.data:
            student = supabase.table('students').select('id').eq('email', student_id_val).execute()
            if not student.data:
                continue
        student_id = student.data[0]['id']
        pts = row['points'] if not pd.isna(row['points']) else 1
        reason = row['reason'] if not pd.isna(row['reason']) else 'Imported'
        data = {
            'student_id': student_id, 'type': 'imported',
            'pts': pts, 'description': reason,
            'ts': row.get('awarded_at', datetime.now().isoformat()) if not pd.isna(row.get('awarded_at')) else datetime.now().isoformat()
        }
        supabase.table('rise_points').insert(data).execute()
        print(f"Imported RISE point for student {student_id_val}")

if __name__ == "__main__":
    print("Starting data import...")
    import_staff()
    import_students()
    import_courses()
    import_enrolments()
    import_evaluations()
    import_attendance()
    import_complaints()
    import_messages()
    import_rise_points()
    print("All imports completed.")
