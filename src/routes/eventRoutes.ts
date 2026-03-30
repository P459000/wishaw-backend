import express from 'express';
import {
  createEvent,
  getEvents,
  getFamilyEvents,
  registerFamilyForEvent,
  unregisterFamilyFromEvent,
  assignStaffToEvent,
  updateEvent,
  deleteEvent
} from '../controllers/eventController';
import { protect, admin, protectFamily } from '../middleware/authMiddleware';

const router = express.Router();

// Admin routes
router.route('/')
  .post(protect, admin, createEvent)
  .get(protect, getEvents);

router.patch('/:id/staff', protect, admin, assignStaffToEvent);
router.put('/:id', protect, admin, updateEvent);
router.delete('/:id', protect, admin, deleteEvent);

// Family routes
router.get('/family', protectFamily, getFamilyEvents);
router.post('/:id/register-family', protectFamily, registerFamilyForEvent);
router.delete('/:id/register-family', protectFamily, unregisterFamilyFromEvent);

export default router;
