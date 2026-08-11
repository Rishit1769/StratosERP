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

// ── 75% attendance threshold flagging ──────────────────────────────
// Theory attendance is stored per slot as { present: [...], absent: [...] }
// in lecture_log.additional_topics_taught. Aggregate it per student and
// flag anyone below the institutional threshold (global_config).
export async function getAttendanceFlags(facultyId: number) {
  const config = await selectOne<{ min_attendance_percent: number | null }>(
    db,
    "SELECT min_attendance_percent FROM global_config ORDER BY config_id DESC LIMIT 1"
  );
  const threshold = config?.min_attendance_percent ?? 75;

  const logs = await selectRows<{ additional_topics_taught: string | null; subject_name: string }>(
    db,
    `
    SELECT ll.additional_topics_taught, sub.name AS subject_name
    FROM lecture_log ll
    JOIN timetable_slot ts ON ts.slot_id = ll.slot_id
    JOIN subject sub ON sub.subject_id = ts.subject_id
    WHERE ts.faculty_id = ?
    ORDER BY ll.execution_date ASC
    `,
    [facultyId]
  );

  const perStudent = new Map<string, { present: number; absent: number; subjects: Set<string> }>();

  for (const log of logs) {
    if (!log.additional_topics_taught) continue;
    try {
      const data = JSON.parse(log.additional_topics_taught) as { present?: string[]; absent?: string[] };
      const present = Array.isArray(data.present) ? data.present : [];
      const absent = Array.isArray(data.absent) ? data.absent : [];
      for (const uid of present) {
        const entry = perStudent.get(uid) ?? { present: 0, absent: 0, subjects: new Set<string>() };
        entry.present++;
        if (log.subject_name) entry.subjects.add(log.subject_name);
        perStudent.set(uid, entry);
      }
      for (const uid of absent) {
        const entry = perStudent.get(uid) ?? { present: 0, absent: 0, subjects: new Set<string>() };
        entry.absent++;
        if (log.subject_name) entry.subjects.add(log.subject_name);
        perStudent.set(uid, entry);
      }
    } catch {
      // ignore malformed JSON payloads
    }
  }

  const flags = [...perStudent.entries()].map(([studentUid, entry]) => {
    const total = entry.present + entry.absent;
    const percentage = total === 0 ? null : Math.round((entry.present / total) * 100);
    return {
      student_uid: studentUid,
      present: entry.present,
      absent: entry.absent,
      total_sessions: total,
      attendance_percent: percentage,
      threshold: threshold,
      flagged: percentage !== null && percentage < threshold,
      subjects: [...entry.subjects],
    };
  });

  return {
    threshold,
    total_logged_sessions: logs.length,
    flags: flags.sort((a, b) => (a.attendance_percent ?? 0) - (b.attendance_percent ?? 0)),
  };
}

// ── Question-level performance heatmap ─────────────────────────────
export async function getQuestionHeatmap(subjectId: number, examType = "MID") {
  const rows = await selectRows<Record<string, unknown>>(
    db,
    `
    SELECT
      qm.student_uid,
      s.email_id,
      qm.question_no,
      qm.max_marks,
      qm.marks
    FROM question_mark qm
    JOIN student s ON s.uid = qm.student_uid
    WHERE qm.subject_id = ? AND qm.exam_type = ?
    ORDER BY qm.question_no ASC, qm.student_uid ASC
    `,
    [subjectId, examType]
  );

  const byQuestion = new Map<number, { total: number; count: number; maxMarks: number }>();
  const students = new Map<string, { email: string; marks: Record<number, number> }>();

  for (const row of rows) {
    const questionNo = Number(row.question_no);
    const marks = Number(row.marks);
    const maxMarks = Number(row.max_marks);
    const uid = String(row.student_uid);

    const q = byQuestion.get(questionNo) ?? { total: 0, count: 0, maxMarks };
    q.total += marks;
    q.count++;
    byQuestion.set(questionNo, q);

    const student = students.get(uid) ?? { email: String(row.email_id ?? ""), marks: {} };
    student.marks[questionNo] = marks;
    students.set(uid, student);
  }

  const questions = [...byQuestion.entries()]
    .map(([questionNo, q]) => ({
      question_no: questionNo,
      max_marks: q.maxMarks,
      avg_marks: q.count ? Number((q.total / q.count).toFixed(2)) : null,
      percentage: q.maxMarks && q.count ? Number(((q.total / (q.maxMarks * q.count)) * 100).toFixed(1)) : null,
    }))
    .sort((a, b) => a.question_no - b.question_no);

  const weakQuestions = questions
    .filter((q) => q.percentage !== null && q.percentage < 50)
    .map((q) => q.question_no);

  return {
    subject_id: subjectId,
    exam_type: examType,
    questions,
    weak_questions: weakQuestions,
    students: [...students.entries()].map(([uid, student]) => ({ student_uid: uid, email_id: student.email, marks: student.marks })),
  };
}

// ── Enrolled students for a subject (Default-Present bulk toggle) ──
export async function getEnrolledStudents(subjectId: number) {
  return selectRows(
    db,
    `
    SELECT s.uid, s.email_id
    FROM student_subject_record ssr
    JOIN student s ON s.uid = ssr.student_uid
    WHERE ssr.subject_id = ?
    ORDER BY s.uid ASC
    `,
    [subjectId]
  );
}

export async function getSlotSubject(slotId: number) {
  return selectOne<{ subject_id: number; subject_name: string }>(
    db,
    `
    SELECT ts.subject_id, sub.name AS subject_name
    FROM timetable_slot ts
    JOIN subject sub ON sub.subject_id = ts.subject_id
    WHERE ts.slot_id = ?
    LIMIT 1
    `,
    [slotId]
  );
}
