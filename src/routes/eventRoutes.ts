import express from 'express';
import { createEvent, getEvents } from '../controllers/eventController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .post(protect, admin, createEvent)
  .get(protect, admin, getEvents);

export default router;
