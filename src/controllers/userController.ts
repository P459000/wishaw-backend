import { Response } from 'express';
import User from '../models/User';
import Event from '../models/Event';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendApprovalEmail } from '../services/emailService';
import bcrypt from 'bcryptjs';

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
    if (req.body.roleType !== undefined) {
      user.roleType = req.body.roleType;
    }
    
    if (req.body.skills !== undefined) {
      const validSkills = ['Drama', 'ASC', 'Youth Work'];
      const incomingSkills = (req.body.skills as string[]) || [];
      user.skills = incomingSkills.filter((s) => validSkills.includes(s));
    }

    if (req.body.specificAvailability !== undefined) {
      if (Array.isArray(req.body.specificAvailability)) {
        user.specificAvailability = req.body.specificAvailability;
      }
    }

    if (req.body.holidayDates !== undefined) {
      user.holidayDates = req.body.holidayDates;
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
      roleType: updatedUser.roleType,
      skills: updatedUser.skills,
      specificAvailability: updatedUser.specificAvailability,
      holidayDates: updatedUser.holidayDates,
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
            sessionType: e.sessionType,
            date: e.date,
            startTime: e.startTime,
            endTime: e.endTime,
          })),
          {
            roleType: user.roleType,
            skills: user.skills,
            employmentType: user.employmentType,
            fixedSalary: user.fixedSalary,
            hourlyRate: user.hourlyRate,
          }
        );
      } catch (emailErr) {
        console.error('[EmailService] Failed to send approval email:', emailErr);
      }
    }

    res.status(200).json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update user status' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to retrieve user profile' });
  }
};

// @desc    Update user specific profile by admin
// @route   PUT /api/users/:id/profile
// @access  Private/Admin
export const updateUserByIdProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (req.body.firstName !== undefined) user.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
    if (req.body.emailId !== undefined) user.emailId = req.body.emailId;
    if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber;
    if (req.body.gender !== undefined) user.gender = req.body.gender;

    if (req.body.roleType !== undefined) {
      user.roleType = req.body.roleType;
    }
    
    if (req.body.skills !== undefined) {
      const validSkills = ['Drama', 'ASC', 'Youth Work'];
      const incomingSkills = (req.body.skills as string[]) || [];
      user.skills = incomingSkills.filter((s) => validSkills.includes(s));
    }

    if (req.body.specificAvailability !== undefined) {
      if (Array.isArray(req.body.specificAvailability)) {
        user.specificAvailability = req.body.specificAvailability;
      }
    }

    if (req.body.holidayDates !== undefined) {
      user.holidayDates = req.body.holidayDates;
    }

    if (req.body.willingToVolunteer !== undefined) {
      user.willingToVolunteer = Boolean(req.body.willingToVolunteer);
    }

    if (req.body.employmentType !== undefined) {
      user.employmentType = req.body.employmentType === '' ? undefined : req.body.employmentType;
    }
    if (req.body.fixedSalary !== undefined) {
      user.fixedSalary = req.body.fixedSalary === '' ? undefined : req.body.fixedSalary;
    }
    if (req.body.hourlyRate !== undefined) {
      user.hourlyRate = req.body.hourlyRate === '' ? undefined : req.body.hourlyRate;
    }

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Invalid profile data' });
  }
};

// @desc    Create a brand new staff user by admin
// @route   POST /api/users
// @access  Private/Admin
export const createStaffUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      firstName, lastName, emailId, password, phoneNumber, gender,
      roleType, skills, specificAvailability, holidayDates, willingToVolunteer,
      employmentType, fixedSalary, hourlyRate
    } = req.body;

    const userExists = await User.findOne({ emailId: emailId.toLowerCase() });
    if (userExists) {
      res.status(400).json({ message: 'A user with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordToHash = password || 'OyciStaff123!';
    const hashedPassword = await bcrypt.hash(passwordToHash, salt);

    const validSkills = ['Drama', 'ASC', 'Youth Work'];
    const incomingSkills = (skills as string[]) || [];

    const user = await User.create({
      firstName,
      lastName,
      emailId: emailId.toLowerCase(),
      password: hashedPassword,
      phoneNumber,
      gender,
      role: 'user',
      status: 'APPROVED',
      
      roleType: roleType || 'Youth Worker',
      skills: incomingSkills.filter((s) => validSkills.includes(s)),
      specificAvailability: specificAvailability || [],
      holidayDates: holidayDates || [],
      willingToVolunteer: Boolean(willingToVolunteer),
      employmentType: employmentType || undefined,
      fixedSalary: fixedSalary || undefined,
      hourlyRate: hourlyRate || undefined
    });

    res.status(201).json({
      _id: user._id,
      emailId: user.emailId,
      firstName: user.firstName,
      status: user.status
    });

    // Fire welcome/onboarding email (non-blocking)
    sendApprovalEmail(
      user.emailId,
      user.firstName,
      [], // no events assigned yet at creation time
      {
        roleType: user.roleType,
        skills: user.skills,
        employmentType: user.employmentType,
        fixedSalary: user.fixedSalary,
        hourlyRate: user.hourlyRate,
      }
    ).catch((err: any) => console.error('[EmailService] Direct-create onboarding email failed:', err));
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to create staff user' });
  }
};
