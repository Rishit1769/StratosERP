import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as storageCtrl from '../controllers/storage.controller';

const router = Router();

router.use(authenticate);
router.post('/presigned-url', storageCtrl.createPresignedUrl);

export default router;
