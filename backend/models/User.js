const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true, index: true, required: true },
  passwordHash: { type: String, required: true, select: false }, // <- important
  role: { type: String, enum: ['guest','parent','admin'], default: 'guest' },
  children: [{ type: Schema.Types.ObjectId, ref: 'Child' }],
}, { timestamps: true });

module.exports = model('User', UserSchema);
