import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db/database.js';
import downloadRouter from './routes/download.js';
import skillsRouter from './routes/skills.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*',
}));
app.use(express.json());

// download route must come before skills to match /:id/download before /:id
app.use('/api/skills', downloadRouter);
app.use('/api/skills', skillsRouter);

app.listen(PORT, () => {
  initDb();
  console.log(`Backend running on http://localhost:${PORT}`);
});
