const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  department: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  committeeAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // New Fields for Teams & Shortlisting
  isGroupEvent: { type: Boolean, default: false },
  minTeamSize: { type: Number, default: 1 },
  maxTeamSize: { type: Number, default: 1 },
  requiresShortlisting: { type: Boolean, default: false },
  customFormSchema: [{ type: String }] // Array of question strings
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
