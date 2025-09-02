// models/DailyReport.js
const { Schema, model } = require('mongoose');
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, ensureCanAccessChild } = require('../middleware/auth');


const DailyReportSchema = new Schema({
  child: { type: Schema.Types.ObjectId, ref: 'Child', required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD' per child (index below)
  type: { type: String, enum: ['preSleep', 'postSleep'], required: true },

  // Common fields
  meals: {
    breakfast: String,
    lunch: String,
    snack: String,
    notes: String,
  },
  hydration: { status: { type: String, enum: ['yes','no'] }, cups: Number },

  // Only meaningful for postSleep
  sleep: {
    start: Date, // optional (if you want to store)
    end: Date,
    minutes: Number, // computed on save if start+end
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // optional now
}, { timestamps: true });

DailyReportSchema.index({ child: 1, date: 1, type: 1 }, { unique: true }); // prevent duplicates for same day/type

DailyReportSchema.pre('save', function(next) {
  if (this.type === 'postSleep' && this.sleep?.start && this.sleep?.end) {
    const ms = new Date(this.sleep.end) - new Date(this.sleep.start);
    if (!Number.isNaN(ms) && ms > 0) this.sleep.minutes = Math.round(ms / 60000);
  }
  next();
});

module.exports = model('DailyReport', DailyReportSchema);
