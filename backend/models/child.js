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
    name: { type: String, required: true },

    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },

    dailyLogs: [DailyLogSchema],
    requiredItems: [{ type: String }],
    monthlyUpdate: { type: String },
    customRemarks: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Child', ChildSchema);
