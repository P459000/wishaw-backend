import { Request, Response } from 'express';
import * as authService from '../services/authService';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailId, firstName, middleName, lastName, phoneNumber, gender, password } = req.body;

    if (!emailId || !firstName || !lastName || !gender || !password) {
      res.status(400).json({ message: 'Please fill in all required fields' });
      return;
    }

    const user = await authService.registerUser({
      emailId,
      firstName,
      middleName,
      lastName,
      phoneNumber,
      gender,
      password,
    });

    res.status(201).json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    res.status(400).json({ message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailId, password } = req.body;

    if (!emailId || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    const user = await authService.loginUser({ emailId, password });
    res.status(200).json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    res.status(401).json({ message });
  }
};
