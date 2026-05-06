const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { auth, isAdmin } = require('../middleware/auth');
const crypto = require('crypto');

// Get my registrations
router.get('/me', auth, async (req, res) => {
  try {
    const registrations = await Registration.find({
      $or: [
        { userId: req.user.id },
        { members: req.user.id }
      ]
    })
      .populate('eventId')
      .populate('userId', 'name')
      .populate('members', 'name email');
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Register for an event (Solo or Team Leader)
router.post('/', auth, async (req, res) => {
  try {
    const { eventId, isTeam, teamName, formData } = req.body;
    const targetEvent = await Event.findById(eventId);
    if (!targetEvent) return res.status(404).json({ message: 'Event not found' });

    // Conflict & Duplicate checks
    const myRegistrations = await Registration.find({
      $or: [{ userId: req.user.id }, { members: req.user.id }]
    }).populate('eventId');
    
    for (let reg of myRegistrations) {
      const existingEvent = reg.eventId;
      if (
        targetEvent.startTime < existingEvent.endTime &&
        targetEvent.endTime > existingEvent.startTime
      ) {
        return res.status(400).json({ message: 'Time conflict with an already registered event' });
      }
      if (existingEvent._id.toString() === eventId) {
        return res.status(400).json({ message: 'Already registered for this event' });
      }
    }

    if (isTeam && teamName) {
      const existingTeam = await Registration.findOne({ eventId, teamName });
      if (existingTeam) return res.status(400).json({ message: 'Team name is already taken for this event' });
    }

    let inviteCode = null;
    let isSubmitted = true; // Solo events are auto-submitted
    if (isTeam) {
      inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      isSubmitted = false; // Teams must be submitted manually once full
    }

    const newRegistration = new Registration({
      userId: req.user.id,
      eventId,
      isTeam: isTeam || false,
      teamName: isTeam ? teamName : null,
      members: [req.user.id],
      inviteCode,
      formData: [{ userId: req.user.id, answers: formData }],
      status: targetEvent.requiresShortlisting ? 'pending' : 'approved',
      isSubmitted
    });
    
    await newRegistration.save();
    res.status(201).json(newRegistration);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a Team
router.post('/join', auth, async (req, res) => {
  try {
    const { inviteCode, formData } = req.body;
    const registration = await Registration.findOne({ inviteCode }).populate('eventId');
    if (!registration) return res.status(404).json({ message: 'Invalid invite code' });
    if (registration.isSubmitted) return res.status(400).json({ message: 'Team application is already submitted and locked.' });

    const targetEvent = registration.eventId;

    if (registration.members.length >= targetEvent.maxTeamSize) {
      return res.status(400).json({ message: 'Team is already full' });
    }
    if (registration.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'You are already in this team' });
    }

    const myRegistrations = await Registration.find({
      $or: [{ userId: req.user.id }, { members: req.user.id }]
    }).populate('eventId');
    
    for (let reg of myRegistrations) {
      if (
        targetEvent.startTime < reg.eventId.endTime &&
        targetEvent.endTime > reg.eventId.startTime
      ) {
        return res.status(400).json({ message: 'Time conflict with an already registered event' });
      }
      if (reg.eventId._id.toString() === targetEvent._id.toString()) {
        return res.status(400).json({ message: 'Already registered for this event' });
      }
    }

    registration.members.push(req.user.id);
    registration.formData.push({ userId: req.user.id, answers: formData });
    await registration.save();
    res.json(registration);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit Team Application
router.put('/submit/:id', auth, async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id).populate('eventId');
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    
    if (registration.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the team leader can submit the application' });
    }
    if (registration.members.length < registration.eventId.minTeamSize) {
      return res.status(400).json({ message: `Need at least ${registration.eventId.minTeamSize} members to submit` });
    }

    registration.isSubmitted = true;
    await registration.save();
    res.json({ message: 'Team successfully submitted!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave Team
router.delete('/leave/:id', auth, async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (registration.isSubmitted) return res.status(400).json({ message: 'Cannot leave a submitted team' });

    if (registration.userId.toString() === req.user.id) {
      // If leader leaves, delete the whole team
      await Registration.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Team deleted because leader left' });
    }

    // Remove member and their form data
    registration.members = registration.members.filter(id => id.toString() !== req.user.id);
    registration.formData = registration.formData.filter(f => f.userId.toString() !== req.user.id);
    await registration.save();
    res.json({ message: 'Left team successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Route: Get all SUBMITTED registrations for an event (The "Sheet")
router.get('/event/:eventId', auth, isAdmin, async (req, res) => {
  try {
    // Devfolio style: Admin only sees it if it is actually submitted
    const registrations = await Registration.find({ eventId: req.params.eventId, isSubmitted: true })
      .populate('userId', 'name email department')
      .populate('members', 'name email department');
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Route: Shortlist teams
router.put('/event/:eventId/shortlist', auth, isAdmin, async (req, res) => {
  try {
    const { registrationIds } = req.body;
    await Registration.updateMany(
      { eventId: req.params.eventId, _id: { $in: registrationIds } },
      { $set: { status: 'shortlisted' } }
    );
    await Registration.updateMany(
      { eventId: req.params.eventId, _id: { $nin: registrationIds }, isSubmitted: true },
      { $set: { status: 'rejected' } }
    );
    res.json({ message: 'Shortlisting updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
