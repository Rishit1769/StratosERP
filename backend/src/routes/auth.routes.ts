import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/login/admin
router.post('/login/admin', authController.loginValidation, authController.loginAdmin);

// POST /api/auth/login/faculty
router.post('/login/faculty', authController.loginValidation, authController.loginFaculty);

// POST /api/auth/login/student
router.post('/login/student', authController.loginValidation, authController.loginStudent);

// GET /api/auth/me  (protected)
router.get('/me', authenticate, authController.getMe);

// PUT /api/auth/change-password (protected)
router.put('/change-password', authenticate, authController.changePassword);

export default router;
