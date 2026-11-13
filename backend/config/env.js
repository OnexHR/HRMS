// Baseline HRMS environment configuration (migrated from LearnILmWorld).
//
// The donor backend used MONGO_URI / port 5001. The HRMS workspace uses
// MONGODB_URI / port 4000 for the in-progress refactor in backend/src, so this
// module accepts either name and defaults to the workspace convention.
//
// This file intentionally only validates what the migrated HRMS baseline
// needs. Website-only settings (OpenAI, Stripe, Zego, e-mail) are not required.
import dotenv from 'dotenv';

dotenv.config();

export const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
export const PORT = process.env.PORT || 4000;
export const FRONTEND_URL = process.env.FRONTEND_URL || '';
export const FRONTEND_URL_WWW = process.env.FRONTEND_URL_WWW || '';

export function validateEnv() {
  const required = {
    JWT_SECRET: process.env.JWT_SECRET,
    'MONGO_URI (or MONGODB_URI)': MONGO_URI,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters.');
    process.exit(1);
  }
}
