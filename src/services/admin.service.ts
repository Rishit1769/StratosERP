import bcrypt from "bcryptjs";
import { parse } from "csv-parse/sync";
import { db, parseJsonArray, run, selectOne, selectRows, withTransaction, type DbRow } from "@/lib/db";
import { type SemesterType } from "../types";

type AcademicYearBucket = "1st" | "2nd" | "3rd" | "4th";

const YEAR_ORDER: AcademicYearBucket[] = ["1st", "2nd", "3rd", "4th"];

const ODD_SEM_BY_YEAR: Record<AcademicYearBucket, number> = {
  "1st": 1,
  "2nd": 3,
  "3rd": 5,
  "4th": 7,
};

const EVEN_SEM_BY_YEAR: Record<AcademicYearBucket, number> = {
  "1st": 2,
  "2nd": 4,
  "3rd": 6,
  "4th": 8,
};

const NEXT_YEAR: Partial<Record<AcademicYearBucket, AcademicYearBucket>> = {
  "1st": "2nd",
  "2nd": "3rd",
  "3rd": "4th",
};

type StudentRow = DbRow & {
  uid: string;
  email_id: string;
  current_semester: number;
  academic_year: string;
};

function isYearBack(academicYear: string, currentSemester: number): boolean {
  if (academicYear === "1st") return ![1, 2].includes(currentSemester);
  if (academicYear === "2nd") return ![3, 4].includes(currentSemester);
  if (academicYear === "3rd") return ![5, 6].includes(currentSemester);
  if (academicYear === "4th") return ![7, 8].includes(currentSemester);
  return false;
}

export async function getGlobalConfig() {
  return selectOne(
    db,
    "SELECT config_id, active_semester_type, start_date, end_date FROM global_config ORDER BY config_id DESC LIMIT 1"
  );
}

export async function setGlobalConfig(semesterType: SemesterType, startDate: string, endDate: string) {
  return withTransaction(async (connection) => {
    await run(connection, "DELETE FROM global_config");
    const result = await run(
      connection,
      "INSERT INTO global_config (active_semester_type, start_date, end_date) VALUES (?, ?, ?)",
      [semesterType, startDate, endDate]
    );
    return result.insertId;
  });
}

export async function bulkIngestStudents(csvBuffer: Buffer): Promise<{ inserted: number; errors: string[] }> {
  const records = parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  let inserted = 0;
  const errors: string[] = [];
  const UID_REGEX = /^\d{4}-[A-Z]{2,3}-[A-Z]-\d{2}-\d{4}$/;

  for (const row of records) {
    const { uid, email_id, current_semester, academic_year, password } = row;
    if (!UID_REGEX.test(uid)) {
      errors.push(`Invalid UID format: ${uid}`);
      continue;
    }

    try {
      const hash = await bcrypt.hash(password || "Welcome@123", 12);
      await db.execute(
        `
        INSERT INTO student (uid, email_id, current_semester, academic_year, password_hash)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE uid = uid
        `,
        [uid, email_id, Number(current_semester), academic_year, hash]
      );
      inserted++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Row ${uid}: ${message}`);
    }
  }

  return { inserted, errors };
}

export async function bulkIngestFaculty(csvBuffer: Buffer): Promise<{ inserted: number; errors: string[] }> {
  const records = parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  let inserted = 0;
  const errors: string[] = [];

  for (const row of records) {
    const { name, email_id, designation_role, is_hod, password } = row;

    try {
      const hash = await bcrypt.hash(password || "Faculty@123", 12);
      await db.execute(
        `
        INSERT INTO faculty (name, email_id, designation_role, is_hod, password_hash)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE email_id = email_id
        `,
        [name, email_id, designation_role, is_hod === "true" ? 1 : 0, hash]
      );
      inserted++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Row ${email_id}: ${message}`);
    }
  }

  return { inserted, errors };
}

