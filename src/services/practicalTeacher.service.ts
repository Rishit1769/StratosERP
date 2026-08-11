import { db, run, selectOne, selectRows, withTransaction } from "@/lib/db";

type SessionRow = {
  session_id: number;
  assigned_faculty_id: number;
  status: string;
};

async function getOwnedSession(sessionId: number, facultyId: number): Promise<SessionRow> {
  const session = await selectOne<SessionRow>(
    db,
    "SELECT session_id, assigned_faculty_id, status FROM lab_session WHERE session_id = ? LIMIT 1",
    [sessionId]
  );

  if (!session) throw new Error("Session not found.");
  if (session.assigned_faculty_id !== facultyId) throw new Error("Not authorized for this session.");
  return session;
}

export async function getAssignedSessions(facultyId: number) {
  return selectRows(
    db,
    `
    SELECT
      ls.session_id,
      ls.subject_id,
      ls.batch_id,
      ls.session_date,
      ls.assigned_faculty_id,
      ls.original_faculty_id,
      ls.is_substitute,
      ls.status,
      lb.batch_name,
      s.name AS subject_name
    FROM lab_session ls
    JOIN lab_batch lb ON lb.batch_id = ls.batch_id
    JOIN subject s ON s.subject_id = ls.subject_id
    WHERE ls.assigned_faculty_id = ?
    ORDER BY ls.session_date DESC
    `,
    [facultyId]
  );
}

export async function createLabSession(data: {
  subject_id: number;
  batch_id: number;
  session_date: string;
  assigned_faculty_id: number;
}) {
  const result = await run(
    db,
    `
    INSERT INTO lab_session (subject_id, batch_id, session_date, assigned_faculty_id, status)
    VALUES (?, ?, ?, ?, 'Pending')
    `,
    [data.subject_id, data.batch_id, data.session_date, data.assigned_faculty_id]
  );
  return result.insertId;
}

export async function completeSession(sessionId: number, facultyId: number) {
  const session = await getOwnedSession(sessionId, facultyId);
  if (session.status === "Locked") throw new Error("Session is already locked.");
  await run(db, "UPDATE lab_session SET status = 'Completed' WHERE session_id = ?", [sessionId]);
}

export async function lockSession(sessionId: number, facultyId: number) {
  const session = await getOwnedSession(sessionId, facultyId);
  if (session.status !== "Completed") throw new Error("Session must be Completed before locking.");
  await run(db, "UPDATE lab_session SET status = 'Locked' WHERE session_id = ?", [sessionId]);
}

export async function markLabAttendance(
  sessionId: number,
  facultyId: number,
  attendanceList: { student_uid: string; status: string }[]
) {
  const session = await getOwnedSession(sessionId, facultyId);
  if (session.status === "Locked") throw new Error("Session is locked. Cannot modify attendance.");

  await withTransaction(async (connection) => {
    for (const entry of attendanceList) {
      await connection.execute(
        `
        INSERT INTO lab_attendance (session_id, student_uid, status)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status)
        `,
        [sessionId, entry.student_uid, entry.status]
      );
    }
  });
}

export async function getLabAttendance(sessionId: number) {
  return selectRows(
    db,
    `
    SELECT
      la.attendance_id,
      la.session_id,
      la.student_uid,
      la.status,
      s.email_id
    FROM lab_attendance la
    JOIN student s ON s.uid = la.student_uid
    WHERE la.session_id = ?
    ORDER BY la.student_uid ASC
    `,
    [sessionId]
  );
}

export async function upsertLabMarks(data: {
  student_uid: string;
  subject_id: number;
  experiment_id: number;
  session_id: number;
  viva_marks: number;
  execution_marks: number;
  journal_marks: number;
  remarks?: string;
  faculty_id: number;
}) {
  const session = await getOwnedSession(data.session_id, data.faculty_id);
  if (session.status === "Locked") throw new Error("Session is locked. Cannot modify marks.");

  const total = (data.viva_marks || 0) + (data.execution_marks || 0) + (data.journal_marks || 0);

  await db.execute(
    `
    INSERT INTO lab_marks (
      student_uid, subject_id, experiment_id, session_id,
      viva_marks, execution_marks, journal_marks, total_marks, remarks, updated_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      viva_marks = VALUES(viva_marks),
      execution_marks = VALUES(execution_marks),
      journal_marks = VALUES(journal_marks),
      total_marks = VALUES(total_marks),
      remarks = VALUES(remarks),
      updated_by = VALUES(updated_by)
    `,
    [
      data.student_uid,
      data.subject_id,
      data.experiment_id,
      data.session_id,
      data.viva_marks,
      data.execution_marks,
      data.journal_marks,
      total,
      data.remarks || null,
      data.faculty_id,
    ]
  );
}

