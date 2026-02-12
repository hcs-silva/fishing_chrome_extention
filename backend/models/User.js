const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  plano: {type: String, enum: ['free', 'premium'], default: 'free'},
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  planoExpiraEm: Date,
  planoStatus: {type: String, enum: ['active', 'canceled', 'past_due', 'trialing'], default: 'active'},
  spotsFavoritos: [Number],
  configuracoes: {
    alertas: {type: Boolean, default: false},
    notificacoes: {type: Boolean, default: false},
    scoreMinimo: {type: Number, default: 7}
  },
  createdAt: {type: Date, default: Date.now}
});

module.exports = mongoose.model('User', UserSchema);