export async function bulkIngestSubjects(csvBuffer: Buffer): Promise<{ inserted: number; errors: string[] }> {
  const records = parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  let inserted = 0;
  const errors: string[] = [];

  for (const row of records) {
    const { name, semester_level, has_lab, lab_marks_weight } = row;

    try {
      await db.execute(
        "INSERT INTO subject (name, semester_level, has_lab, lab_marks_weight) VALUES (?, ?, ?, ?)",
        [name, Number(semester_level), has_lab === "true" ? 1 : 0, lab_marks_weight ? Number(lab_marks_weight) : null]
      );
      inserted++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Row ${name}: ${message}`);
    }
  }

  return { inserted, errors };
}

export async function bulkIngestTimetable(csvBuffer: Buffer): Promise<{ inserted: number; errors: string[] }> {
  const records = parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  let inserted = 0;
  const errors: string[] = [];

  for (const row of records) {
    const { day_of_week, start_time, end_time, subject_id, faculty_id } = row;

    try {
      await db.execute(
        "INSERT INTO timetable_slot (day_of_week, start_time, end_time, subject_id, faculty_id) VALUES (?, ?, ?, ?, ?)",
        [day_of_week, start_time, end_time, Number(subject_id), Number(faculty_id)]
      );
      inserted++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Row: ${message}`);
    }
  }

  return { inserted, errors };
}

export async function triggerBatchProgression(): Promise<{ progressed: number; alumniTransitions: number }> {
  return withTransaction(async (connection) => {
    const blockedRows = await selectRows<{ student_uid: string }>(
      connection,
      `
      SELECT DISTINCT student_uid
      FROM student_subject_record
      WHERE status IN ('KT', 'SUPPLI')
      `
    );
    const blockedUids = new Set(blockedRows.map((row) => row.student_uid));

    const students = await selectRows<StudentRow>(
      connection,
      `
      SELECT uid, email_id, current_semester, academic_year
      FROM student
      WHERE academic_year <> 'Alumni'
      ORDER BY uid ASC
      `
    );

    let progressed = 0;
    let alumniTransitions = 0;

    for (const student of students) {
      if (blockedUids.has(student.uid)) continue;

      const newSemester = student.current_semester + 1;
      if (newSemester > 8) {
        await run(
          connection,
          "UPDATE student SET academic_year = 'Alumni', current_semester = 8 WHERE uid = ?",
          [student.uid]
        );
        alumniTransitions++;
      } else {
        const newYear =
          newSemester <= 2 ? "1st" : newSemester <= 4 ? "2nd" : newSemester <= 6 ? "3rd" : "4th";
        await run(
          connection,
          "UPDATE student SET current_semester = ?, academic_year = ? WHERE uid = ?",
          [newSemester, newYear, student.uid]
        );
        progressed++;
      }
    }

    return { progressed, alumniTransitions };
  });
}

export async function getSemesterProgressionOverview() {
  const config = await getGlobalConfig();
  const activeSemesterType = (config?.active_semester_type as SemesterType) || "ODD";

  const students = await selectRows<StudentRow>(db, `
    SELECT uid, email_id, current_semester, academic_year
    FROM student
    WHERE academic_year IN ('1st', '2nd', '3rd', '4th')
  `);

  const backlogRows = await selectRows<{ student_uid: string; backlog_count: number }>(
    db,
    `
    SELECT student_uid, COUNT(*) AS backlog_count
    FROM student_subject_record
    WHERE status IN ('KT', 'SUPPLI')
    GROUP BY student_uid
    `
  );

  const backlogMap = new Map(backlogRows.map((row) => [row.student_uid, row.backlog_count]));

  const years = YEAR_ORDER.map((year) => {
    const oddSemester = ODD_SEM_BY_YEAR[year];
    const evenSemester = EVEN_SEM_BY_YEAR[year];

    const yearStudents = students.filter((student) => student.academic_year === year);
    const oddStudents = yearStudents.filter((student) => student.current_semester === oddSemester);
    const evenStudents = yearStudents.filter((student) => student.current_semester === evenSemester);

    const oddBlocked = oddStudents.filter((student) => (backlogMap.get(student.uid) ?? 0) > 0).length;
    const evenBlocked = evenStudents.filter((student) => (backlogMap.get(student.uid) ?? 0) > 0).length;
    const yearBackCount = yearStudents.filter((student) => isYearBack(student.academic_year, student.current_semester)).length;

    let nextActionLabel = "Promote to Even Semester";
    if (activeSemesterType === "EVEN") {
      nextActionLabel = year === "4th" ? "Move to Alumni" : "Promote to Next Year";
    }

    return {
      academic_year: year,
      odd_semester: oddSemester,
      even_semester: evenSemester,
      odd_strength: oddStudents.length,
      even_strength: evenStudents.length,
      odd_blocked: oddBlocked,
      even_blocked: evenBlocked,
      year_back_count: yearBackCount,
      next_action_label: nextActionLabel,
    };
  });

  return { active_semester_type: activeSemesterType, years };
}

