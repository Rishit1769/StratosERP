import pool from '../config/database';

// ── Lab Sessions ─────────────────────────────────────────────

export async function getAssignedSessions(facultyId: number) {
  const [rows] = await pool.query<any[]>(`
    SELECT ls.*, lb.batch_name, s.name AS subject_name
    FROM lab_session ls
    JOIN lab_batch lb ON ls.batch_id = lb.batch_id
    JOIN subject s ON ls.subject_id = s.subject_id
    WHERE ls.assigned_faculty_id = ?
    ORDER BY ls.session_date DESC
  `, [facultyId]);
  return rows;
}

export async function createLabSession(data: {
  subject_id: number; batch_id: number; session_date: string; assigned_faculty_id: number;
}) {
  const [result] = await pool.query<any>(`
    INSERT INTO lab_session (subject_id, batch_id, session_date, assigned_faculty_id, status)
    VALUES (?, ?, ?, ?, 'Pending')
  `, [data.subject_id, data.batch_id, data.session_date, data.assigned_faculty_id]);
  return result.insertId;
}

export async function completeSession(sessionId: number, facultyId: number) {
  const [[session]] = await pool.query<any[]>(
    'SELECT * FROM lab_session WHERE session_id = ?', [sessionId]
  );
  if (!session) throw new Error('Session not found.');
  if (session.assigned_faculty_id !== facultyId) throw new Error('Not authorized for this session.');
  if (session.status === 'Locked') throw new Error('Session is already locked.');

  await pool.query(
    "UPDATE lab_session SET status = 'Completed' WHERE session_id = ?", [sessionId]
  );
}

export async function lockSession(sessionId: number, facultyId: number) {
  const [[session]] = await pool.query<any[]>(
    'SELECT * FROM lab_session WHERE session_id = ?', [sessionId]
  );
  if (!session) throw new Error('Session not found.');
  if (session.assigned_faculty_id !== facultyId) throw new Error('Not authorized for this session.');
  if (session.status !== 'Completed') throw new Error('Session must be Completed before locking.');

  await pool.query(
    "UPDATE lab_session SET status = 'Locked' WHERE session_id = ?", [sessionId]
  );
}

// ── Lab Attendance ────────────────────────────────────────────

export async function markLabAttendance(
  sessionId: number, facultyId: number,
  attendanceList: { student_uid: string; status: string }[]
) {
  const [[session]] = await pool.query<any[]>(
    'SELECT * FROM lab_session WHERE session_id = ?', [sessionId]
  );
  if (!session) throw new Error('Session not found.');
  if (session.assigned_faculty_id !== facultyId) throw new Error('Not authorized for this session.');
  if (session.status === 'Locked') throw new Error('Session is locked. Cannot modify attendance.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const entry of attendanceList) {
      await conn.query(`
        INSERT INTO lab_attendance (session_id, student_uid, status)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status)
      `, [sessionId, entry.student_uid, entry.status]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getLabAttendance(sessionId: number) {
  const [rows] = await pool.query<any[]>(`
    SELECT la.*, s.email_id
    FROM lab_attendance la
    JOIN student s ON la.student_uid = s.uid
    WHERE la.session_id = ?
    ORDER BY s.uid
  `, [sessionId]);
  return rows;
}

// ── Experiment Marking ────────────────────────────────────────

export async function upsertLabMarks(data: {
  student_uid: string; subject_id: number; experiment_id: number; session_id: number;
  viva_marks: number; execution_marks: number; journal_marks: number; remarks?: string; faculty_id: number;
}) {
  const [[session]] = await pool.query<any[]>(
    'SELECT * FROM lab_session WHERE session_id = ?', [data.session_id]
  );
  if (!session) throw new Error('Session not found.');
  if (session.assigned_faculty_id !== data.faculty_id) throw new Error('Not authorized for this session.');
  if (session.status === 'Locked') throw new Error('Session is locked. Cannot modify marks.');

  const total = (data.viva_marks || 0) + (data.execution_marks || 0) + (data.journal_marks || 0);

  await pool.query(`
    INSERT INTO lab_marks
      (student_uid, subject_id, experiment_id, session_id, viva_marks, execution_marks, journal_marks, total_marks, remarks, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      viva_marks = VALUES(viva_marks), execution_marks = VALUES(execution_marks),
      journal_marks = VALUES(journal_marks), total_marks = VALUES(total_marks),
      remarks = VALUES(remarks), updated_by = VALUES(updated_by)
  `, [
    data.student_uid, data.subject_id, data.experiment_id, data.session_id,
    data.viva_marks, data.execution_marks, data.journal_marks, total,
    data.remarks || null, data.faculty_id
  ]);
}

export async function getLabMarksBySession(sessionId: number) {
  const [rows] = await pool.query<any[]>(`
    SELECT lm.*, e.title AS experiment_title, s.email_id
    FROM lab_marks lm
    JOIN experiment e ON lm.experiment_id = e.experiment_id
    JOIN student s ON lm.student_uid = s.uid
    WHERE lm.session_id = ?
    ORDER BY s.uid, e.experiment_no
  `, [sessionId]);
  return rows;
}

// ── Experiments ───────────────────────────────────────────────

export async function getExperiments(subjectId: number) {
  const [rows] = await pool.query<any[]>(
    'SELECT * FROM experiment WHERE subject_id = ? ORDER BY experiment_no',
    [subjectId]
  );
  return rows;
}

export async function createExperiment(data: { subject_id: number; experiment_no: number; title: string; max_marks: number }) {
  const [result] = await pool.query<any>(`
    INSERT INTO experiment (subject_id, experiment_no, title, max_marks) VALUES (?, ?, ?, ?)
  `, [data.subject_id, data.experiment_no, data.title, data.max_marks]);
  return result.insertId;
}

// ── Lab Batches ───────────────────────────────────────────────

export async function getLabBatches(subjectId: number) {
  const [rows] = await pool.query<any[]>(`
    SELECT lb.*, f.name AS faculty_name
    FROM lab_batch lb
    JOIN faculty f ON lb.faculty_id = f.faculty_id
    WHERE lb.subject_id = ?
  `, [subjectId]);
  return rows;
}

export async function createLabBatch(data: { subject_id: number; batch_name: string; faculty_id: number }) {
  const [result] = await pool.query<any>(`
    INSERT INTO lab_batch (subject_id, batch_name, faculty_id) VALUES (?, ?, ?)
  `, [data.subject_id, data.batch_name, data.faculty_id]);
  return result.insertId;
}

// ── Submission Tracking ───────────────────────────────────────

export async function getSubmissions(experimentId: number) {
  const [rows] = await pool.query<any[]>(`
    SELECT ls.*, s.email_id
    FROM lab_submission ls
    JOIN student s ON ls.student_uid = s.uid
    WHERE ls.experiment_id = ?
    ORDER BY s.uid
  `, [experimentId]);
  return rows;
}

export async function upsertSubmission(data: {
  student_uid: string; experiment_id: number; file_url?: string; status: string;
}) {
  await pool.query(`
    INSERT INTO lab_submission (student_uid, experiment_id, file_url, status)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE file_url = VALUES(file_url), status = VALUES(status)
  `, [data.student_uid, data.experiment_id, data.file_url || null, data.status]);
}
