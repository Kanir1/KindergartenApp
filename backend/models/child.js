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

    // Human-friendly ID parents can type at signup (case-insensitive)
    externalId: { type: String, trim: true, index: { unique: true, sparse: true } },

    // Optional: store birth date
    birthDate: { type: Date, default: null },

    // NEW (preferred): multi-parent support
    parents: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    // Legacy/single-parent shapes kept for compatibility with older data
    parent:   { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    parentId: { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null },

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

  // Backfill: if only a legacy single-parent exists, sync it into parents[]
  if ((!this.parents || this.parents.length === 0) && (this.parent || this.parentId)) {
    const single = this.parent || this.parentId || null;
    if (single) this.parents = [single];
  }
  next();
});

// Ensure uniqueness only when externalId exists
ChildSchema.index({ externalId: 1 }, { unique: true, sparse: true });

// NOTE: removed stray { childId: 1 } index (field not defined in schema)

module.exports = mongoose.model('Child', ChildSchema);
