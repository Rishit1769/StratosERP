import { NextRequest } from "next/server";
import { authorizeRequest, verifyRequestUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import type { Role, SemesterType } from "@/types";
import * as authService from "@/services/auth.service";
import * as adminService from "@/services/admin.service";
import * as hodService from "@/services/hod.service";
import * as classInchargeService from "@/services/classIncharge.service";
import * as studentService from "@/services/student.service";
import * as subjectInchargeService from "@/services/subjectIncharge.service";
import * as teacherGuardianService from "@/services/teacherGuardian.service";
import * as practicalTeacherService from "@/services/practicalTeacher.service";
import * as geminiService from "@/services/gemini.service";
import * as minioService from "@/services/minio.service";

type JsonBody = Record<string, unknown>;
type ProgressionYear = "1st" | "2nd" | "3rd" | "4th";

async function readJsonBody(request: NextRequest): Promise<JsonBody> {
  try {
    return (await request.json()) as JsonBody;
  } catch {
    return {};
  }
}

function requireUser(request: NextRequest) {
  const user = verifyRequestUser(request);
  if (!user) {
    return { error: jsonError("No token provided.", 401) } as const;
  }
  return { user } as const;
}

function requireAuthorizedUser(request: NextRequest, roles: Role[], requireContext = false) {
  const userResult = requireUser(request);
  if ("error" in userResult) {
    return userResult;
  }

  const authorization = authorizeRequest(request, userResult.user, roles, requireContext);
  if (!authorization.ok) {
    return { error: jsonError(authorization.message, authorization.status) } as const;
  }

  return { user: authorization.user } as const;
}

function normalizeAudience(value?: string | null) {
  return value?.trim() || undefined;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function readAttendanceList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    const record = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
    return {
      student_uid: readString(record.student_uid),
      status: readString(record.status),
    };
  });
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function isSemesterType(value: unknown): value is SemesterType {
  return value === "ODD" || value === "EVEN";
}

function isProgressionYear(value: unknown): value is ProgressionYear {
  return value === "1st" || value === "2nd" || value === "3rd" || value === "4th";
}

function isPresignedAction(value: unknown): value is "upload" | "download" {
  return value === "upload" || value === "download";
}

async function handleAuth(request: NextRequest, slug: string[]) {
  const [, action, role] = slug;

  if (request.method === "POST" && action === "login" && role) {
    const body = await readJsonBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return jsonError("Validation failed", 400, [
        { msg: "A valid email and password are required." },
      ]);
    }

    const allowedDomains = ["@tcetmumbai.in", "@stratos.erp"];
    if (!allowedDomains.some((domain) => email.endsWith(domain))) {
      return jsonError(
        `Only ${allowedDomains.join(" or ")} email addresses are allowed.`,
        400
      );
    }

    const result =
      role === "admin"
        ? await authService.loginAdmin(email, password)
        : role === "faculty"
          ? await authService.loginFaculty(email, password)
          : role === "student"
            ? await authService.loginStudent(email, password)
            : null;

    if (!result) {
      return jsonError("Invalid credentials.", 401);
    }

    return jsonSuccess(result, undefined, "Login successful.");
  }

  if (action === "me" && request.method === "GET") {
    const auth = requireUser(request);
    if ("error" in auth) return auth.error;
    return jsonSuccess(auth.user);
  }

  if (action === "change-password" && request.method === "PUT") {
    const auth = requireUser(request);
    if ("error" in auth) return auth.error;

    const body = await readJsonBody(request);
    if (!body.oldPassword || !body.newPassword || String(body.newPassword).length < 8) {
      return jsonError("New password must be at least 8 characters.");
    }

    const changed = await authService.changePassword(
      auth.user.id,
      auth.user.designations,
      String(body.oldPassword),
      String(body.newPassword)
    );

    if (!changed) {
      return jsonError("Old password is incorrect.");
    }

    return jsonSuccess(undefined, undefined, "Password updated successfully.");
  }

  return jsonError("Route not found.", 404);
}

