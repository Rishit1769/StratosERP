// =============================================================
// StratosERP - Shared Constants
// =============================================================

/** All valid role slugs used in URL routing */
export const ROLE_SLUGS = [
  'admin',
  'hod',
  'class-incharge',
  'subject-incharge',
  'practical-teacher',
  'tg',
  'student',
] as const;

export type RoleSlug = (typeof ROLE_SLUGS)[number];

/** Default pagination limits */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** API version prefix */
export const API_PREFIX = '/api';
