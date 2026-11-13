import mongoose from "mongoose";

const employeeQuerySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeTask",
      default: null,
    },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["open", "in_review", "resolved", "raised_again"],
      default: "open",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    review: { type: String, trim: true, default: "" },
    reviewedAt: { type: Date, default: null },
    attachments: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

employeeQuerySchema.index({ status: 1, createdAt: -1 });

const EmployeeQuery = mongoose.model(
  "EmployeeQuery",
  employeeQuerySchema,
);
export default EmployeeQuery;