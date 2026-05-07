// =============================================================
// StratosERP - Shared Type Definitions
// =============================================================

export type Role =
  | 'Admin'
  | 'HOD'
  | 'ClassIncharge'
  | 'SubjectIncharge'
  | 'PracticalTeacher'
  | 'TG'
  | 'Student';

export type SemesterType = 'ODD' | 'EVEN';

export type SubjectStatus = 'Active' | 'KT' | 'SUPPLI' | 'Cleared';

export type GrievanceStatus = 'Open' | 'Resolved' | 'Escalated';

export type LabAttendanceStatus = 'Present' | 'Absent';

export type LabSessionStatus = 'Pending' | 'Completed' | 'Locked';

export type LabSubmissionStatus = 'Submitted' | 'Late' | 'Missing';

export type LeaveType = 'Planned' | 'Emergency';

export type NoticeAudience = 'INSTITUTE' | 'BRANCH';

export type AcademicYear = '1st' | '2nd' | '3rd' | '4th' | 'Alumni';

export type FacultyDesignation = 'Class Incharge' | 'Subject Incharge' | 'TG';

// JWT payload
export interface JwtPayload {
  id: number | string; // admin_id or faculty_id or student uid
  role: Role;
  email: string;
  iat?: number;
  exp?: number;
}

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
