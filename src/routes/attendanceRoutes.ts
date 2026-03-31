import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { getEventAttendance, markAttendance, getAttendanceMetrics, getFamilyAttendance, getEventAttendanceStats } from '../controllers/attendanceController';

const router = Router();

router.get('/metrics/overview',  protect, getAttendanceMetrics);
router.get('/stats/events',      protect, getEventAttendanceStats);
router.get('/family/:familyId',  getFamilyAttendance);
router.get('/:eventId',          protect, getEventAttendance);
router.post('/:eventId/mark',    protect, markAttendance);

export default router;
