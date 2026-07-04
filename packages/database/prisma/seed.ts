import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL) {
    return;
  }

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_PORT || !DB_USER || !DB_NAME) {
    return;
  }

  const encodedPassword = encodeURIComponent(DB_PASSWORD ?? '');
  process.env.DATABASE_URL = `mysql://${DB_USER}:${encodedPassword}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

ensureDatabaseUrl();

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password@123';

const LEGACY_ADMIN_EMAILS = ['admin@tcetmumbai.in', 'admin@stratoserp.edu'];
const LEGACY_FACULTY_EMAILS = [
  'admin@tcetmumbai.in',
  'hod@tcetmumbai.in',
  'subject@tcetmumbai.in',
  'class@tcetmumbai.in',
  'guardian@tcetmumbai.in',
];
const LEGACY_STUDENT_EMAILS = ['student@tcetmumbai.in'];
const PREVIOUS_STRATOS_ADMIN_EMAILS = ['admin@stratos.erp'];
const PREVIOUS_STRATOS_FACULTY_EMAILS = [
  'hodcomp@stratos.erp',
  'subjectinchargecomp@stratos.erp',
  'classinchargecomp@stratos.erp',
  'teacherguardiancomp@stratos.erp',
];
const PREVIOUS_STRATOS_STUDENT_EMAILS = ['studentcomp@stratos.erp'];

const TARGET_USERS = {
  admin: {
    name: 'Stratos Admin',
    emailId: 'admin@tcetmumbai.in',
  },
  hod: {
    name: 'Computer HOD',
    emailId: 'hodcomp@tcetmumbai.in',
    designationRole: 'Subject Incharge',
    isHod: true,
  },
  subjectIncharge: {
    name: 'Computer Subject Incharge',
    emailId: 'subjectinchargecomp@tcetmumbai.in',
    designationRole: 'Subject Incharge',
    isHod: false,
  },
  classIncharge: {
    name: 'Computer Class Incharge',
    emailId: 'classinchargecomp@tcetmumbai.in',
    designationRole: 'Class Incharge',
    isHod: false,
  },
  teacherGuardian: {
    name: 'Computer Teacher Guardian',
    emailId: 'teacherguardiancomp@tcetmumbai.in',
    designationRole: 'TG',
    isHod: false,
  },
  student: {
    uid: 'STUDENT-COMP-001',
    emailId: 'studentcomp@tcetmumbai.in',
    currentSemester: 5,
    academicYear: '3rd',
  },
} as const;

async function removeLegacySeedData() {
  const legacyFaculty = await prisma.faculty.findMany({
    where: {
      emailId: {
        in: [...LEGACY_FACULTY_EMAILS, ...PREVIOUS_STRATOS_FACULTY_EMAILS],
      },
    },
    select: {
      facultyId: true,
    },
  });

  const legacyStudents = await prisma.student.findMany({
    where: {
      emailId: {
        in: [...LEGACY_STUDENT_EMAILS, ...PREVIOUS_STRATOS_STUDENT_EMAILS],
      },
    },
    select: {
      uid: true,
    },
  });

  const legacyFacultyIds = legacyFaculty.map((faculty) => faculty.facultyId);
  const legacyStudentUids = legacyStudents.map((student) => student.uid);

  await prisma.$transaction(async (tx) => {
    if (legacyFacultyIds.length > 0) {
      await tx.aictePoints.deleteMany({
        where: {
          awardedBy: {
            in: legacyFacultyIds,
          },
        },
      });
      await tx.leaveSubstitution.deleteMany({
        where: {
          OR: [
            {
              absentFacultyId: {
                in: legacyFacultyIds,
              },
            },
            {
              substituteFacultyId: {
                in: legacyFacultyIds,
              },
            },
          ],
        },
      });
      await tx.labMark.deleteMany({
        where: {
          updatedBy: {
            in: legacyFacultyIds,
          },
        },
      });
      await tx.labSession.deleteMany({
        where: {
          OR: [
            {
              assignedFacultyId: {
                in: legacyFacultyIds,
              },
            },
            {
              originalFacultyId: {
                in: legacyFacultyIds,
              },
            },
          ],
        },
      });
      await tx.labBatch.deleteMany({
        where: {
          facultyId: {
            in: legacyFacultyIds,
          },
        },
      });
      await tx.timetableSlot.deleteMany({
        where: {
          facultyId: {
            in: legacyFacultyIds,
          },
        },
      });
      await tx.grievanceTicket.deleteMany({
        where: {
          assignedAuthorityId: {
            in: legacyFacultyIds,
          },
        },
      });
      await tx.tgAssignment.deleteMany({
        where: {
          facultyId: {
            in: legacyFacultyIds,
          },
        },
      });
    }

    if (legacyStudentUids.length > 0) {
      await tx.labSubmission.deleteMany({
        where: {
          studentUid: {
            in: legacyStudentUids,
          },
        },
      });
      await tx.labMark.deleteMany({
        where: {
          studentUid: {
            in: legacyStudentUids,
          },
        },
      });
      await tx.aictePoints.deleteMany({
        where: {
          studentUid: {
            in: legacyStudentUids,
          },
        },
      });
      await tx.grievanceTicket.deleteMany({
        where: {
          studentUid: {
            in: legacyStudentUids,
          },
        },
      });
      await tx.labAttendance.deleteMany({
        where: {
          studentUid: {
            in: legacyStudentUids,
          },
        },
      });
      await tx.studentSubjectRecord.deleteMany({
        where: {
          studentUid: {
            in: legacyStudentUids,
          },
        },
      });
      await tx.tgAssignment.deleteMany({
        where: {
          studentUid: {
            in: legacyStudentUids,
          },
        },
      });
    }

    await tx.adminUser.deleteMany({
      where: {
        emailId: {
          in: [...LEGACY_ADMIN_EMAILS, ...PREVIOUS_STRATOS_ADMIN_EMAILS],
        },
      },
    });
    await tx.faculty.deleteMany({
      where: {
        emailId: {
          in: [...LEGACY_FACULTY_EMAILS, ...PREVIOUS_STRATOS_FACULTY_EMAILS],
        },
      },
    });
    await tx.student.deleteMany({
      where: {
        emailId: {
          in: [...LEGACY_STUDENT_EMAILS, ...PREVIOUS_STRATOS_STUDENT_EMAILS],
        },
      },
    });
  });
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  await prisma.adminUser.upsert({
    where: { emailId: TARGET_USERS.admin.emailId },
    update: {
      name: TARGET_USERS.admin.name,
      passwordHash,
    },
    create: {
      name: TARGET_USERS.admin.name,
      emailId: TARGET_USERS.admin.emailId,
      passwordHash,
    },
  });

  await prisma.faculty.upsert({
    where: { emailId: TARGET_USERS.hod.emailId },
    update: {
      name: TARGET_USERS.hod.name,
      designationRole: TARGET_USERS.hod.designationRole,
      passwordHash,
      isHod: TARGET_USERS.hod.isHod,
    },
    create: {
      name: TARGET_USERS.hod.name,
      emailId: TARGET_USERS.hod.emailId,
      designationRole: TARGET_USERS.hod.designationRole,
      passwordHash,
      isHod: TARGET_USERS.hod.isHod,
    },
  });

  await prisma.faculty.upsert({
    where: { emailId: TARGET_USERS.subjectIncharge.emailId },
    update: {
      name: TARGET_USERS.subjectIncharge.name,
      designationRole: TARGET_USERS.subjectIncharge.designationRole,
      passwordHash,
      isHod: TARGET_USERS.subjectIncharge.isHod,
    },
    create: {
      name: TARGET_USERS.subjectIncharge.name,
      emailId: TARGET_USERS.subjectIncharge.emailId,
      designationRole: TARGET_USERS.subjectIncharge.designationRole,
      passwordHash,
      isHod: TARGET_USERS.subjectIncharge.isHod,
    },
  });

  await prisma.faculty.upsert({
    where: { emailId: TARGET_USERS.classIncharge.emailId },
    update: {
      name: TARGET_USERS.classIncharge.name,
      designationRole: TARGET_USERS.classIncharge.designationRole,
      passwordHash,
      isHod: TARGET_USERS.classIncharge.isHod,
    },
    create: {
      name: TARGET_USERS.classIncharge.name,
      emailId: TARGET_USERS.classIncharge.emailId,
      designationRole: TARGET_USERS.classIncharge.designationRole,
      passwordHash,
      isHod: TARGET_USERS.classIncharge.isHod,
    },
  });

  await prisma.faculty.upsert({
    where: { emailId: TARGET_USERS.teacherGuardian.emailId },
    update: {
      name: TARGET_USERS.teacherGuardian.name,
      designationRole: TARGET_USERS.teacherGuardian.designationRole,
      passwordHash,
      isHod: TARGET_USERS.teacherGuardian.isHod,
    },
    create: {
      name: TARGET_USERS.teacherGuardian.name,
      emailId: TARGET_USERS.teacherGuardian.emailId,
      designationRole: TARGET_USERS.teacherGuardian.designationRole,
      passwordHash,
      isHod: TARGET_USERS.teacherGuardian.isHod,
    },
  });

  await prisma.student.upsert({
    where: { emailId: TARGET_USERS.student.emailId },
    update: {
      uid: TARGET_USERS.student.uid,
      currentSemester: TARGET_USERS.student.currentSemester,
      academicYear: TARGET_USERS.student.academicYear,
      passwordHash,
    },
    create: {
      uid: TARGET_USERS.student.uid,
      emailId: TARGET_USERS.student.emailId,
      currentSemester: TARGET_USERS.student.currentSemester,
      academicYear: TARGET_USERS.student.academicYear,
      passwordHash,
    },
  });
}

async function main() {
  await removeLegacySeedData();
  await seedUsers();
  console.log('Seeded StratosERP users successfully.');
}

main()
  .catch((error) => {
    console.error('Seeding failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
