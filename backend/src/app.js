import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDbWithRetry } from './db/database.js';
import downloadRouter from './routes/download.js';
import skillsRouter from './routes/skills.js';
import harnessRouter from './routes/harness.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*',
}));
app.use(express.json());

app.use('/api/auth', authRouter);
// download route must come before skills to match /:id/download before /:id
app.use('/api/skills', downloadRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/harness', harnessRouter);

app.listen(PORT, async () => {
  try {
    await initDbWithRetry();
  } catch (err) {
    console.warn(`[DB] Connection failed — skills routes unavailable. (${err.message})`);
    console.warn('[DB] Harness Lab routes are still operational.');
  }
  console.log(`Backend running on http://localhost:${PORT}`);
});
