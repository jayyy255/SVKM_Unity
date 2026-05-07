const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Venue = require('./models/Venue');
const Event = require('./models/Event');

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://admin:miniproj123@cluster0.tye7va6.mongodb.net/?appName=Cluster0')
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => console.log(err));

const seedDB = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Venue.deleteMany({});
    await Event.deleteMany({});
    console.log('Cleared existing DB data.');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // Dummy Users
    const users = [
      {
        name: 'Student One',
        email: 'student1@svkm.com',
        password: passwordHash,
        role: 'student',
        college: 'SVKM_NMIMS',
        department: 'Computer Engineering'
      },
      {
        name: 'Committee Admin',
        email: 'admin@svkm.com',
        password: passwordHash,
        role: 'committee_admin',
        college: 'SVKM_NMIMS',
        department: 'Computer Engineering',
        committeeName: 'ACM'
      },
      {
        name: 'Faculty Mentor',
        email: 'faculty@svkm.com',
        password: passwordHash,
        role: 'faculty_mentor',
        college: 'SVKM_NMIMS',
        department: 'Computer Engineering',
      },
      {
        name: 'College Principal',
        email: 'principal@svkm.com',
        password: passwordHash,
        role: 'principal',
        college: 'SVKM_NMIMS',
        department: 'Computer Engineering',
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log('Dummy Users created.');

    // Dummy Venues
    const venues = [
      {
        name: 'BJ Hall',
        capacity: 200,
        college: 'SVKM_NMIMS'
      },
      {
        name: 'Seminar Hall 1',
        capacity: 100,
        college: 'SVKM_NMIMS'
      }
    ];

    const createdVenues = await Venue.insertMany(venues);
    console.log('Dummy Venues created.');

    const adminUser = createdUsers.find(u => u.email === 'admin@svkm.com');
    const bjHall = createdVenues.find(v => v.name === 'BJ Hall');

    // Dummy Event
    const event = new Event({
      title: 'Annual Tech Hackathon',
      description: 'A 24-hour hackathon for SVKM students to build innovative solutions.',
      department: 'Computer Engineering',
      startTime: new Date(Date.now() + 86400000), // Tomorrow
      endTime: new Date(Date.now() + 172800000), // Day after tomorrow
      venueId: bjHall._id,
      committeeAdminId: adminUser._id,
      isGroupEvent: true,
      minTeamSize: 2,
      maxTeamSize: 4,
      requiresShortlisting: true,
      customFormSchema: ['GitHub Link', 'Resume Link']
    });

    await event.save();
    console.log('Dummy Event created.');

    console.log('Database Seeding Complete!');
    process.exit();
  } catch (err) {
    console.error('Error seeding DB:', err);
    process.exit(1);
  }
};

seedDB();
