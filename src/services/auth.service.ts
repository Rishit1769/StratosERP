import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, selectOne } from "@/lib/db";
import { type JwtPayload, type Role } from "../types";

const ALLOWED_EMAIL_DOMAINS = ["@stratos.erp", "@tcetmumbai.in"];

const LEGACY_DESIGNATION_TO_ROLE: Record<string, Role> = {
  "Class Incharge": "ClassIncharge",
  "Subject Incharge": "SubjectIncharge",
  TG: "TG",
};

type AdminRow = {
  admin_id: number;
  name: string;
  email_id: string;
  password_hash: string;
};

type FacultyRow = {
  faculty_id: number;
  name: string;
  email_id: string;
  designation_role: string;
  password_hash: string;
  is_hod: number;
};

type StudentRow = {
  uid: string;
  email_id: string;
  current_semester: number;
  academic_year: string;
  password_hash: string;
};

function isAllowedDomainEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.some((domain) => normalizedEmail.endsWith(domain));
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

async function resolveFacultyDesignations(faculty: FacultyRow): Promise<Role[]> {
  const [tgAssignments, subjectAssignments, practicalBatches, practicalSessions] = await Promise.all([
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM tg_assignment WHERE faculty_id = ?", [
      faculty.faculty_id,
    ]),
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM timetable_slot WHERE faculty_id = ?", [
      faculty.faculty_id,
    ]),
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM lab_batch WHERE faculty_id = ?", [
      faculty.faculty_id,
    ]),
    selectOne<{ total: number }>(db, "SELECT COUNT(*) AS total FROM lab_session WHERE assigned_faculty_id = ?", [
      faculty.faculty_id,
    ]),
  ]);

  const designations = uniqueRoles([
    faculty.is_hod ? "HOD" : null,
    LEGACY_DESIGNATION_TO_ROLE[faculty.designation_role] ?? null,
    (tgAssignments?.total ?? 0) > 0 ? "TG" : null,
    (subjectAssignments?.total ?? 0) > 0 ? "SubjectIncharge" : null,
    (practicalBatches?.total ?? 0) > 0 || (practicalSessions?.total ?? 0) > 0 ? "PracticalTeacher" : null,
  ]);

  if (designations.length > 0) {
    return designations;
  }

  return [LEGACY_DESIGNATION_TO_ROLE[faculty.designation_role] ?? "SubjectIncharge"];
}

export async function loginAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedDomainEmail(normalizedEmail)) return null;

  const admin = await selectOne<AdminRow>(
    db,
    "SELECT admin_id, name, email_id, password_hash FROM admin_user WHERE email_id = ? LIMIT 1",
    [normalizedEmail]
  );
  if (!admin) return null;

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return null;

  const designations: Role[] = ["Admin"];
  const payload = buildJwtPayload(admin.admin_id, admin.email_id, designations);
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  } as jwt.SignOptions);

  return {
    token,
    admin: {
      id: admin.admin_id,
      name: admin.name,
      email: admin.email_id,
      primaryRole: payload.primaryRole,
      designations,
      role: "Admin",
    },
  };
}

export async function loginFaculty(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedDomainEmail(normalizedEmail)) return null;

  const faculty = await selectOne<FacultyRow>(
    db,
    "SELECT faculty_id, name, email_id, designation_role, password_hash, is_hod FROM faculty WHERE email_id = ? LIMIT 1",
    [normalizedEmail]
  );
  if (!faculty) return null;

  const valid = await bcrypt.compare(password, faculty.password_hash);
  if (!valid) return null;

  const designations = await resolveFacultyDesignations(faculty);
  const payload = buildJwtPayload(faculty.faculty_id, faculty.email_id, designations);
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  } as jwt.SignOptions);

  return {
    token,
    faculty: {
      id: faculty.faculty_id,
      name: faculty.name,
      email: faculty.email_id,
      primaryRole: payload.primaryRole,
      designations,
      role: payload.primaryRole,
    },
  };
}

export async function loginStudent(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedDomainEmail(normalizedEmail)) return null;

  const student = await selectOne<StudentRow>(
    db,
    "SELECT uid, email_id, current_semester, academic_year, password_hash FROM student WHERE email_id = ? LIMIT 1",
    [normalizedEmail]
  );
  if (!student) return null;

  const valid = await bcrypt.compare(password, student.password_hash);
  if (!valid) return null;

  const designations: Role[] = ["Student"];
  const payload = buildJwtPayload(student.uid, student.email_id, designations);
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  } as jwt.SignOptions);

  return {
    token,
    student: {
      uid: student.uid,
      email: student.email_id,
      semester: student.current_semester,
      primaryRole: payload.primaryRole,
      designations,
      role: "Student",
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
  const isStudent = normalizedDesignations.includes("Student");
  const isAdmin = normalizedDesignations.includes("Admin");

  if (isStudent) {
    const student = await selectOne<{ password_hash: string }>(
      db,
      "SELECT password_hash FROM student WHERE uid = ? LIMIT 1",
      [String(id)]
    );
    currentHash = student?.password_hash ?? null;
  } else if (isAdmin) {
    const admin = await selectOne<{ password_hash: string }>(
      db,
      "SELECT password_hash FROM admin_user WHERE admin_id = ? LIMIT 1",
      [Number(id)]
    );
    currentHash = admin?.password_hash ?? null;
  } else {
    const faculty = await selectOne<{ password_hash: string }>(
      db,
      "SELECT password_hash FROM faculty WHERE faculty_id = ? LIMIT 1",
      [Number(id)]
    );
    currentHash = faculty?.password_hash ?? null;
  }

  if (!currentHash) return false;

  const valid = await bcrypt.compare(oldPassword, currentHash);
  if (!valid) return false;

  const hash = await bcrypt.hash(newPassword, 12);

  if (isStudent) {
    await db.execute("UPDATE student SET password_hash = ? WHERE uid = ?", [hash, String(id)]);
  } else if (isAdmin) {
    await db.execute("UPDATE admin_user SET password_hash = ? WHERE admin_id = ?", [hash, Number(id)]);
  } else {
    await db.execute("UPDATE faculty SET password_hash = ? WHERE faculty_id = ?", [hash, Number(id)]);
  }

  return true;
}
