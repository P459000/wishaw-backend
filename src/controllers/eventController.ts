import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Event from '../models/Event';
import User from '../models/User';
import { sendEventRegistrationConfirmation } from '../services/emailService';

// @desc    Create a new event
// @route   POST /api/events
// @access  Private/Admin
export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventName, location, sessionType, sessionTime, date, startTime, endTime, requiredYouthWorkers, requiredSessionSupport } = req.body;

    if (!eventName || !location || !sessionType || !sessionTime || !date || !startTime || !endTime) {
       res.status(400).json({ message: 'Please provide all required fields' });
       return;
    }

    const event = await Event.create({
      eventName,
      location,
      sessionType,
      sessionTime,
      date,
      startTime,
      endTime,
      requiredYouthWorkers: Number(requiredYouthWorkers || 2),
      requiredSessionSupport: Number(requiredSessionSupport || 0),
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
    const events = await Event.find({})
      .populate('assignedStaff', 'firstName lastName roleType')
      .sort({ date: 1, startTime: 1 });
    res.status(200).json(events);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch events' });
  }
};

// @desc    Get all events (public listing for families — no auth)
// @route   GET /api/events/family
// @access  Private/Family
export const getFamilyEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Return future events (date >= today), newest first
    const today = new Date().toISOString().split('T')[0];
    const events = await Event.find({ date: { $gte: today } }).sort({ date: 1 });
    res.status(200).json(events);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch events' });
  }
};

// @desc    Register a family for an event
// @route   POST /api/events/:id/register-family
// @access  Private/Family
export const registerFamilyForEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id).populate('assignedStaff', 'firstName lastName emailId phoneNumber');
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const familyId = req.family._id.toString();

    // Check if already registered
    const alreadyRegistered = event.registeredFamilies.some(
      (id: any) => id.toString() === familyId
    );
    if (alreadyRegistered) {
      res.status(400).json({ message: 'You are already registered for this event.' });
      return;
    }

    event.registeredFamilies.push(req.family._id);
    await event.save();

    res.status(200).json({ message: 'Successfully registered for the event!', event });

    // Non-blocking email sending
    const staffArray = event.assignedStaff as any[];
    sendEventRegistrationConfirmation({
      guardianName: req.family.primaryGuardian.name,
      guardianEmail: req.family.primaryGuardian.email,
      childName: `${req.family.child.firstName} ${req.family.child.lastName}`,
      eventName: event.eventName,
      location: event.location,
      sessionType: event.sessionType,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      assignedStaff: staffArray.map(s => ({
        firstName: s.firstName,
        lastName: s.lastName,
        phoneNumber: s.phoneNumber,
        emailId: s.emailId,
      })),
    }).catch(err => {
      console.error('[EventController] Failed to send event registration email:', err.message);
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to register for event' });
  }
};

// @desc    Unregister a family from an event
// @route   DELETE /api/events/:id/register-family
// @access  Private/Family
export const unregisterFamilyFromEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const familyId = req.family._id.toString();
    const idx = event.registeredFamilies.findIndex((id: any) => id.toString() === familyId);
    if (idx === -1) {
      res.status(400).json({ message: 'You are not registered for this event.' });
      return;
    }

    event.registeredFamilies.splice(idx, 1);
    await event.save();

    res.status(200).json({ message: 'Unregistered from event.', event });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to unregister from event' });
  }
};

// @desc    Assign staff to an event
// @route   PATCH /api/events/:id/staff
// @access  Private/Admin
export const assignStaffToEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { staffIds } = req.body; // Array of User IDs
    
    if (!Array.isArray(staffIds)) {
      res.status(400).json({ message: 'staffIds must be an array' });
      return;
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Capture previously assigned so we can remove this event from their queue if they were unselected
    const oldStaffIds = event.assignedStaff.map(id => id.toString());
    const newStaffIds = staffIds;

    // Remove event from users who are no longer assigned
    const removedStaff = oldStaffIds.filter(id => !newStaffIds.includes(id));
    if (removedStaff.length > 0) {
      await User.updateMany(
        { _id: { $in: removedStaff } },
        { $pull: { assignedEvents: event._id } }
      );
    }

    // Add event to newly assigned users
    const addedStaff = newStaffIds.filter(id => !oldStaffIds.includes(id));
    if (addedStaff.length > 0) {
      await User.updateMany(
        { _id: { $in: addedStaff } },
        { $addToSet: { assignedEvents: event._id } }
      );
    }

    // Set exactly the new list on the event
    event.assignedStaff = newStaffIds;
    await event.save();

    res.status(200).json({ message: 'Staff successfully assigned to event', event });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to assign staff to event' });
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private/Admin
export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    const fields = ['eventName', 'location', 'sessionType', 'sessionTime', 'date', 'startTime', 'endTime', 'requiredYouthWorkers', 'requiredSessionSupport', 'isManuallyCompleted'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) (event as any)[f] = req.body[f];
    });
    const updated = await event.save();
    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update event' });
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private/Admin
export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete event' });
  }
};
