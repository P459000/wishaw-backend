import mongoose from 'mongoose';
import Event from './models/Event';
import Student from './models/Student';
import User from './models/User';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/youth_charity';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB...');

    // Clean up specific test data to avoid duplicates
    await Event.deleteMany({ eventName: { $in: ['Summer Sports Camp (Past)', 'Weekly Yoga (Current)', 'Mentorship Workshop (Upcoming)'] } });
    await User.deleteMany({ emailId: { $in: ['john.staff@test.com', 'sarah.staff@test.com'] } });
    await Student.deleteMany({ 'child.firstName': { $in: ['Varsha', 'Rahul', 'Priya', 'Amit', 'Aisha'] } });

    console.log('Creating Staff...');
    const staff1 = await User.create({
      emailId: 'john.staff@test.com',
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      password: 'password123',
      roleType: 'Youth Worker',
      skills: ['Youth Work'],
      specificAvailability: [
        { date: '2025-05-15', startTime: '08:00', endTime: '18:00', isWorking: true },
        { date: '2025-05-16', startTime: '09:00', endTime: '17:00', isWorking: true },
      ],
      holidayDates: [],
      status: 'APPROVED',
      willingToVolunteer: true,
      role: 'user'
    }) as any;

    const staff2 = await User.create({
      emailId: 'sarah.staff@test.com',
      firstName: 'Sarah',
      lastName: 'Smith',
      gender: 'female',
      password: 'password123',
      roleType: 'ASC Staff',
      skills: ['ASC', 'Drama'],
      specificAvailability: [
        { date: '2025-05-15', startTime: '12:00', endTime: '20:00', isWorking: true },
        { date: '2025-05-16', startTime: '14:00', endTime: '22:00', isWorking: true },
      ],
      holidayDates: [],
      status: 'APPROVED',
      willingToVolunteer: true,
      role: 'user'
    }) as any;

    console.log('Creating Students...');
    const createStudent = async (firstName: string, lastName: string, dob: string) => {
      return await Student.create({
        primaryGuardian: {
          name: `Guardian of ${firstName}`,
          relationshipToChild: 'Parent',
          phoneNumber: '1234567890',
        },
        child: {
          firstName,
          lastName,
          dateOfBirth: dob,
          ageGroup: '8-12',
          gender: 'female',
        },
        support: { mobilitySupportRequired: false },
        participation: { regularAttendee: true },
        consent: { dataConsentAccepted: true, safeguardingConsentAccepted: true },
        password: 'password123',
        studentStatus: 'Active'
      });
    };

    const varsha = await createStudent('Varsha', 'Sharma', '2010-05-15') as any;
    const rahul = await createStudent('Rahul', 'Kumar', '2011-08-20') as any;
    const priya = await createStudent('Priya', 'Singh', '2012-01-10') as any;
    const amit = await createStudent('Amit', 'Patel', '2013-11-05') as any;
    const aisha = await createStudent('Aisha', 'Khan', '2014-02-28') as any;

    console.log('Creating Events...');
    const today = new Date();
    
    // Past Event (2 weeks ago - let's say a Wednesday)
    const pastStart = new Date(today); pastStart.setDate(today.getDate() - 14);
    
    // Current Event (Today)
    const currentStart = new Date(today);
    
    // Upcoming Event (Next Week)
    const futureStart = new Date(today); futureStart.setDate(today.getDate() + 7);

    const pastEvent = await Event.create({
      eventName: 'Summer Sports Camp (Past)',
      location: 'Community Center',
      sessionType: 'General',
      sessionTime: 'MORNING_TO_AFTERNOON',
      date: pastStart.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '13:00',
      requiredYouthWorkers: 2,
      requiredSessionSupport: 1,
      assignedStaff: [staff1._id],
      registeredFamilies: [varsha._id, rahul._id, priya._id]
    });

    const currentEvent = await Event.create({
      eventName: 'Weekly Drama (Current)',
      location: 'Main Hall',
      sessionType: 'Drama',
      sessionTime: 'AFTERNOON_TO_EVENING',
      date: currentStart.toISOString().split('T')[0],
      startTime: '15:00',
      endTime: '18:00',
      requiredYouthWorkers: 2,
      requiredSessionSupport: 0,
      assignedStaff: [staff1._id, staff2._id],
      registeredFamilies: [varsha._id, aisha._id, amit._id, rahul._id]
    });

    const futureEvent = await Event.create({
      eventName: 'ASC Support Group (Upcoming)',
      location: 'Library',
      sessionType: 'ASC',
      sessionTime: 'MORNING_TO_AFTERNOON',
      date: futureStart.toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '14:00',
      requiredYouthWorkers: 3,
      requiredSessionSupport: 1,
      assignedStaff: [staff2._id],
      registeredFamilies: [priya._id, amit._id, aisha._id]
    });

    console.log('Seed data successfully created!');
    console.log(`Created 3 Events, 2 Staff, 5 Students.`);
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB.');
  }
};

seedData();
