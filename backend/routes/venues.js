const express = require('express');
const router = express.Router();
const Venue = require('../models/Venue');
const BlackoutDate = require('../models/BlackoutDate');
const { auth, isAdmin } = require('../middleware/auth');

// Get all venues
router.get('/', async (req, res) => {
  try {
    const venues = await Venue.find();
    res.json(venues);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create venue
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { name, capacity, features, college } = req.body;
    const venue = new Venue({ name, capacity, features, college });
    await venue.save();
    res.status(201).json(venue);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get blackout dates
router.get('/blackouts', async (req, res) => {
  try {
    const dates = await BlackoutDate.find();
    res.json(dates);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add blackout date
router.post('/blackouts', auth, isAdmin, async (req, res) => {
  try {
    const { date, reason, venueId } = req.body;
    const blackout = new BlackoutDate({ date, reason, venueId });
    await blackout.save();
    res.status(201).json(blackout);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
