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
      designationRole: "Subject Incharge",
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
