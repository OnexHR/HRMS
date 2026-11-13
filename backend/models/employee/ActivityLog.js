import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "checkin",
        "checkout",
        "break_start",
        "break_end",
        "meeting_start",
        "meeting_end",
        "task_assigned",
        "task_completed",
        "leave_submitted",
        "leave_approved",
        "leave_rejected",
        "query_raised",
        "query_reviewed",
        "profile_updated",
        "employee_created",
        "employee_updated",
        "employee_deleted",
      ],
      required: true,
    },
    at: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

activityLogSchema.index({ employee: 1, at: -1 });

const ActivityLog = mongoose.model("EmployeeActivityLog", activityLogSchema);
export default ActivityLog;