export async function promoteAcademicYear(
  academicYear: AcademicYearBucket,
  semesterType: SemesterType
): Promise<{
  academic_year: AcademicYearBucket;
  semester_type: SemesterType;
  targeted_semester: number;
  progressed: number;
  alumniTransitions: number;
  blockedSkipped: number;
  yearBackSkipped: number;
}> {
  const targetedSemester = semesterType === "ODD" ? ODD_SEM_BY_YEAR[academicYear] : EVEN_SEM_BY_YEAR[academicYear];

  return withTransaction(async (connection) => {
    const targetStudents = await selectRows<StudentRow>(
      connection,
      `
      SELECT uid, email_id, current_semester, academic_year
      FROM student
      WHERE academic_year = ? AND academic_year <> 'Alumni'
      ORDER BY uid ASC
      `,
      [academicYear]
    );

    const backlogRows = await selectRows<{ student_uid: string; backlog_count: number }>(
      connection,
      `
      SELECT student_uid, COUNT(*) AS backlog_count
      FROM student_subject_record
      WHERE student_uid IN (${targetStudents.map(() => "?").join(",") || "''"})
        AND status IN ('KT', 'SUPPLI')
      GROUP BY student_uid
      `,
      targetStudents.map((student) => student.uid)
    );
    const backlogMap = new Map(backlogRows.map((row) => [row.student_uid, row.backlog_count]));

    const inTargetSemester = targetStudents.filter((student) => student.current_semester === targetedSemester);
    const blockedSkipped = inTargetSemester.filter((student) => (backlogMap.get(student.uid) ?? 0) > 0).length;
    const eligible = inTargetSemester.filter((student) => (backlogMap.get(student.uid) ?? 0) === 0);
    const yearBackSkipped = targetStudents.filter((student) => student.current_semester !== targetedSemester).length;

    let progressed = 0;
    let alumniTransitions = 0;

    for (const student of eligible) {
      if (semesterType === "ODD") {
        await run(connection, "UPDATE student SET current_semester = current_semester + 1 WHERE uid = ?", [student.uid]);
        progressed++;
        continue;
      }

      if (student.current_semester === 8) {
        await run(connection, "UPDATE student SET academic_year = 'Alumni', current_semester = 8 WHERE uid = ?", [
          student.uid,
        ]);
        alumniTransitions++;
        continue;
      }

      const nextYear = NEXT_YEAR[academicYear];
      if (!nextYear) continue;

      await run(
        connection,
        "UPDATE student SET current_semester = current_semester + 1, academic_year = ? WHERE uid = ?",
        [nextYear, student.uid]
      );
      progressed++;
    }

    return {
      academic_year: academicYear,
      semester_type: semesterType,
      targeted_semester: targetedSemester,
      progressed,
      alumniTransitions,
      blockedSkipped,
      yearBackSkipped,
    };
  });
}

export interface ClassroomCapacity {
  room: string;
  capacity: number;
}

