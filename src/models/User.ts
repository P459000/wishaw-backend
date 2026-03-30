import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  emailId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  gender: 'male' | 'female' | 'other';
  password: string;
  roleType?: 'Youth Worker' | 'Session Support' | 'ASC Staff' | 'Drama Staff';
  skills?: string[];
  specificAvailability?: {
    date: string; // YYYY-MM-DD
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
    isWorking: boolean;
  }[];
  holidayDates?: string[];
  status: 'PENDING' | 'REJECTED' | 'APPROVED';
  willingToVolunteer: boolean;
  role: 'user' | 'admin';
  employmentType?: 'salaried' | 'contractual';
  fixedSalary?: number;
  hourlyRate?: number;
  assignedEvents: mongoose.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}



const userSchema: Schema = new mongoose.Schema(
  {
    emailId: {
      type: String,
      required: [true, 'Email ID is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['male', 'female', 'other'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    roleType: {
      type: String,
      enum: ['Youth Worker', 'Session Support', 'ASC Staff', 'Drama Staff'],
    },
    skills: [{
      type: String,
      enum: ['Drama', 'ASC', 'Youth Work'],
    }],
    specificAvailability: [{
      _id: false,
      date: { type: String, required: true },
      startTime: { type: String },
      endTime: { type: String },
      isWorking: { type: Boolean, required: true, default: false },
    }],
    holidayDates: [{
      type: String, // format YYYY-MM-DD
    }],
    status: {
      type: String,
      enum: ['PENDING', 'REJECTED', 'APPROVED'],
      default: 'PENDING',
    },
    willingToVolunteer: {
      type: Boolean,
      default: false,
    },
    employmentType: {
      type: String,
      enum: ['salaried', 'contractual'],
    },
    fixedSalary: {
      type: Number,
    },
    hourlyRate: {
      type: Number,
    },
    assignedEvents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
    }],
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
