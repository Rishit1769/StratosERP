import jwt from "jsonwebtoken";
import type { JwtPayload, Role } from "@/types";
import { NextRequest } from "next/server";

function uniqueRoles(roles: Array<Role | null | undefined>): Role[] {
  return Array.from(new Set(roles.filter((role): role is Role => Boolean(role))));
}

export function normalizeJwtPayload(decoded: JwtPayload): JwtPayload {
  const fallbackDesignations = decoded.role ? [decoded.role] : [];
  const designations = uniqueRoles(
    decoded.designations?.length ? decoded.designations : fallbackDesignations
  );
  const primaryRole = decoded.primaryRole ?? decoded.role ?? designations[0];

  return {
    ...decoded,
    designations,
    primaryRole,
    activeRole: decoded.activeRole ?? primaryRole,
  };
}

export function readRequestedRole(request: NextRequest): Role | undefined {
  const contextHeader =
    request.headers.get("x-active-role") ?? request.headers.get("x-workspace-context");

  if (!contextHeader) {
    return undefined;
  }

  const normalized = contextHeader.trim();
  return normalized.length > 0 ? (normalized as Role) : undefined;
}

export function verifyRequestUser(request: NextRequest): JwtPayload | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    return normalizeJwtPayload(decoded);
  } catch {
    return null;
  }
}

export function authorizeRequest(
  request: NextRequest,
  user: JwtPayload,
  allowedRoles: Role[],
  requireContext = false
): { ok: true; user: JwtPayload } | { ok: false; status: number; message: string } {
  const userDesignations = uniqueRoles(
    user.designations?.length ? user.designations : user.role ? [user.role] : []
  );

  if (userDesignations.length === 0) {
    return {
      ok: false,
      status: 403,
      message: "Access denied. No designations are attached to this account.",
    };
  }

  const requestedRole = readRequestedRole(request);
  const activeRole = requestedRole ?? user.activeRole ?? user.primaryRole ?? userDesignations[0];

  if (requestedRole && !userDesignations.includes(requestedRole)) {
    return {
      ok: false,
      status: 403,
      message: `Access denied. Requested context "${requestedRole}" is not assigned to this account.`,
    };
  }

  const effectiveRoles = requestedRole || requireContext ? [activeRole] : userDesignations;
  const hasAccess = allowedRoles.some((role) => effectiveRoles.includes(role));

  if (!hasAccess) {
    return {
      ok: false,
      status: 403,
      message: `Access denied. Required role(s): ${allowedRoles.join(", ")}. Your active designation(s): ${effectiveRoles.join(", ") || "none"}.`,
    };
  }

  return {
    ok: true,
    user: {
      ...user,
      activeRole,
    },
  };
}
