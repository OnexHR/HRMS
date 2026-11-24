import mongoose from 'mongoose'
import { env } from './env.js'

export async function connectDatabase() {
  if (!env.mongodbUri) {
    throw new Error('MONGODB_URI is not configured')
  }

  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 })
  return mongoose.connection
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}
