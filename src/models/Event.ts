import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  eventName: string;
  location: string;
  sessionType: 'General' | 'ASC' | 'Drama' | 'PIAW';
  sessionTime: 'MORNING_TO_AFTERNOON' | 'AFTERNOON_TO_EVENING' | 'FULL_DAY';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  requiredYouthWorkers: number;
  requiredSessionSupport: number;
  assignedStaff: mongoose.Types.ObjectId[];
  registeredFamilies: mongoose.Types.ObjectId[];
  isManuallyCompleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    sessionType: {
      type: String,
      enum: ['General', 'ASC', 'Drama', 'PIAW'],
      required: true,
    },
    sessionTime: {
      type: String,
      enum: ['MORNING_TO_AFTERNOON', 'AFTERNOON_TO_EVENING', 'FULL_DAY'],
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    requiredYouthWorkers: {
      type: Number,
      required: true,
      default: 2,
    },
    requiredSessionSupport: {
      type: Number,
      required: true,
      default: 0,
    },
    assignedStaff: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    registeredFamilies: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    isManuallyCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