async function handleAdmin(request: NextRequest, slug: string[]) {
  const auth = requireAuthorizedUser(request, ["Admin"]);
  if ("error" in auth) return auth.error;

  const tail = slug.slice(1);

  if (tail[0] === "config") {
    if (request.method === "GET") {
      return jsonSuccess(await adminService.getGlobalConfig());
    }

    if (request.method === "POST") {
      const body = await readJsonBody(request);
      const semType = body.active_semester_type || body.semester_type;
      const startDate = readString(body.start_date);
      const endDate = readString(body.end_date);

      if (!isSemesterType(semType) || !startDate || !endDate) {
        return jsonError("active_semester_type, start_date, and end_date are required.");
      }
      const configId = await adminService.setGlobalConfig(
        semType,
        startDate,
        endDate
      );
      return jsonSuccess({ config_id: configId }, { status: 201 }, "Global config set.");
    }
  }

  if (tail[0] === "ingest" && request.method === "POST" && tail[1]) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("CSV file required.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result =
      tail[1] === "students"
        ? await adminService.bulkIngestStudents(buffer)
        : tail[1] === "faculty"
          ? await adminService.bulkIngestFaculty(buffer)
          : tail[1] === "subjects"
            ? await adminService.bulkIngestSubjects(buffer)
            : tail[1] === "timetable"
              ? await adminService.bulkIngestTimetable(buffer)
              : null;

    if (!result) {
      return jsonError("Route not found.", 404);
    }

    return jsonSuccess(result, undefined, `Ingestion completed for ${tail[1]}.`);
  }

  if (tail[0] === "batch-progression") {
    if (request.method === "POST" && tail.length === 1) {
      return jsonSuccess(
        await adminService.triggerBatchProgression(),
        undefined,
        "Batch progression triggered."
      );
    }

    if (request.method === "GET" && tail[1] === "status") {
      return jsonSuccess(await adminService.getSemesterProgressionOverview());
    }

    if (request.method === "POST" && tail[1] === "promote-year") {
      const body = await readJsonBody(request);
      if (!isProgressionYear(body.academic_year) || !isSemesterType(body.semester_type)) {
        return jsonError("academic_year and semester_type are required.");
      }
      return jsonSuccess(
        await adminService.promoteAcademicYear(body.academic_year, body.semester_type),
        undefined,
        "Academic year progression completed."
      );
    }
  }

  if (tail[0] === "exam-seating" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (!Array.isArray(body.classrooms) || body.classrooms.length === 0) {
      return jsonError("classrooms array is required.");
    }
    return jsonSuccess(await adminService.generateExamSeating(body.classrooms));
  }

  if (tail[0] === "invigilation-matrix" && request.method === "POST") {
    const body = await readJsonBody(request);
    const examDate = readString(body.exam_date);
    if (!examDate) {
      return jsonError("exam_date is required.");
    }
    return jsonSuccess(await adminService.generateInvigilationMatrix(examDate));
  }

  if (tail[0] === "analytics" && request.method === "GET") {
    return jsonSuccess(await adminService.getMacroAnalytics());
  }

  if (tail[0] === "faculty") {
    if (request.method === "GET" && tail.length === 1) {
      return jsonSuccess(await adminService.listAllFaculty());
    }
    if (request.method === "POST" && tail.length === 1) {
      const body = await readJsonBody(request);
      if (!body.name || !body.email_id || !body.designation_role || !body.password) {
        return jsonError("name, email_id, designation_role, password are required.");
      }
      const facultyId = await adminService.createFaculty(body as {
        name: string;
        email_id: string;
        designation_role: string;
        is_hod?: boolean;
        password: string;
      });
      return jsonSuccess({ faculty_id: facultyId }, { status: 201 }, "Faculty created.");
    }
  }

  if (tail[0] === "students" && request.method === "GET") {
    const page = Number(request.nextUrl.searchParams.get("page") || "1");
    const limit = Number(request.nextUrl.searchParams.get("limit") || "50");
    return jsonSuccess(await adminService.listAllStudents(page, limit));
  }

  if (tail[0] === "alumni" && request.method === "GET") {
    return jsonSuccess(await adminService.getAlumniRecords());
  }

  if (tail[0] === "notices") {
    if (request.method === "GET") {
      return jsonSuccess(
        await adminService.listNotices(normalizeAudience(request.nextUrl.searchParams.get("audience")))
      );
    }

    if (request.method === "POST" && tail.length === 1) {
      const body = await readJsonBody(request);
      const title = readString(body.title);
      const targetAudience = readString(body.target_audience);
      if (!title || !targetAudience) {
        return jsonError("title and target_audience are required.");
      }
      const noticeId = await adminService.createNotice(body as {
        title: string;
        target_audience: string;
        ai_filter_tags?: string[];
      });
      return jsonSuccess({ notice_id: noticeId }, { status: 201 }, "Notice created.");
    }

    if (request.method === "POST" && tail[1] === "ai") {
      const body = await readJsonBody(request);
      const context = readString(body.context);
      if (!context) {
        return jsonError("context is required for AI notice generation.");
      }
      const noticeData = await geminiService.generateInstitutionalNotice(context);
      const noticeId = await adminService.createNotice({
        title: noticeData.title,
        target_audience: readString(body.target_audience) || "INSTITUTE",
        ai_filter_tags: noticeData.tags,
      });
      return jsonSuccess(
        { notice_id: noticeId, ...noticeData },
        { status: 201 },
        "AI notice generated and saved."
      );
    }
  }

  return jsonError("Route not found.", 404);
}

