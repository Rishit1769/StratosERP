import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { body, validationResult } from 'express-validator';

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
];

export async function loginFaculty(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: 'Validation failed', error: errors.array() });
    return;
  }
  const { email, password } = req.body;
  const result = await authService.loginFaculty(email, password);
  if (!result) {
    res.status(401).json({ success: false, message: 'Invalid credentials.' });
    return;
  }
  res.json({ success: true, message: 'Login successful.', data: result });
}

export async function loginStudent(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: 'Validation failed', error: errors.array() });
    return;
  }
  const { email, password } = req.body;
  const result = await authService.loginStudent(email, password);
  if (!result) {
    res.status(401).json({ success: false, message: 'Invalid credentials.' });
    return;
  }
  res.json({ success: true, message: 'Login successful.', data: result });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    return;
  }
  const user = req.user!;
  const changed = await authService.changePassword(user.id, user.role as any, oldPassword, newPassword);
  if (!changed) {
    res.status(400).json({ success: false, message: 'Old password is incorrect.' });
    return;
  }
  res.json({ success: true, message: 'Password updated successfully.' });
}

export function getMe(req: Request, res: Response): void {
  res.json({ success: true, data: req.user });
}
