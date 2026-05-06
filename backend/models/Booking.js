const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['provisional', 'approved', 'rejected'], default: 'provisional' },
  approvalState: { type: String, default: 'pending_faculty' },
  approvalHistory: [{
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },
    action: { type: String, enum: ['approved', 'rejected'] },
    timestamp: { type: Date, default: Date.now },
    reason: { type: String }
  }],
  expiryTime: { type: Date } // will use logic to delete or update if expired
}, { timestamps: true });

// TTL index to automatically remove provisional bookings after 120 hours if not approved.
// We can set it dynamically when saving if status is provisional.
bookingSchema.index({ expiryTime: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Booking', bookingSchema);
