import express from 'express';
import { getPool } from '../db/database.js';

const router = express.Router();

// @feature skill-download
// @desc 스킬 파일 다운로드 (카운터 증가 + 파일 전송)
// @flow DB에서 파일 로드 + 다운로드 카운터 증가 → binary 응답
// @table skills
// @page /skills/:id
router.get('/:id/download', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `UPDATE skills SET downloads = downloads + 1 WHERE id = $1
       RETURNING name, file_type, file_data`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Skill not found' });

    const { name, file_type, file_data } = rows[0];
    const ext = file_type === 'zip' ? 'zip' : 'md';
    res.setHeader('Content-Disposition', `attachment; filename="${name}.${ext}"`);
    res.setHeader('Content-Type', file_type === 'zip' ? 'application/zip' : 'text/markdown');
    res.send(file_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
