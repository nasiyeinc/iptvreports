const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  mobile: { type: String, default: '' },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  type: { type: String, enum: ['admin', 'normal', 'manager'], default: 'normal' },
  actionDate: { type: Date, default: Date.now }
}, { 
  collection: 'users',
  timestamps: false
});

userSchema.index({ username: 1 });
userSchema.index({ type: 1 });

module.exports = mongoose.model("User", userSchema);