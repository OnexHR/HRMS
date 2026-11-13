import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    taskId: { type: String, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    dueDate: { type: Date, default: null },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "On Hold", "Pending", "Completed"],
      default: "Not Started",
    },
    completedAt: { type: Date, default: null },
    attachments: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });

const Task = mongoose.model("EmployeeTask", taskSchema);
export default Task;