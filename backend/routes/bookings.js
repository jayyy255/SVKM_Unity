const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const User = require('../models/User');
const BlackoutDate = require('../models/BlackoutDate');
const { auth, isAdmin } = require('../middleware/auth');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: { user: 'test@ethereal.email', pass: 'testpass' }
});

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('venueId', 'name college')
      .populate('adminId', 'name email committeeName college');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a booking
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { venueId, startTime, endTime } = req.body;
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check conflicts
    const conflict = await Booking.findOne({
      venueId,
      $or: [
        { startTime: { $lt: end }, endTime: { $gt: start } }
      ]
    });

    if (conflict) {
      return res.status(400).json({ message: 'Venue already booked or provisionally locked' });
    }

    // 120 hours expiry
    const expiryTime = new Date(Date.now() + 120 * 60 * 60 * 1000);

    const booking = new Booking({
      venueId,
      adminId: req.user.id,
      startTime: start,
      endTime: end,
      status: 'provisional',
      approvalState: 'pending_faculty',
      expiryTime
    });

    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Approve a booking
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('venueId').populate('adminId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'provisional') return res.status(400).json({ message: 'Booking is not provisional' });

    const user = await User.findById(req.user.id);
    const isSameCollege = booking.adminId.college === booking.venueId.college;
    let nextState = '';
    let isFinal = false;

    // State Machine
    if (booking.approvalState === 'pending_faculty') {
      if (user.role !== 'faculty_mentor' || user.college !== booking.adminId.college) return res.status(403).json({ message: 'Unauthorized' });
      nextState = 'pending_home_admin';
    } else if (booking.approvalState === 'pending_home_admin') {
      if (user.role !== 'college_admin' || user.college !== booking.adminId.college) return res.status(403).json({ message: 'Unauthorized' });
      nextState = 'pending_home_principal';
    } else if (booking.approvalState === 'pending_home_principal') {
      if (user.role !== 'principal' || user.college !== booking.adminId.college) return res.status(403).json({ message: 'Unauthorized' });
      if (isSameCollege) {
        isFinal = true;
      } else {
        nextState = 'pending_host_admin';
      }
    } else if (booking.approvalState === 'pending_host_admin') {
      if (user.role !== 'college_admin' || user.college !== booking.venueId.college) return res.status(403).json({ message: 'Unauthorized' });
      nextState = 'pending_host_principal';
    } else if (booking.approvalState === 'pending_host_principal') {
      if (user.role !== 'principal' || user.college !== booking.venueId.college) return res.status(403).json({ message: 'Unauthorized' });
      isFinal = true;
    } else {
      return res.status(400).json({ message: 'Invalid state' });
    }

    booking.approvalHistory.push({
      approverId: user._id,
      role: user.role,
      action: 'approved'
    });

    if (isFinal) {
      booking.status = 'approved';
      booking.approvalState = 'approved';
      booking.expiryTime = null; // Clear TTL
    } else {
      booking.approvalState = nextState;
    }

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject a booking
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id).populate('adminId').populate('venueId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'provisional') return res.status(400).json({ message: 'Booking cannot be rejected' });

    const user = await User.findById(req.user.id);

    booking.approvalHistory.push({
      approverId: user._id,
      role: user.role,
      action: 'rejected',
      reason
    });

    booking.status = 'rejected';
    booking.approvalState = 'rejected';
    booking.expiryTime = null; // Clear TTL
    await booking.save();

    // Send Email
    try {
      await transporter.sendMail({
        from: '"SVKM Unity" <noreply@svkmunity.edu>',
        to: booking.adminId.email,
        subject: `Venue Booking Rejected: ${booking.venueId.name}`,
        text: `Your booking for ${booking.venueId.name} has been rejected by ${user.name} (${user.role}). Reason: ${reason}`
      });
    } catch (e) {
      console.error('Email failed to send (using mock etheral anyway)', e);
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