async function handleHod(request: NextRequest, slug: string[]) {
  const auth = requireAuthorizedUser(request, ["HOD"]);
  if ("error" in auth) return auth.error;
  const tail = slug.slice(1);

  if (tail[0] === "analytics" && request.method === "GET") {
    return jsonSuccess(await hodService.getBranchAnalytics());
  }
  if (tail[0] === "faculty" && request.method === "GET" && tail.length === 1) {
    return jsonSuccess(await hodService.listFacultyByDepartment());
  }
  if (tail[0] === "faculty" && tail[1] === "assign-subject" && request.method === "POST") {
    const body = await readJsonBody(request);
    await hodService.assignSubjectToFaculty(readNumber(body.subject_id), readNumber(body.faculty_id));
    return jsonSuccess(undefined, undefined, "Subject assigned.");
  }
  if (tail[0] === "faculty" && tail[1] === "assign-role" && request.method === "POST") {
    const body = await readJsonBody(request);
    await hodService.assignFacultyRole(readNumber(body.faculty_id), readString(body.role));
    return jsonSuccess(undefined, undefined, "Faculty role assigned.");
  }
  if (tail[0] === "students" && tail[1] && request.method === "GET") {
    return jsonSuccess(await hodService.getStudentDashboard(tail[1]));
  }
  if (tail[0] === "alumni" && request.method === "GET") {
    return jsonSuccess(await hodService.getAlumniData());
  }
  if (tail[0] === "grievances" && tail[1] === "escalated" && request.method === "GET") {
    return jsonSuccess(await hodService.getEscalatedGrievances());
  }
  if (tail[0] === "grievances" && tail[2] === "resolve" && request.method === "PUT") {
    await hodService.resolveGrievance(Number(tail[1]));
    return jsonSuccess(undefined, undefined, "Grievance resolved.");
  }
  if (tail[0] === "leave" && request.method === "GET") {
    return jsonSuccess(await hodService.getLeaveSubstitutionLog());
  }
  if (tail[0] === "leave" && request.method === "POST") {
    const body = await readJsonBody(request);
    const leaveId = await hodService.scheduleLeave(body as {
      absent_faculty_id: number;
      substitute_faculty_id: number;
      leave_date: string;
      type: string;
    });
    return jsonSuccess({ leave_id: leaveId }, { status: 201 }, "Leave substitution scheduled.");
  }
  if (tail[0] === "notices" && request.method === "GET") {
    return jsonSuccess(await hodService.getBranchNotices());
  }
  if (tail[0] === "notices" && request.method === "POST" && tail.length === 1) {
    const body = await readJsonBody(request);
    const noticeId = await hodService.createBranchNotice(
      readString(body.title),
      Array.isArray(body.ai_filter_tags) ? body.ai_filter_tags.map((tag) => String(tag)) : undefined
    );
    return jsonSuccess({ notice_id: noticeId }, { status: 201 }, "Branch notice created.");
  }
  if (tail[0] === "notices" && tail[1] === "ai" && request.method === "POST") {
    const body = await readJsonBody(request);
    const noticeData = await geminiService.generateInstitutionalNotice(readString(body.context));
    const noticeId = await hodService.createBranchNotice(noticeData.title, noticeData.tags);
    return jsonSuccess({ notice_id: noticeId, ...noticeData }, { status: 201 }, "AI branch notice generated.");
  }
  if (tail[0] === "subjects" && request.method === "GET") {
    return jsonSuccess(await hodService.getSubjectsList());
  }

  return jsonError("Route not found.", 404);
}

