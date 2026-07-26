import { db, parseJsonArray, run, selectOne, selectRows, type DbRow } from "@/lib/db";

function isYearBack(academicYear: string, currentSemester: number): boolean {
  if (academicYear === "1st") return ![1, 2].includes(currentSemester);
  if (academicYear === "2nd") return ![3, 4].includes(currentSemester);
  if (academicYear === "3rd") return ![5, 6].includes(currentSemester);
  if (academicYear === "4th") return ![7, 8].includes(currentSemester);
  return false;
}

export async function getStudentDashboard(uid: string) {
  const student = await selectOne<DbRow>(
    db,
    `
    SELECT uid, email_id, current_semester, academic_year
    FROM student
    WHERE uid = ?
    LIMIT 1
    `,
    [uid]
  );
  if (!student) return null;

  const subjects = await selectRows<DbRow>(
    db,
    `
    SELECT
      ssr.subject_id,
      ssr.marks,
      ssr.status,
      sub.name,
      sub.semester_level,
      sub.has_lab
    FROM student_subject_record ssr
    JOIN subject sub ON sub.subject_id = ssr.subject_id
    WHERE ssr.student_uid = ?
    ORDER BY sub.semester_level DESC, sub.name ASC
    `,
    [uid]
  );

  const ktCount = subjects.filter((subject) => subject.status === "KT").length;
  const suppliCount = subjects.filter((subject) => subject.status === "SUPPLI").length;
  const hasKt = ktCount > 0;
  const hasSuppli = suppliCount > 0;
  const yearBack = isYearBack(String(student.academic_year), Number(student.current_semester));

  const aicte = await getAICTETotal(uid);

  return {
    student: {
      uid: student.uid,
      emailId: student.email_id,
      currentSemester: student.current_semester,
      academicYear: student.academic_year,
    },
    progression_status: {
      has_kt: hasKt,
      has_suppli: hasSuppli,
      is_year_back: yearBack,
      kt_count: ktCount,
      suppli_count: suppliCount,
      promotion_blocked: hasKt || hasSuppli,
      dashboard_flag: yearBack ? "YEAR_BACK_ATTENTION" : hasKt || hasSuppli ? "BACKLOG_ATTENTION" : "ON_TRACK",
    },
    subjects: subjects.map((subject) => ({
      subject_id: subject.subject_id,
      name: subject.name,
      semester_level: subject.semester_level,
      has_lab: subject.has_lab,
      marks: subject.marks,
      status: subject.status,
    })),
    aicte_total_points: aicte,
  };
}

export async function getAICTETotal(uid: string): Promise<number> {
  const result = await selectOne<{ total: number }>(
    db,
    "SELECT COALESCE(SUM(points), 0) AS total FROM aicte_points WHERE student_uid = ?",
    [uid]
  );
  return result?.total ?? 0;
}

export async function getTimetable(uid: string) {
  const student = await selectOne<{ current_semester: number }>(
    db,
    "SELECT current_semester FROM student WHERE uid = ? LIMIT 1",
    [uid]
  );
  if (!student) return null;

  return selectRows(
    db,
    `
    SELECT
      ts.slot_id,
      ts.day_of_week,
      ts.start_time,
      ts.end_time,
      ts.subject_id,
      ts.faculty_id,
      sub.name AS subject_name,
      f.name AS faculty_name
    FROM timetable_slot ts
    JOIN subject sub ON sub.subject_id = ts.subject_id
    JOIN faculty f ON f.faculty_id = ts.faculty_id
    WHERE sub.semester_level = ?
    ORDER BY ts.day_of_week ASC, ts.start_time ASC
    `,
    [student.current_semester]
  );
}

export async function liveFacultyLocator() {
  return selectRows(
    db,
    `
    SELECT
      ts.slot_id,
      ts.day_of_week,
      ts.start_time,
      ts.end_time,
      ts.subject_id,
      ts.faculty_id,
      sub.name AS subject_name,
      f.faculty_id AS facultyId,
      f.name AS faculty_name
    FROM timetable_slot ts
    JOIN subject sub ON sub.subject_id = ts.subject_id
    JOIN faculty f ON f.faculty_id = ts.faculty_id
    WHERE ts.day_of_week = DAYNAME(CURDATE())
      AND ts.start_time <= CURTIME()
      AND ts.end_time >= CURTIME()
    `
  );
}

export async function submitGrievance(data: {
  student_uid: string;
  category: string;
  description: string;
  evidence?: string;
}) {
  const result = await run(
    db,
    `
    INSERT INTO grievance_ticket (student_uid, category, description, evidence, status)
    VALUES (?, ?, ?, ?, 'Open')
    `,
    [data.student_uid, data.category, data.description, data.evidence || null]
  );
  return result.insertId;
}

export async function getMyGrievances(uid: string) {
  return selectRows(
    db,
    `
    SELECT
      g.ticket_id,
      g.student_uid,
      g.category,
      g.description,
      g.evidence,
      g.status,
      g.assigned_authority_id,
      g.created_at,
      g.updated_at,
      f.name AS authority_name
    FROM grievance_ticket g
    LEFT JOIN faculty f ON f.faculty_id = g.assigned_authority_id
    WHERE g.student_uid = ?
    ORDER BY g.created_at DESC
    `,
    [uid]
  );
}

export async function getNotices() {
  const rows = await selectRows<DbRow>(
    db,
    `
    SELECT notice_id, title, target_audience, ai_filter_tags, created_at
    FROM notice_board
    ORDER BY created_at DESC
    LIMIT 20
    `
  );

  return rows.map((row) => ({
    ...row,
    ai_filter_tags: parseJsonArray(row.ai_filter_tags),
  }));
}

export async function getStudyMaterials(subjectId: number) {
  return {
    subject_id: subjectId,
    note: "Use /api/student/materials/:subject_id/download endpoint with object_name param.",
  };
}

export async function getLabMarks(uid: string) {
  return selectRows(
    db,
    `
    SELECT
      lm.mark_id,
      lm.student_uid,
      lm.subject_id,
      lm.experiment_id,
      lm.session_id,
      lm.viva_marks,
      lm.execution_marks,
      lm.journal_marks,
      lm.total_marks,
      lm.remarks,
      lm.updated_by,
      lm.updated_at,
      e.title AS experiment_title,
      s.name AS subject_name
    FROM lab_marks lm
    JOIN experiment e ON e.experiment_id = lm.experiment_id
    JOIN subject s ON s.subject_id = lm.subject_id
    WHERE lm.student_uid = ?
    ORDER BY s.name ASC, e.experiment_no ASC
    `,
    [uid]
  );
}
