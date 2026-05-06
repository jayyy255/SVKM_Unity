const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  features: [{ type: String }],
  college: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Venue', venueSchema);
