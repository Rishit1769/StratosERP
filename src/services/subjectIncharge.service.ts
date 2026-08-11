import { db, run, selectOne, selectRows, withTransaction, type DbRow } from "@/lib/db";

export async function upsertMarks(studentUid: string, subjectId: number, marks: number) {
  await db.execute(
    `
    INSERT INTO student_subject_record (student_uid, subject_id, status, marks)
    VALUES (?, ?, 'Active', ?)
    ON DUPLICATE KEY UPDATE marks = VALUES(marks)
    `,
    [studentUid, subjectId, marks]
  );
}

export async function upsertSuppliMarks(studentUid: string, subjectId: number, marks: number) {
  const status = marks >= 40 ? "Cleared" : "SUPPLI";
  await db.execute(
    `
    INSERT INTO student_subject_record (student_uid, subject_id, status, marks)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE marks = VALUES(marks), status = VALUES(status)
    `,
    [studentUid, subjectId, status, marks]
  );
}

export async function getSubjectMarks(subjectId: number) {
  return selectRows(
    db,
    `
    SELECT
      ssr.student_uid,
      ssr.subject_id,
      ssr.status,
      ssr.marks,
      s.uid,
      s.email_id
    FROM student_subject_record ssr
    JOIN student s ON s.uid = ssr.student_uid
    WHERE ssr.subject_id = ?
    ORDER BY s.uid ASC
    `,
    [subjectId]
  );
}

export async function getSubjectAnalytics(subjectId: number) {
  const records = await selectRows<{ marks: number | null; status: string }>(
    db,
    "SELECT marks, status FROM student_subject_record WHERE subject_id = ?",
    [subjectId]
  );

  const marksValues = records.filter((record) => record.marks !== null).map((record) => Number(record.marks));

  return {
    total_enrolled: records.length,
    avg_marks: marksValues.length ? marksValues.reduce((sum, value) => sum + value, 0) / marksValues.length : null,
    max_marks: marksValues.length ? Math.max(...marksValues) : null,
    min_marks: marksValues.length ? Math.min(...marksValues) : null,
    kt_count: records.filter((record) => record.status === "KT").length,
    suppli_count: records.filter((record) => record.status === "SUPPLI").length,
    cleared_count: records.filter((record) => record.status === "Cleared").length,
  };
}

export async function getActiveSlot(facultyId: number): Promise<Record<string, unknown> | null> {
  const slot = await selectOne<DbRow>(
    db,
    `
    SELECT ts.slot_id, ts.subject_id, sub.name AS subject_name
    FROM timetable_slot ts
    JOIN subject sub ON sub.subject_id = ts.subject_id
    WHERE ts.faculty_id = ?
      AND ts.day_of_week = DAYNAME(CURDATE())
      AND ts.start_time <= CURTIME()
      AND ts.end_time >= CURTIME()
    LIMIT 1
    `,
    [facultyId]
  );

  if (!slot) return null;
  return {
    slot_id: slot.slot_id,
    subject_id: slot.subject_id,
    subject_name: slot.subject_name,
  };
}

export async function markAttendance(slotId: number, attendanceDate: string, presentUids: string[], absentUids: string[]) {
  await withTransaction(async (connection) => {
    await connection.execute(
      `
      INSERT INTO lecture_log (slot_id, execution_date, additional_topics_taught)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE additional_topics_taught = VALUES(additional_topics_taught)
      `,
      [slotId, attendanceDate, JSON.stringify({ present: presentUids, absent: absentUids })]
    );
  });
}

export async function getAttendanceForSlot(slotId: number, date: string) {
  const log = await selectOne<{ additional_topics_taught: string | null }>(
    db,
    "SELECT additional_topics_taught FROM lecture_log WHERE slot_id = ? AND execution_date = ? LIMIT 1",
    [slotId, date]
  );

  if (!log?.additional_topics_taught) return null;
  return JSON.parse(log.additional_topics_taught);
}

export async function logLecture(data: {
  slot_id: number;
  syllabus_topics_taught: string;
  additional_topics_taught?: string;
  execution_date: string;
}) {
  await db.execute(
    `
    INSERT INTO lecture_log (slot_id, syllabus_topics_taught, additional_topics_taught, execution_date)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      syllabus_topics_taught = VALUES(syllabus_topics_taught),
      additional_topics_taught = VALUES(additional_topics_taught)
    `,
    [data.slot_id, data.syllabus_topics_taught, data.additional_topics_taught || null, data.execution_date]
  );
}

export async function getLectureLogs(subjectId: number) {
  return selectRows(
    db,
    `
    SELECT
      ll.log_id,
      ll.slot_id,
      ll.syllabus_topics_taught,
      ll.additional_topics_taught,
      ll.execution_date,
      ts.day_of_week,
      ts.start_time,
      ts.end_time
    FROM lecture_log ll
    JOIN timetable_slot ts ON ts.slot_id = ll.slot_id
    WHERE ts.subject_id = ?
    ORDER BY ll.execution_date DESC
    `,
    [subjectId]
  );
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
      s.email_id AS student_email
    FROM grievance_ticket g
    JOIN student s ON s.uid = g.student_uid
    WHERE g.assigned_authority_id = ? AND g.status = 'Open'
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
  if (!ticket) throw new Error("Grievance not found.");
  if (ticket.assigned_authority_id !== facultyId) {
    throw new Error("Not authorized for this grievance.");
  }
  await run(db, "UPDATE grievance_ticket SET status = 'Resolved' WHERE ticket_id = ?", [ticketId]);
}

export async function getFacultySubjects(facultyId: number) {
  return selectRows(
    db,
    `
    SELECT DISTINCT
      sub.subject_id,
      sub.name,
      sub.semester_level,
      sub.has_lab
    FROM timetable_slot ts
    JOIN subject sub ON sub.subject_id = ts.subject_id
    WHERE ts.faculty_id = ?
    ORDER BY sub.name ASC
    `,
    [facultyId]
  );
}
