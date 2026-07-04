import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

function normalizePayload(decoded: JwtPayload): JwtPayload {
  const fallbackDesignations = decoded.role ? [decoded.role] : [];
  const designations = Array.from(
    new Set(decoded.designations?.length ? decoded.designations : fallbackDesignations)
  );
  const primaryRole = decoded.primaryRole ?? decoded.role ?? designations[0];

  return {
    ...decoded,
    designations,
    primaryRole,
    activeRole: decoded.activeRole ?? primaryRole,
  };
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.user = normalizePayload(decoded);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}
