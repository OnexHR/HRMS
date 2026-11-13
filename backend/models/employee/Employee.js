import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { getNextSequence } from "./Counter.js";

const LeaveBucketSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 12, min: 0 },
    used: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const employeeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: { type: String, enum: ["employee", "manager"], default: "employee" },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },
    employeeCode: { type: String, unique: true, sparse: true },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },
    job: {
      joinDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      status: {
        type: String,
        enum: ["active", "on_leave", "terminated", "inactive"],
        default: "active",
      },
      isActive: { type: Boolean, default: true },
    },
    personal: {
      dateOfBirth: { type: Date, default: null },
      gender: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
      emergencyContact: { type: String, trim: true, default: "" },
    },
    profile: {
      bio: { type: String, trim: true, default: "" },
      imageUrl: { type: String, trim: true, default: "" },
      dob: { type: Date, default: null },
      address: { type: String, trim: true, maxlength: 300, default: "" },
      skills: [{ type: String, trim: true }],
    },
    leaveBalances: {
      casual: { type: LeaveBucketSchema, default: () => ({ total: 12, used: 0 }) },
      sick: { type: LeaveBucketSchema, default: () => ({ total: 10, used: 0 }) },
      earned: { type: LeaveBucketSchema, default: () => ({ total: 15, used: 0 }) },
      unpaid: { type: LeaveBucketSchema, default: () => ({ total: 0, used: 0 }) },
    },
  },
  { timestamps: true },
);

employeeSchema.index({ role: 1, "job.isActive": 1 });

employeeSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (!this.employeeCode) {
    const seq = await getNextSequence("employeeCode");
    this.employeeCode = `EMP${String(seq).padStart(3, "0")}`;
  }
});

employeeSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const Employee = mongoose.model("Employee", employeeSchema);
export default Employee;