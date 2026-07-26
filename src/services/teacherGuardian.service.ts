import { db, parseJsonArray, run, selectOne, selectRows, type DbRow } from "@/lib/db";

export async function getMentees(tgFacultyId: number) {
  return selectRows(
    db,
    `
    SELECT
      s.uid,
      s.email_id,
      s.current_semester,
      s.academic_year,
      COALESCE(SUM(CASE WHEN ssr.status IN ('KT', 'SUPPLI') THEN 1 ELSE 0 END), 0) AS backlogs
    FROM tg_assignment tga
    JOIN student s ON s.uid = tga.student_uid
    LEFT JOIN student_subject_record ssr ON ssr.student_uid = s.uid
    WHERE tga.faculty_id = ?
    GROUP BY s.uid, s.email_id, s.current_semester, s.academic_year
    ORDER BY s.uid ASC
    `,
    [tgFacultyId]
  );
}

export async function getMenteePortfolio(tgFacultyId: number, studentUid: string) {
  const assignment = await selectOne(
    db,
    "SELECT assignment_id FROM tg_assignment WHERE faculty_id = ? AND student_uid = ? LIMIT 1",
    [tgFacultyId, studentUid]
  );
  if (!assignment) throw new Error("Student not in your mentee group.");

  const student = await selectOne<DbRow>(
    db,
    "SELECT uid, email_id, current_semester, academic_year FROM student WHERE uid = ? LIMIT 1",
    [studentUid]
  );

  const subjects = await selectRows<DbRow>(
    db,
    `
    SELECT sub.name, sub.semester_level, ssr.marks, ssr.status
    FROM student_subject_record ssr
    JOIN subject sub ON sub.subject_id = ssr.subject_id
    WHERE ssr.student_uid = ?
    ORDER BY sub.semester_level ASC, sub.name ASC
    `,
    [studentUid]
  );

  const aictePoints = await selectRows(
    db,
    `
    SELECT record_id, student_uid, activity, points, awarded_by, awarded_at
    FROM aicte_points
    WHERE student_uid = ?
    ORDER BY awarded_at DESC
    `,
    [studentUid]
  );

  const grievances = await selectRows(
    db,
    `
    SELECT ticket_id, student_uid, category, description, evidence, status, assigned_authority_id, created_at, updated_at
    FROM grievance_ticket
    WHERE student_uid = ?
    ORDER BY created_at DESC
    `,
    [studentUid]
  );

  return {
    student,
    subjects: subjects.map((subject) => ({
      name: subject.name,
      semester_level: subject.semester_level,
      marks: subject.marks,
      status: subject.status,
    })),
    aicte_points: aictePoints,
    grievances,
  };
}

export async function awardAICTEPoints(data: {
  student_uid: string;
  activity: string;
  points: number;
  faculty_id: number;
}) {
  const result = await run(
    db,
    "INSERT INTO aicte_points (student_uid, activity, points, awarded_by) VALUES (?, ?, ?, ?)",
    [data.student_uid, data.activity, data.points, data.faculty_id]
  );
  return result.insertId;
}

export async function getAICTEPoints(studentUid: string) {
  const records = await selectRows(
    db,
    `
    SELECT record_id, student_uid, activity, points, awarded_by, awarded_at
    FROM aicte_points
    WHERE student_uid = ?
    ORDER BY awarded_at DESC
    `,
    [studentUid]
  );

  const total = records.reduce((sum, record) => sum + Number(record.points), 0);
  return { records, total_points: total };
}

export async function getAssignedGrievances(facultyId: number) {
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
      s.email_id
    FROM grievance_ticket g
    JOIN student s ON s.uid = g.student_uid
    WHERE g.assigned_authority_id = ?
      AND g.status = 'Open'
    ORDER BY g.created_at DESC
    `,
    [facultyId]
  );
}

export async function resolveGrievance(ticketId: number, facultyId: number) {
  const ticket = await selectOne<{ assigned_authority_id: number | null }>(
    db,
    "SELECT assigned_authority_id FROM grievance_ticket WHERE ticket_id = ? LIMIT 1",
    [ticketId]
  );

  if (!ticket) throw new Error("Ticket not found.");
  if (ticket.assigned_authority_id !== facultyId) throw new Error("Not authorized for this ticket.");

  await run(db, "UPDATE grievance_ticket SET status = 'Resolved' WHERE ticket_id = ?", [ticketId]);
}

export async function getRelevantNotices() {
  const rows = await selectRows<DbRow>(
    db,
    `
    SELECT notice_id, title, target_audience, ai_filter_tags, created_at
    FROM notice_board
    ORDER BY created_at DESC
    LIMIT 15
    `
  );

  return rows.map((row) => ({
    ...row,
    ai_filter_tags: parseJsonArray(row.ai_filter_tags),
  }));
}
