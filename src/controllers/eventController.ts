import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Event from '../models/Event';

// @desc    Create a new event
// @route   POST /api/events
// @access  Private/Admin
export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventName, location, hours, personsNeeded, qualifications, startDate, endDate } = req.body;

    if (!eventName || !location || !hours || !personsNeeded || !startDate || !endDate) {
       res.status(400).json({ message: 'Please provide all required fields' });
       return;
    }

    const event = await Event.create({
      eventName,
      location,
      hours: Number(hours),
      personsNeeded: Number(personsNeeded),
      qualifications: qualifications || [],
      startDate,
      endDate
    });

    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create event' });
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Private/Admin
export const getEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const events = await Event.find({}).sort({ createdAt: -1 });
    res.status(200).json(events);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch events' });
  }
};
