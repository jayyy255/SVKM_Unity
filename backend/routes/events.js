const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { auth, isAdmin } = require('../middleware/auth');

// Get all events
router.get('/', async (req, res) => {
  try {
    const filter = req.query.department ? { department: req.query.department } : {};
    const events = await Event.find(filter).populate('venueId', 'name');
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create event
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { title, description, department, startTime, endTime, venueId, isGroupEvent, minTeamSize, maxTeamSize, requiresShortlisting, customFormSchema } = req.body;
    const event = new Event({
      title,
      description,
      department,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      venueId,
      committeeAdminId: req.user.id,
      isGroupEvent,
      minTeamSize,
      maxTeamSize,
      requiresShortlisting,
      customFormSchema
    });
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