async function handleClassIncharge(request: NextRequest, slug: string[]) {
  const auth = requireAuthorizedUser(request, ["ClassIncharge"]);
  if ("error" in auth) return auth.error;
  const tail = slug.slice(1);

  if (tail[0] === "analytics" && request.method === "GET") {
    return jsonSuccess(await classInchargeService.getClassAnalytics());
  }
  if (tail[0] === "students" && tail[1] === "at-risk" && request.method === "GET") {
    return jsonSuccess(await classInchargeService.getAtRiskStudents());
  }
  if (tail[0] === "students" && tail.length === 1 && request.method === "GET") {
    return jsonSuccess(await classInchargeService.getAllStudents());
  }
  if (tail[0] === "students" && tail[2] === "portfolio" && request.method === "GET") {
    return jsonSuccess(await classInchargeService.getStudentPortfolio(tail[1]));
  }
  if (tail[0] === "students" && tail[2] === "ptm-report" && request.method === "GET") {
    const portfolio = await classInchargeService.getStudentPortfolio(tail[1]);
    if (!portfolio) return jsonError("Student not found.", 404);
    const report = await geminiService.generatePTMReport(portfolio);
    return jsonSuccess({ report });
  }
  if (tail[0] === "notices" && request.method === "GET") {
    return jsonSuccess(await classInchargeService.getNoticesForClass());
  }
  if (tail[0] === "notices" && request.method === "POST") {
    const body = await readJsonBody(request);
    const noticeId = await classInchargeService.createClassNotice(
      readString(body.title),
      Array.isArray(body.ai_filter_tags) ? body.ai_filter_tags.map((tag) => String(tag)) : undefined
    );
    return jsonSuccess({ notice_id: noticeId }, { status: 201 }, "Class notice created.");
  }
  if (tail[0] === "progression-readiness" && request.method === "GET") {
    return jsonSuccess(await classInchargeService.getProgressionReadiness());
  }

  return jsonError("Route not found.", 404);
}

