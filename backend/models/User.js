const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {type: String, required: true, unique: true},
  password: String, // hash bcrypt se usares auth própria
  plano: {type: String, default: 'free'}, // free | premium
  spotsFavoritos: [Number],
  createdAt: {type: Date, default: Date.now}
});

module.exports = mongoose.model('User', UserSchema);
