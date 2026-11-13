import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    meetingLink: { type: String, trim: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    durationMin: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["scheduled", "active", "ended", "cancelled"],
      default: "scheduled",
    },
    actualStartedAt: { type: Date, default: null },
    actualEndedAt: { type: Date, default: null },
    expectedDuration: { type: Number, default: 0 },
    expectedEndAt: { type: Date, default: null },
    actualDuration: { type: Number, default: 0 },
  },
  { timestamps: true },
);

meetingSchema.index({ participants: 1, startTime: 1 });
meetingSchema.index({ status: 1, participants: 1 });

const Meeting = mongoose.model("EmployeeMeeting", meetingSchema);
export default Meeting;
