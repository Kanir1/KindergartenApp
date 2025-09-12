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

  // NEW: for pre-sleep — amount of milk in milliliters
  milkMl: { type: Number, min: 0, default: 0 },

  // Legacy hydration kept (and still used for post-sleep if you want)
  hydration: { status: { type: String, enum: ['yes','no'] }, cups: Number },

  notes: { type: String, maxlength: 2000, default: '' },

  // post-sleep only
  sleep: {
    start: Date,
    end: Date,
    minutes: Number,
  },

  bathroomCount: { type: Number, min: 0, default: 0 },

  photos: [{ type: String }],

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// uniqueness guard
DailyReportSchema.index({ child: 1, date: 1, type: 1 }, { unique: true });

// Back-compat helper: expose a computed milk value if only cups exist (1 cup = 200 mL)
DailyReportSchema.virtual('milkMlComputed').get(function () {
  if (typeof this.milkMl === 'number' && this.milkMl > 0) return this.milkMl;
  const cups = this.hydration?.cups ?? 0;
  return cups > 0 ? cups * 200 : 0;
});

// Pre-save helpers
DailyReportSchema.pre('save', function(next) {
  // compute sleep minutes for post-sleep reports
  if (this.type === 'postSleep' && this.sleep?.start && this.sleep?.end) {
    const ms = new Date(this.sleep.end) - new Date(this.sleep.start);
    if (!Number.isNaN(ms) && ms > 0) this.sleep.minutes = Math.round(ms / 60000);
  }
  // normalize milkMl if only legacy cups were provided
  if ((!this.milkMl || this.milkMl === 0) && this.hydration?.cups > 0) {
    this.milkMl = this.hydration.cups * 200; // 1 cup ≈ 200 mL
  }
  next();
});

module.exports = model('DailyReport', DailyReportSchema);
