import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: `${process.cwd()}\\.env` });
dotenv.config();

function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL) {
    return;
  }

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_PORT || !DB_USER || !DB_NAME) {
    return;
  }

  const encodedPassword = encodeURIComponent(DB_PASSWORD ?? "");
  process.env.DATABASE_URL = `mysql://${DB_USER}:${encodedPassword}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

ensureDatabaseUrl();

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "Password@123";

const seedUsers = {
  admin: {
    name: "Stratos Admin",
    emailId: "admin@tcetmumbai.in",
  },
  faculty: [
    {
      label: "HOD",
      name: "Computer HOD",
      emailId: "hodcomp@tcetmumbai.in",
      designationRole: "HOD",
      isHod: true,
    },
    {
      label: "SubjectIncharge",
      name: "Computer Subject Incharge",
      emailId: "subjectinchargecomp@tcetmumbai.in",
      designationRole: "Subject Incharge",
      isHod: false,
    },
    {
      label: "ClassIncharge",
      name: "Computer Class Incharge",
      emailId: "classinchargecomp@tcetmumbai.in",
      designationRole: "Class Incharge",
      isHod: false,
    },
    {
      label: "TG",
      name: "Computer Teacher Guardian",
      emailId: "teacherguardiancomp@tcetmumbai.in",
      designationRole: "TG",
      isHod: false,
    },
    {
      label: "PracticalTeacher",
      name: "Computer Lab Instructor",
      emailId: "practicalteachercomp@tcetmumbai.in",
      designationRole: "Practical Teacher",
      isHod: false,
    },
  ],
  student: {
    uid: "STUDENT-COMP-001",
    emailId: "studentcomp@tcetmumbai.in",
    currentSemester: 5,
    academicYear: "3rd",
  },
} as const;

const legacySeedEmails = {
  admin: ["admin@stratoserp.edu", "admin@stratos.erp"],
  faculty: [
    "admin@tcetmumbai.in",
    "hod@tcetmumbai.in",
    "subject@tcetmumbai.in",
    "class@tcetmumbai.in",
    "guardian@tcetmumbai.in",
    "hodcomp@stratos.erp",
    "subjectinchargecomp@stratos.erp",
    "classinchargecomp@stratos.erp",
    "teacherguardiancomp@stratos.erp",
  ],
  student: ["student@tcetmumbai.in", "studentcomp@stratos.erp"],
};

type SeedStats = {
  created: string[];
  skipped: string[];
  warnings: string[];
};

function logStats(stats: SeedStats): void {
  for (const item of stats.created) {
    console.log(`[seed] created ${item}`);
  }

  for (const item of stats.skipped) {
    console.log(`[seed] skipped ${item}`);
  }

  for (const item of stats.warnings) {
    console.warn(`[seed] warning ${item}`);
  }
}

async function logLegacySeedUsers(stats: SeedStats): Promise<void> {
  const [legacyAdmins, legacyFaculty, legacyStudents] = await Promise.all([
    prisma.adminUser.findMany({
      where: { emailId: { in: legacySeedEmails.admin } },
      select: { emailId: true },
    }),
    prisma.faculty.findMany({
      where: { emailId: { in: legacySeedEmails.faculty } },
      select: { emailId: true },
    }),
    prisma.student.findMany({
      where: { emailId: { in: legacySeedEmails.student } },
      select: { emailId: true },
    }),
  ]);

  const legacyEmails = [...legacyAdmins, ...legacyFaculty, ...legacyStudents].map((user) => user.emailId);
  if (legacyEmails.length > 0) {
    stats.warnings.push(
      `legacy seed users detected and left untouched: ${legacyEmails.join(", ")}`
    );
  }
}

async function seedAdmin(passwordHash: string, stats: SeedStats): Promise<void> {
  const existing = await prisma.adminUser.findUnique({
    where: { emailId: seedUsers.admin.emailId },
    select: { adminId: true },
  });

  if (existing) {
    stats.skipped.push(`admin ${seedUsers.admin.emailId}`);
    return;
  }

  await prisma.adminUser.create({
    data: {
      name: seedUsers.admin.name,
      emailId: seedUsers.admin.emailId,
      passwordHash,
    },
  });

  stats.created.push(`admin ${seedUsers.admin.emailId}`);
}

async function seedFaculty(passwordHash: string, stats: SeedStats): Promise<void> {
  for (const facultySeed of seedUsers.faculty) {
    const existing = await prisma.faculty.findUnique({
      where: { emailId: facultySeed.emailId },
      select: { facultyId: true },
    });

    if (existing) {
      stats.skipped.push(`faculty ${facultySeed.emailId}`);
      continue;
    }

    await prisma.faculty.create({
      data: {
        name: facultySeed.name,
        emailId: facultySeed.emailId,
        designationRole: facultySeed.designationRole,
        passwordHash,
        isHod: facultySeed.isHod,
      },
    });

    stats.created.push(`faculty ${facultySeed.emailId} (${facultySeed.label})`);
  }
}

async function seedStudent(passwordHash: string, stats: SeedStats): Promise<void> {
  const existingStudent =
    (await prisma.student.findUnique({
      where: { emailId: seedUsers.student.emailId },
      select: { uid: true },
    })) ??
    (await prisma.student.findUnique({
      where: { uid: seedUsers.student.uid },
      select: { uid: true, emailId: true },
    }));

  if (existingStudent) {
    stats.skipped.push(`student ${seedUsers.student.emailId}`);
    return;
  }

  await prisma.student.create({
    data: {
      uid: seedUsers.student.uid,
      emailId: seedUsers.student.emailId,
      currentSemester: seedUsers.student.currentSemester,
      academicYear: seedUsers.student.academicYear,
      passwordHash,
    },
  });

  stats.created.push(`student ${seedUsers.student.emailId}`);
}

async function seedDemoData(stats: SeedStats): Promise<void> {
  // Default global semester configuration with institutional thresholds
  const existingConfig = await prisma.globalConfig.findFirst({ select: { configId: true } });
  if (!existingConfig) {
    await prisma.globalConfig.create({
      data: {
        activeSemesterType: "ODD",
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-12-10"),
        maxAictePoints: 100,
        minAttendancePct: 75,
      },
    });
    stats.created.push("global_config (ODD 2026-07-15 → 2026-12-10, max AICTE 100, min attendance 75%)");
  } else {
    stats.skipped.push("global_config (already present)");
  }

  // Reference subject so Subject Incharge / student / lab flows have data
  let subject = await prisma.subject.findFirst({ where: { name: "Data Structures" }, select: { subjectId: true } });
  if (!subject) {
    subject = await prisma.subject.create({
      data: { name: "Data Structures", semesterLevel: 5, hasLab: true, labMarksWeight: 30 },
      select: { subjectId: true },
    });
    stats.created.push("subject Data Structures (semester 5, has lab)");
  }

  const subjectId = subject.subjectId;
  const subjectIncharge = await prisma.faculty.findUnique({
    where: { emailId: "subjectinchargecomp@tcetmumbai.in" },
    select: { facultyId: true },
  });
  const teacherGuardian = await prisma.faculty.findUnique({
    where: { emailId: "teacherguardiancomp@tcetmumbai.in" },
    select: { facultyId: true },
  });
  const student = await prisma.student.findUnique({
    where: { uid: "STUDENT-COMP-001" },
    select: { uid: true },
  });

  if (student && subjectIncharge) {
    // Enroll seeded student in the subject
    const existingRecord = await prisma.studentSubjectRecord.findUnique({
      where: { studentUid_subjectId: { studentUid: student.uid, subjectId } },
      select: { studentUid: true },
    });
    if (!existingRecord) {
      await prisma.studentSubjectRecord.create({
        data: { studentUid: student.uid, subjectId, status: "Active", marks: null },
      });
      stats.created.push(`enrollment STUDENT-COMP-001 → Data Structures`);
    }

    // Timetable slots Mon–Fri so active-slot / attendance / locator flows
    // work on any weekday, not just one specific day
    const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    for (const [index, day] of WEEKDAYS.entries()) {
      const existingDaySlot = await prisma.timetableSlot.findFirst({
        where: { subjectId, facultyId: subjectIncharge.facultyId, dayOfWeek: day },
        select: { slotId: true },
      });
      if (!existingDaySlot) {
        const startHour = String(9 + index).padStart(2, "0");
        const endHour = String(10 + index).padStart(2, "0");
        await prisma.timetableSlot.create({
          data: {
            dayOfWeek: day,
            startTime: new Date(`1970-01-01T${startHour}:00:00Z`),
            endTime: new Date(`1970-01-01T${endHour}:00:00Z`),
            subjectId,
            facultyId: subjectIncharge.facultyId,
          },
        });
        stats.created.push(`timetable slot ${day} (Data Structures)`);
      }
    }

    // Lab experiment + batch + session so Practical Teacher flows have data
    const existingExperiment = await prisma.experiment.findFirst({
      where: { subjectId, experimentNo: 1 },
      select: { experimentId: true },
    });
    if (!existingExperiment) {
      await prisma.experiment.create({
        data: { subjectId, experimentNo: 1, title: "Stacks & Recursion Basics", maxMarks: 30 },
      });
      stats.created.push("experiment 1 Stacks & Recursion Basics");
    }

    const existingBatch = await prisma.labBatch.findFirst({
      where: { subjectId, batchName: "A1" },
      select: { batchId: true },
    });
    if (!existingBatch) {
      await prisma.labBatch.create({
        data: { subjectId, batchName: "A1", facultyId: subjectIncharge.facultyId },
      });
      stats.created.push("lab batch A1");
    }

    const batch = existingBatch ?? (await prisma.labBatch.findFirst({
      where: { subjectId, batchName: "A1" },
      select: { batchId: true },
    }));
    if (batch) {
      const today = new Date();
      const existingSession = await prisma.labSession.findFirst({
        where: { subjectId, batchId: batch.batchId, sessionDate: today },
        select: { sessionId: true },
      });
      if (!existingSession) {
        await prisma.labSession.create({
          data: {
            subjectId,
            batchId: batch.batchId,
            sessionDate: today,
            assignedFacultyId: subjectIncharge.facultyId,
            status: "Pending",
          },
        });
        stats.created.push("lab session today (Pending)");
      }
    }
  }

  if (student && teacherGuardian) {
    // TG assignment so mentee flows work
    const existingAssignment = await prisma.tgAssignment.findUnique({
      where: { facultyId_studentUid_semester: { facultyId: teacherGuardian.facultyId, studentUid: student.uid, semester: 5 } },
      select: { assignmentId: true },
    });
    if (!existingAssignment) {
      await prisma.tgAssignment.create({
        data: { facultyId: teacherGuardian.facultyId, studentUid: student.uid, semester: 5 },
      });
      stats.created.push("TG assignment teacherguardiancomp → STUDENT-COMP-001");
    }
  }

  if (student && subjectIncharge) {
    // Question-level exam marks so the performance heatmap has data
    const questionMarks = [
      { questionNo: 1, marks: 9 },
      { questionNo: 2, marks: 10 },
      { questionNo: 3, marks: 4 },
      { questionNo: 4, marks: 6 },
      { questionNo: 5, marks: 8 },
    ];
    let heatmapCreated = 0;
    for (const q of questionMarks) {
      const existing = await prisma.questionMark.findUnique({
        where: {
          studentUid_subjectId_examType_questionNo: {
            studentUid: student.uid,
            subjectId,
            examType: "MID",
            questionNo: q.questionNo,
          },
        },
        select: { questionMarkId: true },
      });
      if (!existing) {
        await prisma.questionMark.create({
          data: {
            studentUid: student.uid,
            subjectId,
            examType: "MID",
            questionNo: q.questionNo,
            maxMarks: 10,
            marks: q.marks,
          },
        });
        heatmapCreated++;
      }
    }
    if (heatmapCreated > 0) {
      stats.created.push(`${heatmapCreated} MID question marks for heatmap`);
    }
  }

  const practicalTeacher = await prisma.faculty.findUnique({
    where: { emailId: "practicalteachercomp@tcetmumbai.in" },
    select: { facultyId: true },
  });
  if (practicalTeacher && subjectIncharge) {
    // Second lab batch + session assigned to the Practical Teacher so the
    // dedicated PT role has a workspace with data on login
    const existingBatch = await prisma.labBatch.findFirst({
      where: { subjectId, batchName: "A2" },
      select: { batchId: true },
    });
    if (!existingBatch) {
      await prisma.labBatch.create({
        data: { subjectId, batchName: "A2", facultyId: practicalTeacher.facultyId },
      });
      stats.created.push("lab batch A2 (Practical Teacher)");
    }
    const ptBatch = existingBatch ?? (await prisma.labBatch.findFirst({
      where: { subjectId, batchName: "A2" },
      select: { batchId: true },
    }));
    if (ptBatch) {
      const today = new Date();
      const existingSession = await prisma.labSession.findFirst({
        where: { subjectId, batchId: ptBatch.batchId, sessionDate: today },
        select: { sessionId: true },
      });
      if (!existingSession) {
        await prisma.labSession.create({
          data: {
            subjectId,
            batchId: ptBatch.batchId,
            sessionDate: today,
            assignedFacultyId: practicalTeacher.facultyId,
            status: "Pending",
          },
        });
        stats.created.push("lab session today (Practical Teacher, Pending)");
      }
    }
  }
}

async function main(): Promise<void> {
  const stats: SeedStats = {
    created: [],
    skipped: [],
    warnings: [],
  };

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  await logLegacySeedUsers(stats);
  await seedAdmin(passwordHash, stats);
  await seedFaculty(passwordHash, stats);
  await seedStudent(passwordHash, stats);
  await seedDemoData(stats);

  logStats(stats);
  console.log("[seed] completed successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("[seed] database seeding failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
