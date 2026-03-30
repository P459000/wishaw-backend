import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Student from '../models/Student';
import { sendStudentRegistrationEmail } from '../services/emailService';
import { AuthRequest } from '../middleware/authMiddleware';

const generateToken = (id: string): string =>
  jwt.sign({ id, role: 'family' }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

// @desc   Register a new student/child
// @route  POST /api/students
// @access Public
export const registerStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { primaryGuardian, additionalGuardians, child, support, participation, consent, referralSource, password } = req.body;

    if (!primaryGuardian || !child || !consent) {
      res.status(400).json({ message: 'Primary guardian, child details, and consent are required.' });
      return;
    }

    if (!primaryGuardian.email) {
      res.status(400).json({ message: 'Primary guardian email address is required.' });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters.' });
      return;
    }

    if (!consent.dataConsentAccepted || !consent.safeguardingConsentAccepted) {
      res.status(400).json({ message: 'Data and safeguarding consent must be accepted.' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const student = await Student.create({
      primaryGuardian,
      additionalGuardians: additionalGuardians || [],
      child,
      support: support || {},
      participation: participation || {},
      consent,
      referralSource: referralSource || 'Self-Registration',
      studentStatus: 'Active',
      password: hashedPassword,
    });

    const token = generateToken((student._id as any).toString());

    // Respond immediately
    res.status(201).json({
      message: 'Student registered successfully!',
      familyId: student.familyId,
      studentId: student._id,
      token,
      family: {
        familyId: student.familyId,
        guardianName: primaryGuardian.name,
        guardianEmail: primaryGuardian.email,
        childFirstName: child.firstName,
        childLastName: child.lastName,
        role: 'family',
      },
    });

    // Non-blocking emails
    const childName = `${child.firstName} ${child.lastName}`;

    sendStudentRegistrationEmail({
      guardianName: primaryGuardian.name,
      guardianEmail: primaryGuardian.email,
      childName,
      familyId: student.familyId,
      isEmergencyContact: false,
    }).catch((err: Error) => {
      console.error('[StudentController] Primary guardian email failed:', err.message);
    });

    if (Array.isArray(additionalGuardians)) {
      for (const ag of additionalGuardians) {
        if (ag.email) {
          sendStudentRegistrationEmail({
            guardianName: ag.name || 'Guardian',
            guardianEmail: ag.email,
            childName,
            familyId: student.familyId,
            isEmergencyContact: true,
          }).catch((err: Error) => {
            console.error(`[StudentController] Additional guardian email failed (${ag.email}):`, err.message);
          });
        }
      }
    }

  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Registration failed.' });
  }
};

// @desc   Login with familyId + password
// @route  POST /api/students/login
// @access Public
export const loginFamily = async (req: Request, res: Response): Promise<void> => {
  try {
    const { familyId, password } = req.body;

    if (!familyId || !password) {
      res.status(400).json({ message: 'Family ID and password are required.' });
      return;
    }

    const student = await Student.findOne({ familyId: familyId.toUpperCase() });
    if (!student) {
      res.status(401).json({ message: 'Invalid Family ID or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid Family ID or password.' });
      return;
    }

    const token = generateToken((student._id as any).toString());

    res.status(200).json({
      message: 'Login successful',
      token,
      family: {
        familyId: student.familyId,
        guardianName: student.primaryGuardian.name,
        guardianEmail: student.primaryGuardian.email,
        childFirstName: student.child.firstName,
        childLastName: student.child.lastName,
        role: 'family',
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Login failed.' });
  }
};

// @desc   Get all students (admin only)
// @route  GET /api/students
// @access Private/Admin
export const getAllStudents = async (_req: Request, res: Response): Promise<void> => {
  try {
    const students = await Student.find({}).sort({ createdAt: -1 }).select('-password');
    res.status(200).json(students);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch students.' });
  }
};

// @desc   Get my profile
// @route  GET /api/students/me
// @access Private/Family
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json(req.family);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

// @desc   Update my profile
// @route  PUT /api/students/me
// @access Private/Family
export const updateMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student = await Student.findById(req.family._id);
    if (!student) {
      res.status(404).json({ message: 'Profile not found.' });
      return;
    }

    const { primaryGuardian, additionalGuardians, child, support, participation } = req.body;

    if (primaryGuardian) {
      student.primaryGuardian = { ...JSON.parse(JSON.stringify(student.primaryGuardian)), ...primaryGuardian };
    }
    if (additionalGuardians !== undefined) student.additionalGuardians = additionalGuardians;
    if (child) student.child = { ...JSON.parse(JSON.stringify(student.child)), ...child };
    if (support) student.support = { ...JSON.parse(JSON.stringify(student.support ?? {})), ...support };
    if (participation) student.participation = { ...JSON.parse(JSON.stringify(student.participation ?? {})), ...participation };

    await student.save();

    const updated = student.toObject();
    delete (updated as any).password;
    res.status(200).json({ message: 'Profile updated successfully.', student: updated });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update profile.' });
  }
};
