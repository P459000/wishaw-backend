import express from 'express';
import { getProfile, updateProfile, getUserProfiles, updateUserStatus } from '../controllers/userController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

router.get('/', protect, admin, getUserProfiles);
router.patch('/:id/status', protect, admin, updateUserStatus);

export default router;
