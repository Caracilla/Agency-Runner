const express = require('express');
const router = express.Router();
const db = require('../db/database');

// URL'ye göre dosya tipini otomatik algıla
function detectFileType(url) {
  if (!url) return 'link';
  const lower = url.toLowerCase();
  if (lower.includes('docs.google.com/document')) return 'google-doc';
  if (lower.includes('docs.google.com/spreadsheets')) return 'google-sheet';
  if (lower.includes('docs.google.com/presentation')) return 'google-slides';
  if (lower.includes('docs.google.com/forms')) return 'google-forms';
  if (lower.includes('drive.google.com')) return 'google-drive';
  if (lower.includes('figma.com')) return 'figma';
  if (lower.includes('github.com')) return 'github';
  if (lower.includes('notion.so')) return 'notion';
  if (lower.includes('miro.com')) return 'miro';
  if (lower.includes('loom.com')) return 'loom';
  if (/\.(pdf)$/i.test(url)) return 'pdf';
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) return 'image';
  return 'link';
}

// Görevin attachmentlarını listele
router.get('/task/:taskId', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT ta.*, m.name as added_by_name, m.avatar_color as added_by_color
      FROM task_attachments ta
      LEFT JOIN members m ON ta.added_by = m.id
      WHERE ta.task_id = ?
      ORDER BY ta.created_at DESC
    `).all(req.params.taskId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attachment ekle
router.post('/task/:taskId', (req, res) => {
  try {
    const { name, url, added_by } = req.body;
    if (!url || !url.trim()) return res.status(400).json({ error: 'URL zorunludur' });

    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Görev bulunamadı' });

    const file_type = detectFileType(url);
    const displayName = name && name.trim() ? name.trim() : url;

    const result = db.prepare(
      'INSERT INTO task_attachments (task_id, name, url, file_type, added_by) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.taskId, displayName, url.trim(), file_type, added_by || null);

    const item = db.prepare(`
      SELECT ta.*, m.name as added_by_name, m.avatar_color as added_by_color
      FROM task_attachments ta
      LEFT JOIN members m ON ta.added_by = m.id
      WHERE ta.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attachment adını güncelle
router.put('/:id', (req, res) => {
  try {
    const { name } = req.body;
    db.prepare('UPDATE task_attachments SET name = ? WHERE id = ?').run(name, req.params.id);

    const item = db.prepare(`
      SELECT ta.*, m.name as added_by_name, m.avatar_color as added_by_color
      FROM task_attachments ta LEFT JOIN members m ON ta.added_by = m.id
      WHERE ta.id = ?
    `).get(req.params.id);

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attachment sil
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM task_attachments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
