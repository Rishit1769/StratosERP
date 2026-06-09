import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as ptCtrl from '../controllers/practicalTeacher.controller';

const router = Router();
router.use(authenticate, authorize('PracticalTeacher', 'SubjectIncharge', 'HOD', 'Admin'));

// Lab Sessions
router.get('/sessions', ptCtrl.getMySessions);
router.post('/sessions', ptCtrl.createSession);
router.put('/sessions/:session_id/complete', ptCtrl.completeSession);
router.put('/sessions/:session_id/lock', ptCtrl.lockSession);

// Attendance
router.post('/sessions/:session_id/attendance', ptCtrl.markAttendance);
router.get('/sessions/:session_id/attendance', ptCtrl.getAttendance);

// Marks
router.post('/sessions/:session_id/marks', ptCtrl.upsertMarks);
router.get('/sessions/:session_id/marks', ptCtrl.getMarks);

// Experiments
router.get('/experiments/:subject_id', ptCtrl.getExperiments);
router.post('/experiments', ptCtrl.createExperiment);

// Batches
router.get('/batches/:subject_id', ptCtrl.getBatches);
router.post('/batches', ptCtrl.createBatch);

// Submissions
router.get('/submissions/:experiment_id', ptCtrl.getSubmissions);
router.post('/submissions', ptCtrl.upsertSubmission);

export default router;