async function handleSubjectIncharge(request: NextRequest, slug: string[]) {
  const auth = requireAuthorizedUser(request, ["SubjectIncharge"]);
  if ("error" in auth) return auth.error;
  const tail = slug.slice(1);

  if (tail[0] === "subjects" && request.method === "GET") {
    return jsonSuccess(await subjectInchargeService.getFacultySubjects(Number(auth.user.id)));
  }
  if (tail[0] === "slot" && tail[1] === "active" && request.method === "GET") {
    const slot = await subjectInchargeService.getActiveSlot(Number(auth.user.id));
    return slot ? jsonSuccess(slot) : jsonError("No active slot for current time.", 404);
  }
  if (tail[0] === "attendance" && request.method === "POST") {
    const body = await readJsonBody(request);
    await subjectInchargeService.markAttendance(
      readNumber(body.slot_id),
      readString(body.date),
      readStringArray(body.present_uids),
      readStringArray(body.absent_uids)
    );
    return jsonSuccess(undefined, undefined, "Attendance marked.");
  }
  if (tail[0] === "attendance" && tail[1] && request.method === "GET") {
    return jsonSuccess(
      await subjectInchargeService.getAttendanceForSlot(
        Number(tail[1]),
        String(request.nextUrl.searchParams.get("date") || "")
      )
    );
  }
  if (tail[0] === "marks" && request.method === "POST" && tail.length === 1) {
    const body = await readJsonBody(request);
    await subjectInchargeService.upsertMarks(
      readString(body.student_uid),
      readNumber(body.subject_id),
      readNumber(body.marks)
    );
    return jsonSuccess(undefined, undefined, "Marks saved.");
  }
  if (tail[0] === "marks" && tail[1] === "suppli" && request.method === "POST") {
    const body = await readJsonBody(request);
    await subjectInchargeService.upsertSuppliMarks(
      readString(body.student_uid),
      readNumber(body.subject_id),
      readNumber(body.marks)
    );
    return jsonSuccess(undefined, undefined, "Supplementary marks saved.");
  }
  if (tail[0] === "marks" && tail[1] && request.method === "GET") {
    return jsonSuccess(await subjectInchargeService.getSubjectMarks(Number(tail[1])));
  }
  if (tail[0] === "analytics" && tail[1] && request.method === "GET") {
    return jsonSuccess(await subjectInchargeService.getSubjectAnalytics(Number(tail[1])));
  }
  if (tail[0] === "lecture-log" && request.method === "POST") {
    const body = await readJsonBody(request);
    await subjectInchargeService.logLecture(body as {
      slot_id: number;
      syllabus_topics_taught: string;
      additional_topics_taught?: string;
      execution_date: string;
    });
    return jsonSuccess(undefined, undefined, "Lecture logged.");
  }
  if (tail[0] === "lecture-logs" && tail[1] && request.method === "GET") {
    return jsonSuccess(await subjectInchargeService.getLectureLogs(Number(tail[1])));
  }
  if (tail[0] === "materials" && request.method === "POST") {
    const body = await readJsonBody(request);
    return jsonSuccess(
      {
        subject_id: readNumber(body.subject_id),
        object_name: readString(body.fileKey),
        file_name: readString(body.fileName),
        file_type: readString(body.fileType),
        bucket_name: readString(body.bucketName) || "study-materials",
      },
      { status: 201 },
      "Material upload registered."
    );
  }
  if (tail[0] === "syllabus-analysis" && request.method === "POST") {
    const body = await readJsonBody(request);
    return jsonSuccess(
      await geminiService.analyzeSyllabusPacing(
        readString(body.lecture_logs_summary),
        readString(body.syllabus_pdf_url)
      )
    );
  }

  return jsonError("Route not found.", 404);
}

async function handlePracticalTeacher(request: NextRequest, slug: string[]) {
  const auth = requireAuthorizedUser(request, ["PracticalTeacher", "SubjectIncharge"]);
  if ("error" in auth) return auth.error;
  const tail = slug.slice(1);
  const facultyId = Number(auth.user.id);

  if (tail[0] === "sessions" && request.method === "GET" && tail.length === 1) {
    return jsonSuccess(await practicalTeacherService.getAssignedSessions(facultyId));
  }
  if (tail[0] === "sessions" && request.method === "POST" && tail.length === 1) {
    const body = await readJsonBody(request);
    const sessionId = await practicalTeacherService.createLabSession({
      ...body,
      assigned_faculty_id: facultyId,
    } as {
      subject_id: number;
      batch_id: number;
      session_date: string;
      assigned_faculty_id: number;
    });
    return jsonSuccess({ session_id: sessionId }, { status: 201 }, "Lab session created.");
  }
  if (tail[0] === "sessions" && tail[2] === "attendance" && request.method === "POST") {
    const body = await readJsonBody(request);
    await practicalTeacherService.markLabAttendance(
      Number(tail[1]),
      facultyId,
      readAttendanceList(body.attendance)
    );
    return jsonSuccess(undefined, undefined, "Lab attendance saved.");
  }
  if (tail[0] === "sessions" && tail[2] === "attendance" && request.method === "GET") {
    return jsonSuccess(await practicalTeacherService.getLabAttendance(Number(tail[1])));
  }
  if (tail[0] === "sessions" && tail[2] === "marks" && request.method === "POST") {
    const body = await readJsonBody(request);
    await practicalTeacherService.upsertLabMarks({
      ...body,
      faculty_id: facultyId,
    } as {
      student_uid: string;
      subject_id: number;
      experiment_id: number;
      session_id: number;
      viva_marks: number;
      execution_marks: number;
      journal_marks: number;
      remarks?: string;
      faculty_id: number;
    });
    return jsonSuccess(undefined, undefined, "Practical marks saved.");
  }
  if (tail[0] === "sessions" && tail[2] === "marks" && request.method === "GET") {
    return jsonSuccess(await practicalTeacherService.getLabMarksBySession(Number(tail[1])));
  }
  if (tail[0] === "sessions" && tail[2] === "complete" && request.method === "PUT") {
    await practicalTeacherService.completeSession(Number(tail[1]), facultyId);
    return jsonSuccess(undefined, undefined, "Session completed.");
  }
  if (tail[0] === "sessions" && tail[2] === "lock" && request.method === "PUT") {
    await practicalTeacherService.lockSession(Number(tail[1]), facultyId);
    return jsonSuccess(undefined, undefined, "Session locked.");
  }
  if (tail[0] === "experiments" && request.method === "GET" && tail[1]) {
    return jsonSuccess(await practicalTeacherService.getExperiments(Number(tail[1])));
  }
  if (tail[0] === "experiments" && request.method === "POST") {
    const experimentId = await practicalTeacherService.createExperiment((await readJsonBody(request)) as {
      subject_id: number;
      experiment_no: number;
      title: string;
      max_marks: number;
    });
    return jsonSuccess({ experiment_id: experimentId }, { status: 201 }, "Experiment created.");
  }
  if (tail[0] === "batches" && request.method === "GET" && tail[1]) {
    return jsonSuccess(await practicalTeacherService.getLabBatches(Number(tail[1])));
  }
  if (tail[0] === "batches" && request.method === "POST") {
    const batchId = await practicalTeacherService.createLabBatch((await readJsonBody(request)) as {
      subject_id: number;
      batch_name: string;
      faculty_id: number;
    });
    return jsonSuccess({ batch_id: batchId }, { status: 201 }, "Batch created.");
  }
  if (tail[0] === "submissions" && request.method === "GET" && tail[1]) {
    return jsonSuccess(await practicalTeacherService.getSubmissions(Number(tail[1])));
  }
  if (tail[0] === "submissions" && request.method === "POST") {
    await practicalTeacherService.upsertSubmission((await readJsonBody(request)) as {
      student_uid: string;
      experiment_id: number;
      file_url?: string;
      status: string;
    });
    return jsonSuccess(undefined, undefined, "Submission saved.");
  }

  return jsonError("Route not found.", 404);
}

