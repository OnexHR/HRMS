import mongoose from 'mongoose'

const branchSchema = new mongoose.Schema({
  branchName: { type: String, trim: true },
  branchAddress: { type: String, trim: true },
  country: { type: String, trim: true },
  state: { type: String, trim: true },
  city: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  contactNumber: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
}, { _id: true })

const fileSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
}, { _id: false })

const organizationRegistrationSchema = new mongoose.Schema({
  registrationId: { type: String, required: true, unique: true, index: true },
  organizationName: { type: String, required: true, trim: true },
  organizationType: { type: String, required: true, trim: true },
  industry: { type: String, required: true, trim: true },
  officialEmail: { type: String, required: true, trim: true, lowercase: true },
  website: { type: String, trim: true },
  contactNumber: { type: String, required: true, trim: true },
  registrationNumber: { type: String, trim: true },
  taxIdentificationNumber: { type: String, trim: true, uppercase: true },
  companyLogo: fileSchema,
  registeredAddress: { type: String, required: true, trim: true },
  country: { type: String, required: true, default: 'India', trim: true },
  state: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  branches: [branchSchema],
  authorizedRepresentative: {
    fullName: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    officialEmail: { type: String, required: true, trim: true, lowercase: true },
    mobileNumber: { type: String, required: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    mobileVerified: { type: Boolean, default: false },
  },
  documents: [fileSchema],
  declarationAccepted: { type: Boolean, required: true },
  registrationStatus: {
    type: String,
    enum: ['Draft', 'Pending Verification', 'Under Review', 'Approved', 'Rejected'],
    default: 'Pending Verification',
  },
}, { timestamps: true })

export const OrganizationRegistration =
  mongoose.models.OrganizationRegistration ??
  mongoose.model('OrganizationRegistration', organizationRegistrationSchema)
