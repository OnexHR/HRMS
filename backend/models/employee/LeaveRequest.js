import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    leaveType: {
      type: String,
      enum: ["casual", "sick", "earned", "unpaid"],
      required: true,
    },
    dayType: {
      type: String,
      enum: ["full_day", "first_half", "second_half"],
      default: "full_day",
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String, trim: true, default: "" },
    contactWhileOnLeave: { type: String, trim: true, default: "" },
    attachments: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "cancelled"],
      default: "draft",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    reviewNote: { type: String, trim: true, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

leaveRequestSchema.index({ employee: 1, status: 1, fromDate: -1 });
leaveRequestSchema.index({ manager: 1, status: 1 });

const LeaveRequest = mongoose.model("EmployeeLeaveRequest", leaveRequestSchema);
export default LeaveRequest;