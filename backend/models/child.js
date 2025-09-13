// backend/models/child.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const DailyLogSchema = new Schema({
  date: { type: String, required: true },
  meals: {
    breakfast: { type: String },
    lunch: { type: String },
    snack: { type: String },
  },
  sleepHours: { type: Number },
  hydration: { type: Boolean },
  photos: [{ type: String }],
  notes: { type: String },
});

// NEW: authorized pickup entry (requires a photo)
const AuthorizedPickupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    photoUrl: { type: String, required: true }, // /uploads/… (or S3/Cloudinary later)
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // parent/admin who added
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ChildSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    // Human-friendly ID parents/admins can type at creation (case-insensitive)
    externalId: { type: String, trim: true, index: { unique: true, sparse: true } },

    // Optional: store birth date
    birthDate: { type: Date, default: null },

    // NEW (preferred): multi-parent support
    parents: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    // Legacy/single-parent shapes kept for compatibility with older data
    parent: { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    parentId: { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null },

    // Existing fields
    dailyLogs: [DailyLogSchema],
    requiredItems: [{ type: String }],
    monthlyUpdate: { type: String },
    customRemarks: { type: String },

    // NEW: parent-managed info
    medicalCondition: { type: String, default: '' },
    specialNotes: { type: String, default: '' },

    // NEW: authorized pickups (photo required)
    authorizedPickups: [AuthorizedPickupSchema],
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

// NOTE: no childId field or index here (you don't use it in this schema)

module.exports = mongoose.model('Child', ChildSchema);
