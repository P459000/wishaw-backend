import express from 'express';
import { getProfile, updateProfile, getUserProfiles, updateUserStatus, getUserById, updateUserByIdProfile, createStaffUser } from '../controllers/userController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

router.route('/')
  .get(protect, admin, getUserProfiles)
  .post(protect, admin, createStaffUser);

router.patch('/:id/status', protect, admin, updateUserStatus);

router.route('/:id')
  .get(protect, admin, getUserById);

router.route('/:id/profile')
  .put(protect, admin, updateUserByIdProfile);

export default router;
