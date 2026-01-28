import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Application from './models/application.model.js';
import University from './models/university.model.js';
import User from './models/user.model.js';

dotenv.config();

const createMoreApps = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'ranjanutkarsh678@gmail.com' });
    const universities = await University.find({}).limit(3);
    
    console.log('User:', user ? 'Found' : 'Not found');
    console.log('Universities found:', universities.length);
    
    if (user && universities.length >= 2) {
      // Create second application
      const app2 = new Application({
        user: user._id,
        university: universities[1]._id,
        program: 'Master of Engineering in AI',
        gpa: 3.6,
        deadline: new Date('2024-12-20'),
        status: 'In Progress',
        documents: [{ name: 'Transcript.pdf', type: 'Transcript', status: 'Approved' }],
        progress: 30,
        nextStep: 'Upload statement of purpose'
      });
      
      await app2.save();
      console.log('✅ Second application created:', app2._id);
      
      // Create third application
      const app3 = new Application({
        user: user._id,
        university: universities[2]._id,
        program: 'PhD in Computer Science',
        gpa: 3.9,
        deadline: new Date('2025-01-15'),
        status: 'Submitted',
        documents: [
          { name: 'Transcript.pdf', type: 'Transcript', status: 'Approved' },
          { name: 'SOP.pdf', type: 'Statement of Purpose', status: 'Approved' },
          { name: 'Resume.pdf', type: 'Resume', status: 'Approved' }
        ],
        progress: 100,
        nextStep: 'Awaiting university decision',
        submittedDate: new Date('2024-11-01')
      });
      
      await app3.save();
      console.log('✅ Third application created:', app3._id);
    }
    
    const finalCount = await Application.countDocuments({ user: user._id });
    console.log('🎯 Total applications:', finalCount);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createMoreApps();
