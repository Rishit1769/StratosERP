import { db, parseJsonArray, run, selectOne, selectRows, type DbRow } from "@/lib/db";

export async function assignSubjectToFaculty(subjectId: number, facultyId: number) {
  await run(db, "UPDATE timetable_slot SET faculty_id = ? WHERE subject_id = ?", [facultyId, subjectId]);
}

export async function assignFacultyRole(facultyId: number, role: string) {
  const valid = ["Class Incharge", "Subject Incharge", "TG"];
  if (!valid.includes(role)) throw new Error("Invalid role designation.");
  await run(db, "UPDATE faculty SET designation_role = ? WHERE faculty_id = ?", [role, facultyId]);
}

export async function listFacultyByDepartment() {
  return selectRows(
    db,
    `
    SELECT faculty_id AS facultyId, name, email_id AS emailId, designation_role AS designationRole, is_hod AS isHod
    FROM faculty
    ORDER BY faculty_id ASC
    `
  );
}

export async function getBranchAnalytics() {
  const subjectRows = await selectRows<{ marks: number | null; status: string }>(
    db,
    `
    SELECT ssr.marks, ssr.status
    FROM student s
    LEFT JOIN student_subject_record ssr ON ssr.student_uid = s.uid
    WHERE s.academic_year <> 'Alumni'
    `
  );

  const semesterDistribution = await selectRows<{ current_semester: number; total: number }>(
    db,
    `
    SELECT current_semester, COUNT(*) AS total
    FROM student
    WHERE academic_year <> 'Alumni'
    GROUP BY current_semester
    ORDER BY current_semester ASC
    `
  );

  const marksValues = subjectRows.filter((row) => row.marks !== null).map((row) => Number(row.marks));
  const totalStudents =
    (await selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM student WHERE academic_year <> 'Alumni'"))
      ?.total ?? 0;

  return {
    summary: {
      total_students: totalStudents,
      avg_marks: marksValues.length ? marksValues.reduce((sum, value) => sum + value, 0) / marksValues.length : null,
      total_kt: subjectRows.filter((row) => row.status === "KT").length,
      total_suppli: subjectRows.filter((row) => row.status === "SUPPLI").length,
    },
    semester_distribution: semesterDistribution.map((row) => ({
      current_semester: row.current_semester,
      count: row.total,
    })),
  };
}

export async function getStudentDashboard(uid: string) {
  return selectRows(
    db,
    `
    SELECT
      ssr.student_uid,
      ssr.subject_id,
      ssr.status,
      ssr.marks,
      s.uid,
      s.email_id,
      s.current_semester,
      s.academic_year,
      sub.name AS subject_name,
      sub.semester_level,
      sub.has_lab
    FROM student_subject_record ssr
    JOIN student s ON s.uid = ssr.student_uid
    JOIN subject sub ON sub.subject_id = ssr.subject_id
    WHERE ssr.student_uid = ?
    ORDER BY sub.semester_level ASC, sub.name ASC
    `,
    [uid]
  );
}

export async function getAlumniData() {
  return selectRows(
    db,
    `
    SELECT uid, email_id AS emailId, academic_year AS academicYear
    FROM student
    WHERE academic_year = 'Alumni'
    ORDER BY uid ASC
    `
  );
}

export async function getEscalatedGrievances() {
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
    WHERE g.status = 'Escalated'
    ORDER BY g.created_at DESC
    `
  );
}

export async function resolveGrievance(ticketId: number) {
  await run(db, "UPDATE grievance_ticket SET status = 'Resolved' WHERE ticket_id = ?", [ticketId]);
}

export async function getLeaveSubstitutionLog() {
  return selectRows(
    db,
    `
    SELECT
      l.leave_id,
      l.absent_faculty_id,
      l.substitute_faculty_id,
      l.leave_date,
      l.type,
      absent.name AS absent_faculty_name,
      substitute.name AS substitute_faculty_name
    FROM leave_substitution l
    JOIN faculty absent ON absent.faculty_id = l.absent_faculty_id
    JOIN faculty substitute ON substitute.faculty_id = l.substitute_faculty_id
    ORDER BY l.leave_date DESC
    `
  );
}

export async function scheduleLeave(data: {
  absent_faculty_id: number;
  substitute_faculty_id: number;
  leave_date: string;
  type: string;
}) {
  const leaveDate = new Date(data.leave_date);
  const dayOfWeek = leaveDate.toLocaleDateString("en-US", { weekday: "long" });

  const conflicts = await selectRows(
    db,
    "SELECT slot_id FROM timetable_slot WHERE faculty_id = ? AND day_of_week = ?",
    [data.substitute_faculty_id, dayOfWeek]
  );

  if (conflicts.length) {
    throw new Error("Substitute faculty has a timetable conflict on the specified date.");
  }

  const result = await run(
    db,
    `
    INSERT INTO leave_substitution (absent_faculty_id, substitute_faculty_id, leave_date, type)
    VALUES (?, ?, ?, ?)
    `,
    [data.absent_faculty_id, data.substitute_faculty_id, data.leave_date, data.type]
  );
  return result.insertId;
}

export async function createBranchNotice(title: string, aiTags?: string[]) {
  const result = await run(
    db,
    "INSERT INTO notice_board (title, target_audience, ai_filter_tags) VALUES (?, 'BRANCH', ?)",
    [title, JSON.stringify(aiTags || [])]
  );
  return result.insertId;
}

export async function getBranchNotices() {
  const rows = await selectRows<DbRow>(
    db,
    `
    SELECT notice_id, title, target_audience, ai_filter_tags, created_at
    FROM notice_board
    WHERE target_audience = 'BRANCH'
    ORDER BY created_at DESC
    `
  );

  return rows.map((row) => ({
    ...row,
    ai_filter_tags: parseJsonArray(row.ai_filter_tags),
  }));
}

export async function getSubjectsList() {
  return selectRows(
    db,
    `
    SELECT subject_id AS subjectId, name, semester_level AS semesterLevel, has_lab AS hasLab
    FROM subject
    ORDER BY semester_level ASC, name ASC
    `
  );
}