export async function getLabMarksBySession(sessionId: number) {
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
      e.experiment_no,
      s.email_id
    FROM lab_marks lm
    JOIN experiment e ON e.experiment_id = lm.experiment_id
    JOIN student s ON s.uid = lm.student_uid
    WHERE lm.session_id = ?
    ORDER BY lm.student_uid ASC, e.experiment_no ASC
    `,
    [sessionId]
  );
}

export async function getExperiments(subjectId: number) {
  return selectRows(
    db,
    `
    SELECT experiment_id, subject_id, experiment_no, title, max_marks
    FROM experiment
    WHERE subject_id = ?
    ORDER BY experiment_no ASC
    `,
    [subjectId]
  );
}

export async function createExperiment(data: {
  subject_id: number;
  experiment_no: number;
  title: string;
  max_marks: number;
}) {
  const result = await run(
    db,
    "INSERT INTO experiment (subject_id, experiment_no, title, max_marks) VALUES (?, ?, ?, ?)",
    [data.subject_id, data.experiment_no, data.title, data.max_marks]
  );
  return result.insertId;
}

export async function getLabBatches(subjectId: number) {
  return selectRows(
    db,
    `
    SELECT
      lb.batch_id,
      lb.subject_id,
      lb.batch_name,
      lb.faculty_id,
      f.name AS faculty_name
    FROM lab_batch lb
    JOIN faculty f ON f.faculty_id = lb.faculty_id
    WHERE lb.subject_id = ?
    `,
    [subjectId]
  );
}

export async function createLabBatch(data: { subject_id: number; batch_name: string; faculty_id: number }) {
  const result = await run(
    db,
    "INSERT INTO lab_batch (subject_id, batch_name, faculty_id) VALUES (?, ?, ?)",
    [data.subject_id, data.batch_name, data.faculty_id]
  );
  return result.insertId;
}

export async function getSubmissions(experimentId: number) {
  return selectRows(
    db,
    `
    SELECT
      ls.submission_id,
      ls.student_uid,
      ls.experiment_id,
      ls.file_url,
      ls.submitted_at,
      ls.status,
      s.email_id
    FROM lab_submission ls
    JOIN student s ON s.uid = ls.student_uid
    WHERE ls.experiment_id = ?
    ORDER BY ls.student_uid ASC
    `,
    [experimentId]
  );
}

export async function upsertSubmission(data: {
  student_uid: string;
  experiment_id: number;
  file_url?: string;
  status: string;
}) {
  await run(
    db,
    "INSERT INTO lab_submission (student_uid, experiment_id, file_url, status) VALUES (?, ?, ?, ?)",
    [data.student_uid, data.experiment_id, data.file_url || null, data.status]
  );
}

export async function generateLabInsights(facultyId: number): Promise<Record<string, unknown>> {
  const sessions = await getAssignedSessions(facultyId);

  const marksRows = await selectRows<Record<string, unknown>>(
    db,
    `
    SELECT
      lm.student_uid,
      s.email_id,
      e.title AS experiment_title,
      lm.viva_marks,
      lm.execution_marks,
      lm.journal_marks,
      lm.total_marks
    FROM lab_marks lm
    JOIN lab_session ls ON ls.session_id = lm.session_id
    JOIN experiment e ON e.experiment_id = lm.experiment_id
    JOIN student s ON s.uid = lm.student_uid
    WHERE ls.assigned_faculty_id = ?
    ORDER BY lm.student_uid ASC, e.experiment_no ASC
    `,
    [facultyId]
  );

  const attendanceRows = await selectRows<Record<string, unknown>>(
    db,
    `
    SELECT la.student_uid, s.email_id, la.status, COUNT(*) AS sessions_attended
    FROM lab_attendance la
    JOIN lab_session ls ON ls.session_id = la.session_id
    JOIN student s ON s.uid = la.student_uid
    WHERE ls.assigned_faculty_id = ?
      AND la.status = 'Present'
    GROUP BY la.student_uid, s.email_id, la.status
    ORDER BY sessions_attended DESC
    `,
    [facultyId]
  );

  const totalSessions = sessions.length;
  const summary = {
    total_sessions: totalSessions,
    completed_sessions: sessions.filter((session) => session.status === "Completed").length,
    locked_sessions: sessions.filter((session) => session.status === "Locked").length,
    students_evaluated: new Set(marksRows.map((row) => String(row.student_uid))).size,
    students_present: attendanceRows.length,
  };

  const prompt = `You are a lab performance analyst for a college ERP.
Analyze the practical session data below and respond ONLY in JSON:
{
  "insights": ["2-3 bullet insights about overall lab performance"],
  "weak_students": ["UIDs of students with low marks or irregular attendance"],
  "attendance_flags": ["UIDs of students missing sessions"],
  "recommendations": ["2-3 actionable recommendations for the lab instructor"]
}

Sessions: ${JSON.stringify(summary)}
Marks: ${JSON.stringify(marksRows.slice(0, 40))}
Attendance: ${JSON.stringify(attendanceRows.slice(0, 40))}`;

  try {
    const { getGeminiModel } = await import("@/lib/notifications/gemini");
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return { summary, ...parsed };
  } catch {
    return {
      summary,
      insights: ["AI insights unavailable — review marks and attendance directly."],
      weak_students: [],
      attendance_flags: [],
      recommendations: [],
    };
  }
}
