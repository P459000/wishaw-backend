import express from 'express';
import { registerStudent, getAllStudents, loginFamily, getMyProfile, updateMyProfile } from '../controllers/studentController';
import { protect, admin, protectFamily } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', registerStudent);
router.post('/login', loginFamily);
router.get('/me', protectFamily, getMyProfile);
router.put('/me', protectFamily, updateMyProfile);
router.get('/', protect, admin, getAllStudents);

export default router;


