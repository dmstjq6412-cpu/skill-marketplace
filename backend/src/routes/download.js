import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// GET /api/skills/:id/download
router.get('/:id/download', (req, res) => {
  const db = getDb();
  const skill = db.data.skills.find(s => s.id === Number(req.params.id));
  if (!skill) return res.status(404).json({ error: 'Skill not found' });

  skill.downloads += 1;
  db.write();

  const filePath = path.join(__dirname, '../storage/skills', skill.filename);
  const ext = skill.file_type === 'zip' ? 'zip' : 'md';
  res.download(filePath, `${skill.name}.${ext}`);
});

export default router;
