import pool from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, JwtPayload } from '../types';

const ALLOWED_EMAIL_DOMAIN = '@tcetmumbai.in';

function isAllowedDomainEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

export async function loginAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedDomainEmail(normalizedEmail)) return null;

  const [rows] = await pool.query<any[]>(
    'SELECT * FROM admin_user WHERE email_id = ?',
    [normalizedEmail]
  );
  if (!rows.length) return null;

  const admin = rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return null;

  const payload: JwtPayload = { id: admin.admin_id, role: 'Admin', email: admin.email_id };
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);

  return {
    token,
    admin: {
      id: admin.admin_id,
      name: admin.name,
      email: admin.email_id,
      role: 'Admin',
    },
  };
}

export async function loginFaculty(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedDomainEmail(normalizedEmail)) return null;

  const [rows] = await pool.query<any[]>(
    'SELECT * FROM faculty WHERE email_id = ?',
    [normalizedEmail]
  );
  if (!rows.length) return null;

  const faculty = rows[0];
  const valid = await bcrypt.compare(password, faculty.password_hash);
  if (!valid) return null;

  // Map designation_role to JWT role
  let role: Role;
  if (faculty.is_hod) {
    role = 'HOD';
  } else {
    // designation_role can be 'Class Incharge', 'Subject Incharge', 'TG'
    switch (faculty.designation_role) {
      case 'Class Incharge': role = 'ClassIncharge'; break;
      case 'Subject Incharge': role = 'SubjectIncharge'; break;
      case 'TG': role = 'TG'; break;
      default: role = 'SubjectIncharge';
    }
  }

  const payload: JwtPayload = { id: faculty.faculty_id, role, email: faculty.email_id };
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);

  return { token, faculty: { id: faculty.faculty_id, name: faculty.name, email: faculty.email_id, role } };
}

export async function loginStudent(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedDomainEmail(normalizedEmail)) return null;

  // Students log in by institutional email
  const [rows] = await pool.query<any[]>(
    'SELECT * FROM student WHERE email_id = ?',
    [normalizedEmail]
  );
  if (!rows.length) return null;

  const student = rows[0];
  const valid = await bcrypt.compare(password, student.password_hash);
  if (!valid) return null;

  const payload: JwtPayload = { id: student.uid, role: 'Student', email: student.email_id };
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);

  return {
    token,
    student: { uid: student.uid, email: student.email_id, semester: student.current_semester, role: 'Student' },
  };
}

export async function changePassword(
  id: number | string,
  role: Role,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  const table = role === 'Student' ? 'student' : role === 'Admin' ? 'admin_user' : 'faculty';
  const idCol = role === 'Student' ? 'uid' : role === 'Admin' ? 'admin_id' : 'faculty_id';

  const [rows] = await pool.query<any[]>(`SELECT password_hash FROM ${table} WHERE ${idCol} = ?`, [id]);
  if (!rows.length) return false;

  const valid = await bcrypt.compare(oldPassword, rows[0].password_hash);
  if (!valid) return false;

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query(`UPDATE ${table} SET password_hash = ? WHERE ${idCol} = ?`, [hash, id]);
  return true;
}