async function handleTeacherGuardian(request: NextRequest, slug: string[]) {
  const auth = requireAuthorizedUser(request, ["TG"]);
  if ("error" in auth) return auth.error;
  const tail = slug.slice(1);
  const facultyId = Number(auth.user.id);

  if (tail[0] === "mentees" && request.method === "GET" && tail.length === 1) {
    return jsonSuccess(await teacherGuardianService.getMentees(facultyId));
  }
  if (tail[0] === "mentees" && request.method === "GET" && tail.length === 2) {
    return jsonSuccess(await teacherGuardianService.getMenteePortfolio(facultyId, tail[1]));
  }
  if (tail[0] === "mentees" && tail[2] === "improvement-report" && request.method === "GET") {
    const portfolio = await teacherGuardianService.getMenteePortfolio(facultyId, tail[1]);
    return jsonSuccess({ report: await geminiService.generateAreasOfImprovement(portfolio) });
  }
  if (tail[0] === "aicte-points" && request.method === "POST") {
    const body = await readJsonBody(request);
    const recordId = await teacherGuardianService.awardAICTEPoints({
      ...body,
      faculty_id: facultyId,
    } as {
      student_uid: string;
      activity: string;
      points: number;
      faculty_id: number;
    });
    return jsonSuccess({ record_id: recordId }, { status: 201 }, "AICTE points awarded.");
  }
  if (tail[0] === "aicte-points" && request.method === "GET" && tail[1]) {
    return jsonSuccess(await teacherGuardianService.getAICTEPoints(tail[1]));
  }
  if (tail[0] === "grievances" && request.method === "GET") {
    return jsonSuccess(await teacherGuardianService.getAssignedGrievances(facultyId));
  }
  if (tail[0] === "grievances" && tail[2] === "resolve" && request.method === "PUT") {
    await teacherGuardianService.resolveGrievance(Number(tail[1]), facultyId);
    return jsonSuccess(undefined, undefined, "Grievance resolved.");
  }
  if (tail[0] === "notices" && request.method === "GET") {
    return jsonSuccess(await teacherGuardianService.getRelevantNotices());
  }

  return jsonError("Route not found.", 404);
}

