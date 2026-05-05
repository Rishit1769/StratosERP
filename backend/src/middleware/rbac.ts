import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';

/**
 * Authorize middleware — restricts access to specified roles.
 * Usage: authorize('Admin', 'HOD')
 */
export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }
    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
      return;
    }
    next();
  };
}
