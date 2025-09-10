// models/MonthlyReport.js
const { Schema, model } = require('mongoose');

const MonthlyReportSchema = new Schema({
  child: { type: Schema.Types.ObjectId, ref: 'Child', required: true },
  month: { type: String, required: true }, // 'YYYY-MM'
  summary: String,
  milestones: [String],
  mealsOverview: String,
  sleepOverview: String,
  hydrationOverview: String,
  notes: { type: String, maxlength: 4000, default: '' },
}, { timestamps: true });

MonthlyReportSchema.index({ child: 1, month: 1 }, { unique: true });

module.exports = model('MonthlyReport', MonthlyReportSchema);
