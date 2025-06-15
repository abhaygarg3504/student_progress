import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }, 
  phone: { type: String, required: true },
  cfHandle: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  currentRating: { type: Number, required: true },
  maxRating: { type: Number, required: true },
  contests: { type: Array, default: [] },
  submissions: { type: Array, default: [] },
  lastSync: Date,
  reminderCount: { type: Number, default: 0 },
  remindersDisabled: { type: Boolean, default: false }
});

const Student = mongoose.model('Student', StudentSchema);
export default Student;