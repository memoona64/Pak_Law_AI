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