import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "half_day", "leave", "on_break", "on_call"],
      default: "present",
    },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    // All check-in/check-out sessions for the day. A day may hold several
    // sessions (check out, then check back in); working minutes are the sum of
    // each session's duration minus breaks. checkIn/checkOut above are derived
    // (first check-in / last check-out) for backward compatibility.
    sessions: {
      type: [
        {
          checkIn: { type: Date, required: true },
          checkOut: { type: Date, default: null },
        },
      ],
      default: [],
    },
    breakStart: { type: Date, default: null },
    breakEnd: { type: Date, default: null },
    // Completed break intervals, kept so overtime can subtract exactly the
    // break time that fell inside the overtime windows.
    breaks: {
      type: [
        {
          start: { type: Date, required: true },
          end: { type: Date, required: true },
        },
      ],
      default: [],
    },
    breakMinutes: { type: Number, default: 0 },
    workingMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeAdmin",
      default: null,
    },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("EmployeeAttendance", attendanceSchema);
export default Attendance;