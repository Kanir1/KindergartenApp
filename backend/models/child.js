const mongoose = require('mongoose');
const { Schema } = mongoose;

const DailyLogSchema = new Schema({
  date: { type: String, required: true },
  meals: {
    breakfast: { type: String },
    lunch: { type: String },
    snack: { type: String }
  },
  sleepHours: { type: Number },
  hydration: { type: Boolean },
  photos: [{ type: String }],
  notes: { type: String }
});

const ChildSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    // NEW: human-friendly ID parents can type at signup (case-insensitive)
    externalId: { type: String, trim: true, index: { unique: true, sparse: true } },

    // Optional: store birth date if you want (can be omitted if not needed)
    birthDate: { type: Date, default: null },

    parentId: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    }],

    dailyLogs: [DailyLogSchema],
    requiredItems: [{ type: String }],
    monthlyUpdate: { type: String },
    customRemarks: { type: String }
  },
  { timestamps: true }
);

// Normalize externalId so ABC123 and abc123 are treated the same
ChildSchema.pre('save', function (next) {
  if (this.externalId) this.externalId = this.externalId.trim().toUpperCase();
  next();
});

// Ensure uniqueness only when externalId exists
ChildSchema.index({ externalId: 1 }, { unique: true, sparse: true });
ChildSchema.index({ childId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Child', ChildSchema);
