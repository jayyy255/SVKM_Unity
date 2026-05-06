const mongoose = require('mongoose');

const blackoutDateSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  reason: { type: String, required: true },
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', default: null } // null means all venues
}, { timestamps: true });

module.exports = mongoose.model('BlackoutDate', blackoutDateSchema);
