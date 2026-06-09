// =============================================================
// StratosERP - Shared Type Definitions
// Shared across @stratoserp/web and @stratoserp/api
// =============================================================

/** All user roles in the StratosERP system */
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

/** JWT token payload structure */
export interface JwtPayload {
  id: number | string;
  role: Role;
  email: string;
  iat?: number;
  exp?: number;
}

/** Pagination query parameters */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
