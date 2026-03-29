import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('MongoDB Connected for Seeding...');

    // Delete existing admin if any
    await User.deleteMany({ role: 'admin' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await User.create({
      emailId: 'admin@wishaw.com',
      firstName: 'System',
      lastName: 'Administrator',
      gender: 'other',
      password: hashedPassword,
      role: 'admin',
      status: 'APPROVED',
      willingToVolunteer: false,
    });

    console.log('Admin user seeded securely. [Email: admin@wishaw.com, Pass: admin123]');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

seedAdmin();