export async function generateExamSeating(classrooms: ClassroomCapacity[]): Promise<Record<string, unknown>[]> {
  const students = await selectRows<StudentRow>(
    db,
    `
    SELECT uid, email_id, current_semester, academic_year
    FROM student
    WHERE academic_year <> 'Alumni'
    ORDER BY current_semester ASC, uid ASC
    `
  );

  const seating: Record<string, unknown>[] = [];
  let studentIdx = 0;

  for (const room of classrooms) {
    const roomStudents = students.slice(studentIdx, studentIdx + room.capacity);
    for (let seat = 0; seat < roomStudents.length; seat++) {
      seating.push({
        room: room.room,
        seat_number: seat + 1,
        student_uid: roomStudents[seat].uid,
        semester: roomStudents[seat].current_semester,
      });
    }
    studentIdx += room.capacity;
    if (studentIdx >= students.length) break;
  }

  return seating;
}

export async function generateInvigilationMatrix(examDate: string): Promise<Record<string, unknown>[]> {
  const faculty = await selectRows<{ faculty_id: number; name: string }>(
    db,
    `
    SELECT f.faculty_id, f.name
    FROM faculty f
    LEFT JOIN leave_substitution l
      ON l.absent_faculty_id = f.faculty_id AND l.leave_date = ?
    WHERE l.leave_id IS NULL
    ORDER BY f.faculty_id ASC
    `,
    [examDate]
  );

  return faculty.map((row, index) => ({
    faculty_id: row.faculty_id,
    name: row.name,
    duty_slot: `Slot ${(index % 3) + 1}`,
    exam_date: examDate,
  }));
}

export async function getMacroAnalytics() {
  const [totalStudents, totalFaculty, totalSubjects, ktCount, suppliCount, alumniCount, config] = await Promise.all([
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM student"),
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM faculty"),
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM subject"),
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM student_subject_record WHERE status = 'KT'"),
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM student_subject_record WHERE status = 'SUPPLI'"),
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM student WHERE academic_year = 'Alumni'"),
    getGlobalConfig(),
  ]);

  return {
    total_students: totalStudents?.total ?? 0,
    total_faculty: totalFaculty?.total ?? 0,
    total_subjects: totalSubjects?.total ?? 0,
    kt_records: ktCount?.total ?? 0,
    suppli_records: suppliCount?.total ?? 0,
    alumni_count: alumniCount?.total ?? 0,
    global_config: config,
  };
}

export async function createFaculty(data: {
  name: string;
  email_id: string;
  designation_role: string;
  is_hod?: boolean;
  password: string;
}) {
  const hash = await bcrypt.hash(data.password, 12);
  const result = await run(
    db,
    `
    INSERT INTO faculty (name, email_id, designation_role, is_hod, password_hash)
    VALUES (?, ?, ?, ?, ?)
    `,
    [data.name, data.email_id, data.designation_role, data.is_hod ? 1 : 0, hash]
  );
  return result.insertId;
}

export async function listAllFaculty() {
  return selectRows(
    db,
    `
    SELECT faculty_id AS facultyId, name, email_id AS emailId, designation_role AS designationRole, is_hod AS isHod
    FROM faculty
    ORDER BY faculty_id ASC
    `
  );
}

export async function listAllStudents(page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  const [students, total] = await Promise.all([
    selectRows(
      db,
      `
      SELECT uid, email_id AS emailId, current_semester AS currentSemester, academic_year AS academicYear
      FROM student
      ORDER BY uid ASC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    ),
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM student"),
  ]);

  return { students, total: total?.total ?? 0, page, limit };
}

export async function getAlumniRecords() {
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

export async function createNotice(data: { title: string; target_audience: string; ai_filter_tags?: string[] }) {
  const result = await run(
    db,
    "INSERT INTO notice_board (title, target_audience, ai_filter_tags) VALUES (?, ?, ?)",
    [data.title, data.target_audience, JSON.stringify(data.ai_filter_tags || [])]
  );
  return result.insertId;
}

export async function listNotices(audience?: string) {
  const rows = await selectRows<DbRow>(
    db,
    `
    SELECT notice_id, title, target_audience, ai_filter_tags, created_at
    FROM notice_board
    ${audience ? "WHERE target_audience = ?" : ""}
    ORDER BY created_at DESC
    `,
    audience ? [audience] : []
  );

  return rows.map((row) => ({
    ...row,
    ai_filter_tags: parseJsonArray(row.ai_filter_tags),
  }));
}
