// models/MonthlyReport.js
const { Schema, model } = require('mongoose');
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, ensureCanAccessChild } = require('../middleware/auth');


const MonthlyReportSchema = new Schema({
  child: { type: Schema.Types.ObjectId, ref: 'Child', required: true },
  month: { type: String, required: true }, // 'YYYY-MM'
  summary: String,
  milestones: [String],
  mealsOverview: String,   // optional
  sleepOverview: String,   // optional
  hydrationOverview: String, // optional
}, { timestamps: true });

MonthlyReportSchema.index({ child: 1, month: 1 }, { unique: true });

module.exports = model('MonthlyReport', MonthlyReportSchema);
