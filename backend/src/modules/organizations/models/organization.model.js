import mongoose from 'mongoose'

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    timezone: { type: String, trim: true, default: 'Asia/Kolkata' },
  },
  { timestamps: true },
)

const Organization = mongoose.model('Organization', organizationSchema)
export default Organization
