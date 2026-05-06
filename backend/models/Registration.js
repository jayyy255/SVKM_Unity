const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The person who registered / leader
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  
  // Team Fields
  isTeam: { type: Boolean, default: false },
  teamName: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  inviteCode: { type: String }, // For joining
  
  // Shortlisting
  status: { type: String, enum: ['pending', 'shortlisted', 'rejected', 'approved'], default: 'pending' },
  isSubmitted: { type: Boolean, default: false }, // Devfolio style: only submitted teams appear
  
  // Custom Form Data (Individual per member)
  formData: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    answers: { type: Map, of: String }
  }]
}, { timestamps: true });

// prevent duplicate registrations for the same event by the same user
// wait, if we have teams, user might be in members array instead of userId
// We need to handle duplicate checks mostly in logic now, but we can keep this for the leader.
registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
