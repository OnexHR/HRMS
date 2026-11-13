import mongoose from "mongoose";

// Auto-increment counter shared by employeeCode / taskId generators.
const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export async function getNextSequence(key) {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return counter.seq;
}

const Counter = mongoose.model("EmployeeCounter", counterSchema);
export default Counter;