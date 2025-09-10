// models/DailyReport.js
const { Schema, model } = require('mongoose');

const DailyReportSchema = new Schema({
  child: { type: Schema.Types.ObjectId, ref: 'Child', required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  type: { type: String, enum: ['preSleep', 'postSleep'], required: true },

  meals: {
    breakfast: String,
    lunch: String,
    snack: String,
    notes: String,
  },
  hydration: { status: { type: String, enum: ['yes','no'] }, cups: Number },

  notes: { type: String, maxlength: 2000, default: '' },

  sleep: {
    start: Date,
    end: Date,
    minutes: Number,
  },

  photos: [{ type: String }],

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

DailyReportSchema.index({ child: 1, date: 1, type: 1 }, { unique: true });

DailyReportSchema.pre('save', function(next) {
  if (this.type === 'postSleep' && this.sleep?.start && this.sleep?.end) {
    const ms = new Date(this.sleep.end) - new Date(this.sleep.start);
    if (!Number.isNaN(ms) && ms > 0) this.sleep.minutes = Math.round(ms / 60000);
  }
  next();
});

module.exports = model('DailyReport', DailyReportSchema);
