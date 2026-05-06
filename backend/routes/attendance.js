const express = require('express');
const router = express.Router();
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRequest = require('../models/AttendanceRequest');
const { auth, isAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const Registration = require('../models/Registration');
const { Parser } = require('json2csv');

// Create attendance session (Admin)
router.post('/session', auth, isAdmin, async (req, res) => {
  try {
    const { eventId, startTime, endTime } = req.body;
    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 char code

    const session = new AttendanceSession({
      eventId,
      code,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      createdBy: req.user.id
    });
    
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark attendance (Student)
router.post('/mark', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const ipAddress = req.ip;

    const session = await AttendanceSession.findOne({ code }).populate('eventId');
    if (!session) return res.status(400).json({ message: 'Invalid code' });

    const now = new Date();
    if (now < session.startTime || now > session.endTime) {
      return res.status(400).json({ message: 'Attendance session is not active' });
    }

    // Check if the student is actually shortlisted/approved for this event
    const registration = await Registration.findOne({
      eventId: session.eventId._id,
      $or: [{ userId: req.user.id }, { members: req.user.id }],
      status: { $in: ['shortlisted', 'approved'] }
    });

    if (!registration) {
      return res.status(403).json({ message: 'You must be shortlisted or approved to mark attendance for this event.' });
    }

    // Check duplicate submission within 1 minute (by IP or User)
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentRequest = await AttendanceRequest.findOne({
      $or: [
        { userId: req.user.id },
        { ipAddress }
      ],
      createdAt: { $gt: oneMinuteAgo }
    });

    if (recentRequest) {
      return res.status(429).json({ message: 'Please wait before submitting again' });
    }

    const request = new AttendanceRequest({
      userId: req.user.id,
      eventId: session.eventId._id,
      status: 'pending',
      ipAddress
    });

    await request.save();
    res.status(201).json(request);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this event' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get submissions for an event (Admin)
router.get('/event/:eventId/requests', auth, isAdmin, async (req, res) => {
  try {
    const requests = await AttendanceRequest.find({ eventId: req.params.eventId }).populate('userId', 'name email department');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk update request status (Admin)
router.put('/request/bulk-approve', auth, isAdmin, async (req, res) => {
  try {
    const { requestIds } = req.body;
    await AttendanceRequest.updateMany(
      { _id: { $in: requestIds } },
      { $set: { status: 'approved' } }
    );
    res.json({ message: 'Attendance records bulk approved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Export Approved Attendance Concession (Admin)
router.get('/export/:eventId', auth, isAdmin, async (req, res) => {
  try {
    // Get all approved attendance requests for the event
    const requests = await AttendanceRequest.find({ eventId: req.params.eventId, status: 'approved' })
      .populate('userId', 'name email department')
      .populate('eventId', 'title startTime endTime');

    if (requests.length === 0) {
      return res.status(404).json({ message: 'No approved attendance records found for this event' });
    }

    const data = requests.map(req => ({
      Student_Name: req.userId?.name || 'N/A',
      Email: req.userId?.email || 'N/A',
      Department: req.userId?.department || 'N/A',
      Event_Name: req.eventId?.title || 'N/A',
      Start_Time: req.eventId?.startTime ? new Date(req.eventId.startTime).toLocaleString() : 'N/A',
      End_Time: req.eventId?.endTime ? new Date(req.eventId.endTime).toLocaleString() : 'N/A',
      Status: 'Verified Present'
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`attendance_concession_${req.params.eventId}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during export' });
  }
});

module.exports = router;
