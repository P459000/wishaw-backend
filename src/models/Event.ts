import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  eventName: string;
  location: string;
  hours: number;
  personsNeeded: number;
  qualifications: string[];
  startDate: string;
  endDate: string;
  assignedStaff: mongoose.Types.ObjectId[];
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
    hours: {
      type: Number,
      required: true,
      min: 1,
    },
    personsNeeded: {
      type: Number,
      required: true,
      min: 1,
    },
    qualifications: [
      {
        type: String,
        enum: ['sportsactivity', 'yogatraining', 'volunteering', 'mentorship training'],
      },
    ],
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    assignedStaff: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
