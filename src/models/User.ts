import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  emailId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  gender: 'male' | 'female' | 'other';
  password: string;
  qualifications?: string[];
  hoursPerWeek?: number;
  availableFrom?: string;
  availableTo?: string;
  status: 'PENDING' | 'REJECTED' | 'APPROVED';
  willingToVolunteer: boolean;
  role: 'user' | 'admin';
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
    qualifications: [{
      type: String,
      enum: ['sportsactivity', 'yogatraining', 'volunteering', 'mentorship training'],
    }],
    hoursPerWeek: {
      type: Number,
      min: [0, 'Hours must be at least 0'],
      max: [168, 'Hours cannot exceed 168 per week'],
    },
    availableFrom: {
      type: String,
    },
    availableTo: {
      type: String,
    },
    status: {
      type: String,
      enum: ['PENDING', 'REJECTED', 'APPROVED'],
      default: 'PENDING',
    },
    willingToVolunteer: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
