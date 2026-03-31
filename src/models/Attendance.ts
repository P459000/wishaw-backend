import mongoose, { Document, Schema } from 'mongoose';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface IAttendance extends Document {
  eventId: mongoose.Types.ObjectId;
  familyId: string;      // e.g. "FAM-00001"
  childName: string;     // snapshot for display
  status: AttendanceStatus;
  markedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    eventId:   { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    familyId:  { type: String, required: true },
    childName: { type: String, default: '' },
    status:    { type: String, enum: ['PRESENT', 'ABSENT', 'LATE'], required: true },
    markedAt:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Unique per event+family combo
AttendanceSchema.index({ eventId: 1, familyId: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
