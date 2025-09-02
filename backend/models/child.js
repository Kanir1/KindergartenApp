const mongoose = require('mongoose');

const DailyLogSchema = new mongoose.Schema({
  date: String,
  meals: {
    breakfast: String,
    lunch: String,
    snack: String
  },
  sleepHours: Number,
  hydration: Boolean,
  photos: [String],
  notes: String
});

const ChildSchema = new mongoose.Schema({
  name: String,
  parentId: mongoose.Schema.Types.ObjectId,
  dailyLogs: [DailyLogSchema],
  requiredItems: [String],
  monthlyUpdate: String,
  customRemarks: String
});

module.exports = mongoose.model('Child', ChildSchema);
