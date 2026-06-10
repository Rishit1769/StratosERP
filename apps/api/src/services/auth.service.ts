import { prisma } from '@stratoserp/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, JwtPayload } from '../types';

const ALLOWED_EMAIL_DOMAIN = '@tcetmumbai.in';

const LEGACY_DESIGNATION_TO_ROLE: Record<string, Role> = {
  'Class Incharge': 'ClassIncharge',
  'Subject Incharge': 'SubjectIncharge',
  TG: 'TG',
};

function isAllowedDomainEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

function uniqueRoles(roles: Array<Role | null | undefined>): Role[] {
  return Array.from(new Set(roles.filter((role): role is Role => Boolean(role))));
}

function buildJwtPayload(id: number | string, email: string, designations: Role[]): JwtPayload {
  const normalizedDesignations = uniqueRoles(designations);
  const primaryRole = normalizedDesignations[0];

  return {
    id,
    email,
    designations: normalizedDesignations,
    primaryRole,
    activeRole: primaryRole,
  };
}

async function resolveFacultyDesignations(faculty: {
  facultyId: number;
  emailId: string;
  designationRole: string;
  isHod: boolean;
}): Promise<Role[]> {
  const [tgAssignments, subjectAssignments, practicalBatches, practicalSessions] = await Promise.all([
    prisma.tgAssignment.count({ where: { facultyId: faculty.facultyId } }),
    prisma.timetableSlot.count({ where: { facultyId: faculty.facultyId } }),
    prisma.labBatch.count({ where: { facultyId: faculty.facultyId } }),
    prisma.labSession.count({ where: { assignedFacultyId: faculty.facultyId } }),
  ]);

  const designations = uniqueRoles([
    faculty.isHod ? 'HOD' : null,
    LEGACY_DESIGNATION_TO_ROLE[faculty.designationRole] ?? null,
    tgAssignments > 0 ? 'TG' : null,
    subjectAssignments > 0 ? 'SubjectIncharge' : null,
    practicalBatches > 0 || practicalSessions > 0 ? 'PracticalTeacher' : null,
  ]);

  if (designations.length > 0) {
    return designations;
  }

  return [LEGACY_DESIGNATION_TO_ROLE[faculty.designationRole] ?? 'SubjectIncharge'];
}

export async function loginAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedDomainEmail(normalizedEmail)) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { emailId: normalizedEmail },
  });
  if (!admin) return null;

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return null;

  const designations: Role[] = ['Admin'];
  const payload = buildJwtPayload(admin.adminId, admin.emailId, designations);
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);

  return {
    token,
    admin: {
      id: admin.adminId,
      name: admin.name,
      email: admin.emailId,
      primaryRole: payload.primaryRole,
      designations,
      role: 'Admin',
    },
  };
}

export async function loginFaculty(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedDomainEmail(normalizedEmail)) return null;

  const faculty = await prisma.faculty.findUnique({
    where: { emailId: normalizedEmail },
  });
  if (!faculty) return null;

  const valid = await bcrypt.compare(password, faculty.passwordHash);
  if (!valid) return null;

  const designations = await resolveFacultyDesignations(faculty);
  const payload = buildJwtPayload(faculty.facultyId, faculty.emailId, designations);
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);

  return {
    token,
    faculty: {
      id: faculty.facultyId,
      name: faculty.name,
      email: faculty.emailId,
      primaryRole: payload.primaryRole,
      designations,
      role: payload.primaryRole,
    },
  };
}

export async function loginStudent(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedDomainEmail(normalizedEmail)) return null;

  const student = await prisma.student.findUnique({
    where: { emailId: normalizedEmail },
  });
  if (!student) return null;

  const valid = await bcrypt.compare(password, student.passwordHash);
  if (!valid) return null;

  const designations: Role[] = ['Student'];
  const payload = buildJwtPayload(student.uid, student.emailId, designations);
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);

  return {
    token,
    student: {
      uid: student.uid,
      email: student.emailId,
      semester: student.currentSemester,
      primaryRole: payload.primaryRole,
      designations,
      role: 'Student',
    },
  };
}

export async function changePassword(
  id: number | string,
  designations: Role[],
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  let currentHash: string | null = null;
  const normalizedDesignations = uniqueRoles(designations);
  const isStudent = normalizedDesignations.includes('Student');
  const isAdmin = normalizedDesignations.includes('Admin');

  if (isStudent) {
    const student = await prisma.student.findUnique({ where: { uid: String(id) } });
    currentHash = student?.passwordHash ?? null;
  } else if (isAdmin) {
    const admin = await prisma.adminUser.findUnique({ where: { adminId: Number(id) } });
    currentHash = admin?.passwordHash ?? null;
  } else {
    const faculty = await prisma.faculty.findUnique({ where: { facultyId: Number(id) } });
    currentHash = faculty?.passwordHash ?? null;
  }

  if (!currentHash) return false;

  const valid = await bcrypt.compare(oldPassword, currentHash);
  if (!valid) return false;

  const hash = await bcrypt.hash(newPassword, 12);

  if (isStudent) {
    await prisma.student.update({ where: { uid: String(id) }, data: { passwordHash: hash } });
  } else if (isAdmin) {
    await prisma.adminUser.update({ where: { adminId: Number(id) }, data: { passwordHash: hash } });
  } else {
    await prisma.faculty.update({ where: { facultyId: Number(id) }, data: { passwordHash: hash } });
  }

  return true;
}
