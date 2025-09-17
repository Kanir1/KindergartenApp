// models/RequiredItems.js
const mongoose = require('mongoose');

const RequiredItemsSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
    // What the staff asks the parents to bring
    items: {
      diapers: { type: Boolean, default: false },
      wetWipes: { type: Boolean, default: false }, // “wet paper”
      clothing: { type: Boolean, default: false },
      other: { type: String, default: '' },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // {read receipts}: which parents have viewed this notice
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.RequiredItems || mongoose.model('RequiredItems', RequiredItemsSchema);
