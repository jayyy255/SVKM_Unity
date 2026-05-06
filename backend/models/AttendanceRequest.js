const mongoose = require('mongoose');

const attendanceRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  ipAddress: { type: String }
}, { timestamps: true });

// prevent duplicate attendance requests for the same event by the same user
attendanceRequestSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRequest', attendanceRequestSchema);
