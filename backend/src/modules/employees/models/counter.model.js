import mongoose from 'mongoose'

/**
 * Per-organization auto-increment counter (`EMP001`, `TSK-2026-001`).
 * The organization is part of the key so two tenants never share a sequence.
 */
const counterSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  key: { type: String, required: true },
  seq: { type: Number, default: 0 },
})

counterSchema.index({ organization: 1, key: 1 }, { unique: true })

const Counter = mongoose.model('EmployeeCounter', counterSchema)

export async function getNextSequence(organizationId, key) {
  const counter = await Counter.findOneAndUpdate(
    { organization: organizationId, key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  return counter.seq
}

export default Counter
