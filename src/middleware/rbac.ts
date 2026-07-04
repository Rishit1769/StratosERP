import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';

interface AuthorizeOptions {
  requireContext?: boolean;
}

function readRequestedRole(req: Request): string | undefined {
  const contextHeader = req.header('X-Active-Role') ?? req.header('X-Workspace-Context');
  if (typeof contextHeader !== 'string') {
    return undefined;
  }

  const normalized = contextHeader.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeAuthorizeArgs(
  allowedRolesOrRole: Role[] | Role,
  additionalArgs: Array<Role | AuthorizeOptions>
): { allowedRoles: Role[]; options: AuthorizeOptions } {
  if (Array.isArray(allowedRolesOrRole)) {
    const options = additionalArgs.find(
      (arg): arg is AuthorizeOptions => typeof arg === 'object' && arg !== null
    ) ?? {};

    return { allowedRoles: allowedRolesOrRole, options };
  }

  const allowedRoles = [
    allowedRolesOrRole,
    ...additionalArgs.filter((arg): arg is Role => typeof arg === 'string'),
  ];
  const options = additionalArgs.find(
    (arg): arg is AuthorizeOptions => typeof arg === 'object' && arg !== null
  ) ?? {};

  return { allowedRoles, options };
}

export function authorize(
  allowedRolesOrRole: Role[] | Role,
  ...additionalArgs: Array<Role | AuthorizeOptions>
) {
  const { allowedRoles, options } = normalizeAuthorizeArgs(allowedRolesOrRole, additionalArgs);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const userDesignations = Array.from(
      new Set(
        req.user.designations?.length
          ? req.user.designations
          : req.user.role
            ? [req.user.role]
            : []
      )
    );

    if (userDesignations.length === 0) {
      res.status(403).json({
        success: false,
        message: 'Access denied. No designations are attached to this account.',
      });
      return;
    }

    const requestedRole = readRequestedRole(req);
    if (requestedRole) {
      if (!userDesignations.includes(requestedRole as Role)) {
        res.status(403).json({
          success: false,
          message: `Access denied. Requested context "${requestedRole}" is not assigned to this account.`,
        });
        return;
      }

      req.user.activeRole = requestedRole as Role;
    } else {
      req.user.activeRole = req.user.activeRole ?? req.user.primaryRole ?? userDesignations[0];
    }

    const effectiveRoles =
      requestedRole || options.requireContext
        ? req.user.activeRole
          ? [req.user.activeRole]
          : []
        : userDesignations;

    const hasAccess = allowedRoles.some((role) => effectiveRoles.includes(role));
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your active designation(s): ${effectiveRoles.join(', ') || 'none'}.`,
      });
      return;
    }

    next();
  };
}
