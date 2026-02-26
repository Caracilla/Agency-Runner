const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Ortak görev analizi - /:id'den ÖNCE tanımlanmalı
router.get('/analytics/common-tasks', (req, res) => {
  try {
    const pairs = db.prepare(`
      SELECT
        m1.id as member1_id, m1.name as member1_name, m1.avatar_color as member1_color,
        m2.id as member2_id, m2.name as member2_name, m2.avatar_color as member2_color,
        COUNT(DISTINCT tm1.task_id) as common_task_count,
        GROUP_CONCAT(DISTINCT t.title) as task_titles
      FROM task_members tm1
      JOIN task_members tm2 ON tm1.task_id = tm2.task_id AND tm1.member_id < tm2.member_id
      JOIN members m1 ON tm1.member_id = m1.id
      JOIN members m2 ON tm2.member_id = m2.id
      JOIN tasks t ON tm1.task_id = t.id
      GROUP BY tm1.member_id, tm2.member_id
      ORDER BY common_task_count DESC
    `).all();
    res.json(pairs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tüm üyeleri getir
router.get('/', (req, res) => {
  try {
    const members = db.prepare(`
      SELECT
        m.*,
        COUNT(DISTINCT tm.task_id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as active_task_count
      FROM members m
      LEFT JOIN task_members tm ON m.id = tm.member_id
      LEFT JOIN tasks t ON tm.task_id = t.id
      GROUP BY m.id
      ORDER BY m.name
    `).all();
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Üye detayı
router.get('/:id', (req, res) => {
  try {
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!member) return res.status(404).json({ error: 'Üye bulunamadı' });

    const tasks = db.prepare(`
      SELECT t.*, m.name as owner_name, m.avatar_color as owner_color
      FROM tasks t
      JOIN task_members tm ON t.id = tm.task_id
      LEFT JOIN members m ON t.current_owner_id = m.id
      WHERE tm.member_id = ?
      ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.created_at DESC
    `).all(req.params.id);

    const collaborators = db.prepare(`
      SELECT DISTINCT m2.*, COUNT(DISTINCT tm2.task_id) as shared_task_count
      FROM task_members tm1
      JOIN task_members tm2 ON tm1.task_id = tm2.task_id AND tm2.member_id != tm1.member_id
      JOIN members m2 ON tm2.member_id = m2.id
      WHERE tm1.member_id = ?
      GROUP BY m2.id
      ORDER BY shared_task_count DESC
    `).all(req.params.id);

    const stages = db.prepare(`
      SELECT ts.*, t.title as task_title, t.id as task_id, t.status as task_status
      FROM task_stages ts
      JOIN tasks t ON ts.task_id = t.id
      WHERE ts.assignee_id = ?
      ORDER BY CASE ts.status WHEN 'active' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END, t.created_at DESC
    `).all(req.params.id);

    res.json({ ...member, tasks, collaborators, stages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Üye oluştur
router.post('/', (req, res) => {
  try {
    const { name, email, role, avatar_color } = req.body;
    if (!name) return res.status(400).json({ error: 'İsim zorunludur' });

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#f97316'];
    const color = avatar_color || colors[Math.floor(Math.random() * colors.length)];

    const result = db.prepare(
      'INSERT INTO members (name, email, role, avatar_color) VALUES (?, ?, ?, ?)'
    ).run(name, email || null, role || null, color);

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Üye güncelle
router.put('/:id', (req, res) => {
  try {
    const { name, email, role, avatar_color } = req.body;
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!member) return res.status(404).json({ error: 'Üye bulunamadı' });

    db.prepare(
      'UPDATE members SET name = ?, email = ?, role = ?, avatar_color = ? WHERE id = ?'
    ).run(
      name || member.name,
      email !== undefined ? email : member.email,
      role !== undefined ? role : member.role,
      avatar_color || member.avatar_color,
      req.params.id
    );

    res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Üye sil
router.delete('/:id', (req, res) => {
  try {
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!member) return res.status(404).json({ error: 'Üye bulunamadı' });
    db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
