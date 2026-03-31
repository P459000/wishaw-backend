import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Event from '../models/Event';
import Student from '../models/Student';
import Attendance, { AttendanceStatus } from '../models/Attendance';

// GET /api/attendance/:eventId
// Returns { event, enrolledStudents, attendanceMap }
export const getEventAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) { res.status(404).json({ message: 'Event not found' }); return; }

    const registeredFamilies: string[] = (event.registeredFamilies as any[]) || [];

    // Fetch all students for registered families
    const students = await Student.find(
      { familyId: { $in: registeredFamilies } },
      'familyId child.firstName child.lastName primaryGuardian.name'
    );

    // Fetch existing attendance records
    const records = await Attendance.find({ eventId });
    const attendanceMap: Record<string, string> = {};
    records.forEach(r => { attendanceMap[r.familyId] = r.status; });

    res.status(200).json({
      event: {
        _id: event._id,
        eventName: event.eventName,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        sessionType: event.sessionType,
        totalEnrolled: registeredFamilies.length,
      },
      enrolledStudents: students.map(s => ({
        familyId: s.familyId,
        childName: `${s.child.firstName} ${s.child.lastName}`,
        guardianName: s.primaryGuardian.name,
      })),
      attendanceMap, // { familyId: 'PRESENT' | 'ABSENT' | 'LATE' }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch attendance' });
  }
};

// POST /api/attendance/:eventId/mark
// Body: { records: [{ familyId, childName, status }] }
export const markAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { records } = req.body as { records: { familyId: string; childName: string; status: string }[] };

    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ message: 'records array is required' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) { res.status(404).json({ message: 'Event not found' }); return; }

    // ⚠️  bulkWrite does NOT auto-cast strings → ObjectId, so we must cast explicitly
    const oid = event._id;   // already an ObjectId from findById

    const ops = records.map(r => ({
      updateOne: {
        filter: { eventId: oid, familyId: r.familyId },
        update: {
          $set: {
            status:    r.status as AttendanceStatus,
            childName: r.childName,
            markedAt:  new Date(),
          } as any,
          $setOnInsert: { eventId: oid },   // ensure correct type on insert
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(ops);

    const updated = await Attendance.find({ eventId: oid });
    res.status(200).json({ message: 'Attendance saved', count: updated.length, records: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to mark attendance' });
  }
};


// GET /api/attendance/stats/events
// Returns per-event attendance counts for admin bar charts
export const getEventAttendanceStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all events that have at least one registered family
    const events = await Event.find(
      { $expr: { $gt: [{ $size: { $ifNull: ['$registeredFamilies', []] } }, 0] } },
      'eventName date sessionType registeredFamilies'
    ).sort({ date: -1 }).limit(12); // last 12 events

    const results = await Promise.all(events.map(async (e) => {
      const enrolled = (e.registeredFamilies || []).length;
      const records  = await Attendance.find({ eventId: e._id });
      const present  = records.filter(r => r.status === 'PRESENT').length;
      const absent   = records.filter(r => r.status === 'ABSENT').length;
      const late     = records.filter(r => r.status === 'LATE').length;
      const marked   = present + absent + late;
      const rate     = enrolled > 0 ? Math.round(((present + late) / enrolled) * 100) : 0;
      // Short label for x-axis
      const label = e.eventName.length > 14 ? e.eventName.slice(0, 12) + '…' : e.eventName;
      return { eventId: e._id, label, eventName: e.eventName, date: e.date, sessionType: e.sessionType, enrolled, present, absent, late, marked, rate };
    }));

    // Return oldest-first so bar chart reads left→right chronologically
    res.status(200).json(results.reverse());
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch event attendance stats' });
  }
};

// GET /api/attendance/metrics/overview
// Returns cross-event attendance metrics
export const getAttendanceMetrics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const total    = await Attendance.countDocuments();
    const present  = await Attendance.countDocuments({ status: 'PRESENT' });
    const absent   = await Attendance.countDocuments({ status: 'ABSENT' });
    const late     = await Attendance.countDocuments({ status: 'LATE' });

    res.status(200).json({ total, present, absent, late });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch metrics' });
  }
};

// GET /api/attendance/family/:familyId
// Returns attendance records mapped to their events — for the guardian dashboard
export const getFamilyAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { familyId } = req.params;

    // All events this family is onboarded in
    const events = await Event.find(
      { registeredFamilies: familyId },
      'eventName date sessionType startTime endTime'
    ).sort({ date: 1 });

    if (events.length === 0) { res.status(200).json([]); return; }

    const eventIds = events.map(e => e._id);

    // All attendance records for this family in those events
    const records = await Attendance.find({ eventId: { $in: eventIds }, familyId });

    const recordMap: Record<string, string> = {};
    records.forEach(r => { recordMap[r.eventId.toString()] = r.status; });

    const result = events.map(e => ({
      eventId:     e._id,
      eventName:   e.eventName,
      date:        e.date,
      sessionType: e.sessionType,
      startTime:   e.startTime,
      endTime:     e.endTime,
      status:      recordMap[e._id.toString()] || 'NOT_MARKED',
    }));

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch family attendance' });
  }
};
