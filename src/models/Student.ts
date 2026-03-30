import mongoose, { Document, Schema } from 'mongoose';

// ── Guardian ────────────────────────────────────────────────────────────────
interface IGuardian {
  name: string;
  relationshipToChild: string;
  phoneNumber?: string;
  email?: string;
  emergencyContact?: boolean;
  preferredContactMethod?: string;
  preferredLanguage?: string;
  notesForStaff?: string;
}

// ── Child ────────────────────────────────────────────────────────────────────
interface IChild {
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string; // YYYY-MM-DD
  ageGroup?: string;
  gender?: string;
  school?: string;
}

// ── Support ──────────────────────────────────────────────────────────────────
interface ISupport {
  mobilitySupportRequired?: boolean;
  visualImpairment?: boolean;
  hearingImpairment?: boolean;
  neurodivergentSupport?: boolean;
  medicalNeeds?: string;
  dietaryRequirements?: string[];
  requiresOneToOneSupport?: boolean;
  prefersQuietSpaces?: boolean;
  strugglesWithLargeGroups?: boolean;
  communicationPreference?: string;
  triggersOrThingsToAvoid?: string;
}

// ── Participation ─────────────────────────────────────────────────────────────
interface IParticipation {
  regularAttendee?: boolean;
  canAttendWithoutPrebooking?: boolean;
  typicalAvailability?: string;
  transportSupportNeeded?: boolean;
}

// ── Consent ───────────────────────────────────────────────────────────────────
interface IConsent {
  dataConsentAccepted: boolean;
  safeguardingConsentAccepted: boolean;
  photoConsent?: boolean;
  emergencyMedicalConsent?: boolean;
  confidentialityRenewalDate?: string;
}

// ── Top-level document ────────────────────────────────────────────────────────
export interface IStudent extends Document {
  familyId: string;
  primaryGuardian: IGuardian;
  additionalGuardians?: IGuardian[];
  child: IChild;
  support?: ISupport;
  participation?: IParticipation;
  consent: IConsent;
  supportLevel?: 'Low' | 'Medium' | 'High';
  riskFlags?: string[];
  staffNotes?: string;
  referralSource?: string;
  studentStatus: 'Active' | 'Inactive';
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────
const guardianSchema = new Schema({
  name: { type: String, required: true },
  relationshipToChild: { type: String, required: true },
  phoneNumber: String,
  email: String,
  emergencyContact: { type: Boolean, default: false },
  preferredContactMethod: String,
  preferredLanguage: String,
  notesForStaff: String,
}, { _id: false });

const studentSchema = new Schema<IStudent>(
  {
    familyId: { type: String, unique: true },
    primaryGuardian: { type: guardianSchema, required: true },
    additionalGuardians: [guardianSchema],
    child: {
      firstName: { type: String, required: true },
      lastName:  { type: String, required: true },
      preferredName: String,
      dateOfBirth: { type: String, required: true },
      ageGroup: String,
      gender: String,
      school: String,
    },
    support: {
      mobilitySupportRequired: { type: Boolean, default: false },
      visualImpairment:        { type: Boolean, default: false },
      hearingImpairment:       { type: Boolean, default: false },
      neurodivergentSupport:   { type: Boolean, default: false },
      medicalNeeds: String,
      dietaryRequirements: [String],
      requiresOneToOneSupport: { type: Boolean, default: false },
      prefersQuietSpaces:      { type: Boolean, default: false },
      strugglesWithLargeGroups:{ type: Boolean, default: false },
      communicationPreference: String,
      triggersOrThingsToAvoid: String,
    },
    participation: {
      regularAttendee:            { type: Boolean, default: false },
      canAttendWithoutPrebooking: { type: Boolean, default: false },
      typicalAvailability: String,
      transportSupportNeeded: { type: Boolean, default: false },
    },
    consent: {
      dataConsentAccepted:          { type: Boolean, required: true },
      safeguardingConsentAccepted:  { type: Boolean, required: true },
      photoConsent:                 { type: Boolean, default: false },
      emergencyMedicalConsent:      { type: Boolean, default: false },
      confidentialityRenewalDate:   String,
    },
    supportLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    riskFlags:    [String],
    staffNotes:   String,
    referralSource: String,
    studentStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
  },
  { timestamps: true }
);

// Auto-generate familyId before save if not already set
studentSchema.pre('save', async function(this: any) {
  if (!this.familyId) {
    const StudentModel = mongoose.models['Student'];
    const count = StudentModel ? await StudentModel.countDocuments() : 0;
    this.familyId = `FAM-${String(count + 1).padStart(5, '0')}`;
  }
});

export default mongoose.model<IStudent>('Student', studentSchema);
