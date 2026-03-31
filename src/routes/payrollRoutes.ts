import { Router } from 'express';
import { sendPayrollEmailController } from '../controllers/payrollController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// POST /api/payroll/send-email
router.post('/send-email', protect, sendPayrollEmailController);

export default router;
