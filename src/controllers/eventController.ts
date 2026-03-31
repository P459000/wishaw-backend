import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Event from '../models/Event';
import User from '../models/User';
import { sendEventRegistrationConfirmation, sendStaffAssignmentEmail, sendStudentOnboardingEmail } from '../services/emailService';
import Student from '../models/Student';

// @desc    Admin onboards a student (by familyId string) to an event
// @route   POST /api/events/:id/onboard
// @access  Private/Admin
export const onboardStudentToEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { familyId } = req.body;
    if (!familyId) {
      res.status(400).json({ message: 'familyId is required' });
      return;
    }
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    const alreadyOnboarded = (event.registeredFamilies as any[]).some(
      (id: any) => id.toString() === familyId
    );
    if (alreadyOnboarded) {
      res.status(400).json({ message: 'Student is already onboarded to this event.' });
      return;
    }
    (event.registeredFamilies as any[]).push(familyId);
    await event.save();

    res.status(200).json({ message: 'Student onboarded successfully', event });

    // Non-blocking: send onboarding emails to all guardians
    Promise.all([
      Student.findOne({ familyId }),
      Event.findById(req.params.id).populate('assignedStaff', 'firstName lastName roleType phoneNumber emailId'),
    ]).then(([student, populatedEvent]) => {
      if (!student || !populatedEvent) return;

      const childName = `${student.child.firstName} ${student.child.lastName}`;
      const staffList = (populatedEvent.assignedStaff as any[]) || [];

      const staffPayload = staffList.map((s: any) => ({
        firstName: s.firstName,
        lastName: s.lastName,
        roleType: s.roleType,
        phoneNumber: s.phoneNumber,
        emailId: s.emailId,
      }));

      const basePayload = {
        childName,
        familyId: student.familyId,
        eventName: populatedEvent.eventName,
        location: populatedEvent.location,
        sessionType: populatedEvent.sessionType,
        sessionTime: populatedEvent.sessionTime,
        date: populatedEvent.date,
        startTime: populatedEvent.startTime,
        endTime: populatedEvent.endTime,
        assignedStaff: staffPayload,
      };

      // Collect all guardians with emails
      const recipients = [
        { name: student.primaryGuardian.name, email: student.primaryGuardian.email, relationship: student.primaryGuardian.relationshipToChild },
        ...(student.additionalGuardians || [])
          .filter((g: any) => g.email)
          .map((g: any) => ({ name: g.name, email: g.email, relationship: g.relationshipToChild })),
      ].filter(r => r.email);

      recipients.forEach(recipient => {
        sendStudentOnboardingEmail({
          ...basePayload,
          guardianName: recipient.name,
          guardianEmail: recipient.email!,
          relationship: recipient.relationship,
        }).catch(err => {
          console.error(`[EventController] Onboarding email failed for ${recipient.email}:`, err.message);
        });
      });
    }).catch(err => {
      console.error('[EventController] Failed to send onboarding emails:', err.message);
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to onboard student' });
  }
};

// @desc    Admin removes a student (by familyId string) from an event
// @route   DELETE /api/events/:id/onboard
// @access  Private/Admin
export const removeStudentFromEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { familyId } = req.body;
    if (!familyId) {
      res.status(400).json({ message: 'familyId is required' });
      return;
    }
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    const idx = (event.registeredFamilies as any[]).findIndex(
      (id: any) => id.toString() === familyId
    );
    if (idx === -1) {
      res.status(400).json({ message: 'Student is not onboarded to this event.' });
      return;
    }
    event.registeredFamilies.splice(idx, 1);
    await event.save();
    res.status(200).json({ message: 'Student removed from event', event });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to remove student' });
  }
};

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
    const events = await Event.find({})
      .populate('assignedStaff', 'firstName lastName roleType phoneNumber emailId')
      .sort({ date: 1 });
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

    // Non-blocking: send assignment emails to newly added staff only
    if (addedStaff.length > 0) {
      User.find({ _id: { $in: addedStaff } }, 'firstName lastName emailId').then(staffMembers => {
        staffMembers.forEach(staff => {
          if (!staff.emailId) return;
          sendStaffAssignmentEmail({
            staffFirstName: staff.firstName,
            staffLastName: staff.lastName,
            staffEmail: staff.emailId,
            eventName: event.eventName,
            location: event.location,
            sessionType: event.sessionType,
            sessionTime: event.sessionTime,
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
          }).catch(err => {
            console.error(`[EventController] Failed to send assignment email to ${staff.emailId}:`, err.message);
          });
        });
      }).catch(err => {
        console.error('[EventController] Failed to fetch newly assigned staff for emails:', err.message);
      });
    }
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