async function handleStudent(request: NextRequest, slug: string[]) {
  const auth = requireAuthorizedUser(request, ["Student"]);
  if ("error" in auth) return auth.error;
  const tail = slug.slice(1);
  const uid = String(auth.user.id);

  if (tail[0] === "dashboard" && request.method === "GET") {
    const data = await studentService.getStudentDashboard(uid);
    return data ? jsonSuccess(data) : jsonError("Student not found.", 404);
  }
  if (tail[0] === "timetable" && request.method === "GET") {
    return jsonSuccess(await studentService.getTimetable(uid));
  }
  if (tail[0] === "faculty-locator" && request.method === "GET") {
    return jsonSuccess(await studentService.liveFacultyLocator());
  }
  if (tail[0] === "grievances" && request.method === "POST") {
    const body = await readJsonBody(request);
    const category = readString(body.category);
    const description = readString(body.description);
    const routing = await geminiService.routeGrievance(category, description);
    const ticketId = await studentService.submitGrievance({
      student_uid: uid,
      category,
      description,
      evidence: readOptionalString(body.evidence),
    });
    return jsonSuccess(
      { ticket_id: ticketId, ai_routing: routing },
      { status: 201 },
      "Grievance submitted."
    );
  }
  if (tail[0] === "grievances" && request.method === "GET") {
    return jsonSuccess(await studentService.getMyGrievances(uid));
  }
  if (tail[0] === "notices" && request.method === "GET") {
    return jsonSuccess(await studentService.getNotices());
  }
  if (tail[0] === "materials" && request.method === "GET" && tail[1] === "download") {
    const objectName = request.nextUrl.searchParams.get("object_name");
    if (!objectName) return jsonError("object_name required.");
    const downloadUrl = await minioService.getPresignedDownloadUrl(objectName, "study-materials");
    return jsonSuccess({ download_url: downloadUrl });
  }
  if (tail[0] === "materials" && request.method === "GET" && tail[1]) {
    return jsonSuccess(await studentService.getStudyMaterials(Number(tail[1])));
  }
  if (tail[0] === "lab-marks" && request.method === "GET") {
    return jsonSuccess(await studentService.getLabMarks(uid));
  }

  return jsonError("Route not found.", 404);
}

async function handleStorage(request: NextRequest, slug: string[]) {
  const auth = requireUser(request);
  if ("error" in auth) return auth.error;

  if (request.method !== "POST" || slug[0] !== "v1" || slug[1] !== "storage" || slug[2] !== "presigned-url") {
    return jsonError("Route not found.", 404);
  }

  const body = await readJsonBody(request);
  if (!isPresignedAction(body.action) || !readString(body.fileName)) {
    return jsonError("action and fileName are required.");
  }

  const result = await minioService.generatePresignedObjectUrl({
    action: body.action,
    bucketName: readString(body.bucketName),
    fileName: readString(body.fileName),
    fileType: readString(body.fileType),
    userId: auth.user.id,
  });

  return jsonSuccess(
    {
      fileKey: result.fileKey,
      bucketName: result.bucketName,
      uploadUrl: body.action === "upload" ? result.url : undefined,
      downloadUrl: body.action === "download" ? result.url : undefined,
      expiresInSeconds: 60 * 15,
    },
    { status: 201 }
  );
}

async function dispatch(request: NextRequest, slug: string[]) {
  if (slug[0] === "auth") return handleAuth(request, slug);
  if (slug[0] === "admin") return handleAdmin(request, slug);
  if (slug[0] === "hod") return handleHod(request, slug);
  if (slug[0] === "class-incharge") return handleClassIncharge(request, slug);
  if (slug[0] === "subject-incharge") return handleSubjectIncharge(request, slug);
  if (slug[0] === "practical-teacher") return handlePracticalTeacher(request, slug);
  if (slug[0] === "teacher-guardian") return handleTeacherGuardian(request, slug);
  if (slug[0] === "student") return handleStudent(request, slug);
  if (slug[0] === "v1") return handleStorage(request, slug);
  return jsonError("Route not found.", 404);
}

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return dispatch(request, (await context.params).slug);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return dispatch(request, (await context.params).slug);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return dispatch(request, (await context.params).slug);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return dispatch(request, (await context.params).slug);
}
