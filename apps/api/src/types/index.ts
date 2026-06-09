// =============================================================
// StratosERP - Type Definitions (re-exported from @stratoserp/shared)
// =============================================================

// Re-export all shared types
export type {
  Role,
  SemesterType,
  SubjectStatus,
  GrievanceStatus,
  LabAttendanceStatus,
  LabSessionStatus,
  LabSubmissionStatus,
  LeaveType,
  NoticeAudience,
  AcademicYear,
  FacultyDesignation,
  JwtPayload,
  PaginationQuery,
  ApiResponse,
} from '@stratoserp/shared';

import type { JwtPayload } from '@stratoserp/shared';

// Augment Express Request (Express-specific, stays in api)
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
