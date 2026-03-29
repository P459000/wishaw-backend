import { Response } from 'express';
import User from '../models/User';
import Event from '../models/Event';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendApprovalEmail } from '../services/emailService';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to retrieve profile' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update only the fields that were provided
    if (req.body.qualifications !== undefined) {
      // Filter out invalid items just to be safe
      const validQualifications = ['sportsactivity', 'yogatraining', 'volunteering', 'mentorship training'];
      const incomingQuals = (req.body.qualifications as string[]) || [];
      user.qualifications = incomingQuals.filter((q) => validQualifications.includes(q));
    }
    
    if (req.body.hoursPerWeek !== undefined) {
      user.hoursPerWeek = Number(req.body.hoursPerWeek);
    }

    if (req.body.availableFrom !== undefined) {
      user.availableFrom = req.body.availableFrom;
    }

    if (req.body.availableTo !== undefined) {
      user.availableTo = req.body.availableTo;
    }

    if (req.body.willingToVolunteer !== undefined) {
      user.willingToVolunteer = Boolean(req.body.willingToVolunteer);
      if (user.willingToVolunteer) {
        user.status = 'PENDING';
      }
    }

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id.toString(),
      emailId: updatedUser.emailId,
      firstName: updatedUser.firstName,
      middleName: updatedUser.middleName,
      lastName: updatedUser.lastName,
      phoneNumber: updatedUser.phoneNumber,
      gender: updatedUser.gender,
      qualifications: updatedUser.qualifications,
      hoursPerWeek: updatedUser.hoursPerWeek,
      status: updatedUser.status,
      willingToVolunteer: updatedUser.willingToVolunteer,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Invalid profile data' });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUserProfiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// @desc    Update user status
// @route   PATCH /api/users/:id/status
// @access  Private/Admin
export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, assignedEventIds } = req.body;
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.status = status;

    // Handle atomic Assignment logic + email notification
    if (status === 'APPROVED' && Array.isArray(assignedEventIds)) {
      user.assignedEvents = assignedEventIds;

      if (assignedEventIds.length > 0) {
        await Event.updateMany(
          { _id: { $in: assignedEventIds } },
          { $addToSet: { assignedStaff: user._id } }
        );
      }
    }

    const updatedUser = await user.save();

    // Fire approval email (non-blocking — do not fail the request if email fails)
    if (status === 'APPROVED') {
      try {
        let eventDetails: any[] = [];
        if (Array.isArray(assignedEventIds) && assignedEventIds.length > 0) {
          eventDetails = await Event.find({ _id: { $in: assignedEventIds } }).lean();
        }
        await sendApprovalEmail(
          user.emailId,
          user.firstName,
          eventDetails.map((e: any) => ({
            eventName: e.eventName,
            location: e.location,
            hours: e.hours,
            startDate: e.startDate,
            endDate: e.endDate,
          }))
        );
      } catch (emailErr) {
        console.error('[EmailService] Failed to send approval email:', emailErr);
        // Intentionally does NOT block the response — user is still approved
      }
    }

    res.status(200).json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update user status' });
  }
};
