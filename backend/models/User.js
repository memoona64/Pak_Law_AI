/**
 * User Data Model
 * Defines the user schema with defense-in-depth sanitization to prevent sensitive data leakage.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Excluded from default queries
  },
  // Everyone registers as 'user'. There's no self-service way to become
  // 'admin' — see backend/promoteToAdmin.js, a one-off CLI script — by
  // design, since this gates access to /api/eval/* (see middleware/
  // requireAdmin.js), which must not be something a user can grant
  // themselves.
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Defense-in-depth output transform: Ensure sensitive and internal fields 
 * are stripped during JSON serialization (res.json / JSON.stringify).
 */
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);