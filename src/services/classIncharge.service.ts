import { db, parseJsonArray, selectOne, selectRows, run, type DbRow } from "@/lib/db";

export async function getClassAnalytics(_classId?: string) {
  const rows = await selectRows<{ marks: number | null; status: string }>(
    db,
    `
    SELECT ssr.marks, ssr.status
    FROM student s
    LEFT JOIN student_subject_record ssr ON ssr.student_uid = s.uid
    WHERE s.academic_year <> 'Alumni'
    `
  );

  const marksValues = rows.filter((row) => row.marks !== null).map((row) => Number(row.marks));

  return {
    total_students: (await selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM student WHERE academic_year <> 'Alumni'"))?.total ?? 0,
    avg_marks: marksValues.length ? marksValues.reduce((sum, value) => sum + value, 0) / marksValues.length : null,
    total_kt: rows.filter((row) => row.status === "KT").length,
    total_suppli: rows.filter((row) => row.status === "SUPPLI").length,
    total_cleared: rows.filter((row) => row.status === "Cleared").length,
  };
}

export async function getAtRiskStudents(): Promise<Record<string, unknown>[]> {
  const rows = await selectRows<DbRow>(
    db,
    `
    SELECT
      s.uid,
      s.email_id,
      s.current_semester,
      s.academic_year,
      GROUP_CONCAT(DISTINCT sub.name ORDER BY sub.name SEPARATOR ', ') AS backlog_subjects
    FROM student s
    JOIN student_subject_record ssr ON ssr.student_uid = s.uid
    LEFT JOIN subject sub ON sub.subject_id = ssr.subject_id
    WHERE s.academic_year <> 'Alumni'
      AND (ssr.status IN ('KT', 'SUPPLI') OR (ssr.marks IS NOT NULL AND ssr.marks < 40))
    GROUP BY s.uid, s.email_id, s.current_semester, s.academic_year
    ORDER BY s.uid ASC
    `
  );

  return rows.map((row) => ({
    uid: row.uid,
    email_id: row.email_id,
    current_semester: row.current_semester,
    academic_year: row.academic_year,
    backlog_subjects: row.backlog_subjects ?? "",
  }));
}

export async function getStudentPortfolio(uid: string) {
  const student = await selectOne<DbRow>(
    db,
    "SELECT uid, email_id, current_semester, academic_year FROM student WHERE uid = ? LIMIT 1",
    [uid]
  );
  if (!student) return null;

  const subjects = await selectRows<DbRow>(
    db,
    `
    SELECT sub.name, sub.semester_level, ssr.marks, ssr.status
    FROM student_subject_record ssr
    JOIN subject sub ON sub.subject_id = ssr.subject_id
    WHERE ssr.student_uid = ?
    ORDER BY sub.semester_level ASC, sub.name ASC
    `,
    [uid]
  );

  const grievances = await selectRows<DbRow>(
    db,
    `
    SELECT ticket_id, category, status, created_at
    FROM grievance_ticket
    WHERE student_uid = ?
    ORDER BY created_at DESC
    `,
    [uid]
  );

  return {
    student,
    subjects: subjects.map((subject) => ({
      name: subject.name,
      semester_level: subject.semester_level,
      marks: subject.marks,
      status: subject.status,
    })),
    grievances,
    backlog_count: subjects.filter((subject) => ["KT", "SUPPLI"].includes(String(subject.status))).length,
  };
}

export async function getAllStudents() {
  return selectRows(
    db,
    `
    SELECT
      s.uid,
      s.email_id,
      s.current_semester,
      s.academic_year,
      COALESCE(SUM(CASE WHEN ssr.status IN ('KT', 'SUPPLI') THEN 1 ELSE 0 END), 0) AS backlogs
    FROM student s
    LEFT JOIN student_subject_record ssr ON ssr.student_uid = s.uid
    WHERE s.academic_year <> 'Alumni'
    GROUP BY s.uid, s.email_id, s.current_semester, s.academic_year
    ORDER BY s.uid ASC
    `
  );
}

export async function getNoticesForClass() {
  const rows = await selectRows<DbRow>(
    db,
    `
    SELECT notice_id, title, target_audience, ai_filter_tags, created_at
    FROM notice_board
    WHERE target_audience IN ('INSTITUTE', 'BRANCH')
    ORDER BY created_at DESC
    LIMIT 20
    `
  );

  return rows.map((row) => ({
    ...row,
    ai_filter_tags: parseJsonArray(row.ai_filter_tags),
  }));
}

export async function createClassNotice(title: string, tags?: string[]) {
  const result = await run(
    db,
    "INSERT INTO notice_board (title, target_audience, ai_filter_tags) VALUES (?, 'BRANCH', ?)",
    [title, JSON.stringify(tags || [])]
  );
  return result.insertId;
}

export async function getProgressionReadiness(): Promise<Record<string, unknown>[]> {
  return selectRows(
    db,
    `
    SELECT s.uid, s.email_id, s.current_semester, s.academic_year
    FROM student s
    WHERE s.academic_year <> 'Alumni'
      AND NOT EXISTS (
        SELECT 1
        FROM student_subject_record ssr
        WHERE ssr.student_uid = s.uid
          AND ssr.status IN ('KT', 'SUPPLI')
      )
    ORDER BY s.uid ASC
    `
  );
}
