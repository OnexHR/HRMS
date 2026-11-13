// HRMS baseline API server.
//
// This entry point mounts only the HRMS modules migrated from LearnILmWorld.
// The in-progress refactor lives under backend/src and is started separately
// (`npm run start:refactor`), so the two implementations never collide.
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import employeeRoutes from './routes/employeeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { MONGO_URI, PORT, validateEnv } from './config/env.js';

validateEnv();

const app = express();

// The employee dashboards run on a different origin during local development.
// Keep the donor's permissive behaviour for the baseline; tighten in the
// integration phase.
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hrms-baseline', time: new Date().toISOString() });
});

app.use('/api/employee', employeeRoutes);
app.use('/api/upload', uploadRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal server error.' });
});

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB (${mongoose.connection.name})`);
    app.listen(PORT, () => {
      console.log(`HRMS baseline API listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start HRMS baseline API:', error.message);
    process.exit(1);
  }
}

start();

export default app;
