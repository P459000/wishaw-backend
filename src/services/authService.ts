import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export interface RegisterPayload {
  emailId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  gender: 'male' | 'female' | 'other';
  password: string;
}

export interface LoginPayload {
  emailId: string;
  password: string;
}

export interface AuthResponse {
  _id: string;
  emailId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  gender: string;
  qualifications?: string[];
  hoursPerWeek?: number;
  status: string;
  availableFrom?: string;
  availableTo?: string;
  willingToVolunteer: boolean;
  role: string;
  token: string;
}

const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign({ id }, secret, { expiresIn: '7d' });
};

export const registerUser = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const { emailId, firstName, middleName, lastName, phoneNumber, gender, password } = payload;

  // Check if user already exists
  const existingUser = await User.findOne({ emailId: emailId.toLowerCase() });
  if (existingUser) {
    throw new Error('A user with this email already exists');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user: IUser = await User.create({
    emailId: emailId.toLowerCase(),
    firstName,
    middleName,
    lastName,
    phoneNumber,
    gender,
    password: hashedPassword,
  });

  return {
    _id: (user._id as unknown as string).toString(),
    emailId: user.emailId,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    gender: user.gender,
    qualifications: user.qualifications,
    hoursPerWeek: user.hoursPerWeek,
    status: user.status,
    availableFrom: user.availableFrom,
    availableTo: user.availableTo,
    willingToVolunteer: user.willingToVolunteer,
    role: user.role,
    token: generateToken((user._id as unknown as string).toString()),
  };
};

export const loginUser = async (payload: LoginPayload): Promise<AuthResponse> => {
  const { emailId, password } = payload;

  const user = await User.findOne({ emailId: emailId.toLowerCase() });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  return {
    _id: (user._id as unknown as string).toString(),
    emailId: user.emailId,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    gender: user.gender,
    qualifications: user.qualifications,
    hoursPerWeek: user.hoursPerWeek,
    status: user.status,
    availableFrom: user.availableFrom,
    availableTo: user.availableTo,
    willingToVolunteer: user.willingToVolunteer,
    role: user.role,
    token: generateToken((user._id as unknown as string).toString()),
  };
};
