const express = require('express');
const router = express.Router();
const db = require('../db/database');

function getTaskWithDetails(taskId) {
  const task = db.prepare(`
    SELECT t.*,
      m.name as owner_name, m.avatar_color as owner_color,
      p.id as parent_id, p.title as parent_title, p.status as parent_status
    FROM tasks t
    LEFT JOIN members m ON t.current_owner_id = m.id
    LEFT JOIN tasks p ON t.parent_task_id = p.id
    WHERE t.id = ?
  `).get(taskId);

  if (!task) return null;

  task.members = db.prepare(`
    SELECT m.*
    FROM members m
    JOIN task_members tm ON m.id = tm.member_id
    WHERE tm.task_id = ?
    ORDER BY m.name
  `).all(taskId);

  task.stages = db.prepare(`
    SELECT ts.*, m.name as assignee_name, m.avatar_color as assignee_color
    FROM task_stages ts
    LEFT JOIN members m ON ts.assignee_id = m.id
    WHERE ts.task_id = ?
    ORDER BY ts.order_index
  `).all(taskId);

  task.subtasks = db.prepare(`
    SELECT t.*,
      m.name as owner_name, m.avatar_color as owner_color,
      (SELECT COUNT(*) FROM task_stages WHERE task_id = t.id) as stage_count,
      (SELECT COUNT(*) FROM task_stages WHERE task_id = t.id AND status = 'completed') as completed_stages,
      (SELECT COUNT(*) FROM task_members WHERE task_id = t.id) as member_count
    FROM tasks t
    LEFT JOIN members m ON t.current_owner_id = m.id
    WHERE t.parent_task_id = ?
    ORDER BY t.created_at
  `).all(taskId);

  return task;
}

// Tüm görevleri getir
router.get('/', (req, res) => {
  try {
    const { memberId, priority, status } = req.query;
    let query = `
      SELECT DISTINCT t.*,
        m.name as owner_name,
        m.avatar_color as owner_color,
        (SELECT COUNT(*) FROM task_stages WHERE task_id = t.id) as stage_count,
        (SELECT COUNT(*) FROM task_stages WHERE task_id = t.id AND status = 'completed') as completed_stages,
        (SELECT COUNT(*) FROM task_members WHERE task_id = t.id) as member_count
      FROM tasks t
      LEFT JOIN members m ON t.current_owner_id = m.id
    `;

    const conditions = [];
    const params = [];

    if (memberId) {
      query += ' JOIN task_members tm ON t.id = tm.task_id';
      conditions.push('tm.member_id = ?');
      params.push(memberId);
    }
    if (priority) { conditions.push('t.priority = ?'); params.push(priority); }
    if (status) { conditions.push('t.status = ?'); params.push(status); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ` ORDER BY
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.created_at DESC`;

    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Görev detayı
router.get('/:id', (req, res) => {
  try {
    const task = getTaskWithDetails(req.params.id);
    if (!task) return res.status(404).json({ error: 'Görev bulunamadı' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Görev oluştur
router.post('/', (req, res) => {
  try {
    const { title, description, priority, status, current_owner_id, due_date, memberIds, parent_task_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Görev başlığı zorunludur' });

    const result = db.prepare(`
      INSERT INTO tasks (title, description, priority, status, current_owner_id, due_date, parent_task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, description || null, priority || 'medium', status || 'todo', current_owner_id || null, due_date || null, parent_task_id || null);

    const taskId = result.lastInsertRowid;

    if (memberIds && memberIds.length > 0) {
      const insertMember = db.prepare('INSERT OR IGNORE INTO task_members (task_id, member_id) VALUES (?, ?)');
      for (const memberId of memberIds) insertMember.run(taskId, memberId);
    }

    // current_owner_id varsa otomatik olarak üye listesine ekle
    if (current_owner_id) {
      db.prepare('INSERT OR IGNORE INTO task_members (task_id, member_id) VALUES (?, ?)').run(taskId, current_owner_id);
    }

    res.status(201).json(getTaskWithDetails(taskId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Görev güncelle
router.put('/:id', (req, res) => {
  try {
    const { title, description, priority, status, current_owner_id, due_date, parent_task_id } = req.body;
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Görev bulunamadı' });

    // Döngüsel hiyerarşiyi engelle
    if (parent_task_id && Number(parent_task_id) === Number(req.params.id)) {
      return res.status(400).json({ error: 'Görev kendisinin üst görevi olamaz' });
    }

    db.prepare(`
      UPDATE tasks SET
        title = ?, description = ?, priority = ?, status = ?,
        current_owner_id = ?, due_date = ?, parent_task_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title !== undefined ? title : task.title,
      description !== undefined ? description : task.description,
      priority || task.priority,
      status || task.status,
      current_owner_id !== undefined ? current_owner_id : task.current_owner_id,
      due_date !== undefined ? due_date : task.due_date,
      parent_task_id !== undefined ? (parent_task_id || null) : task.parent_task_id,
      req.params.id
    );

    res.json(getTaskWithDetails(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Görev sil
router.delete('/:id', (req, res) => {
  try {
    if (!db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)) {
      return res.status(404).json({ error: 'Görev bulunamadı' });
    }
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Göreve üye ekle
router.post('/:id/members', (req, res) => {
  try {
    const { memberId } = req.body;
    if (!db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Görev bulunamadı' });
    if (!db.prepare('SELECT id FROM members WHERE id = ?').get(memberId)) return res.status(404).json({ error: 'Üye bulunamadı' });
    db.prepare('INSERT OR IGNORE INTO task_members (task_id, member_id) VALUES (?, ?)').run(req.params.id, memberId);
    res.json(getTaskWithDetails(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Görevden üye çıkar
router.delete('/:id/members/:memberId', (req, res) => {
  try {
    db.prepare('DELETE FROM task_members WHERE task_id = ? AND member_id = ?').run(req.params.id, req.params.memberId);
    res.json(getTaskWithDetails(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Görevin aşamalarını listele
router.get('/:id/stages', (req, res) => {
  try {
    const stages = db.prepare(`
      SELECT ts.*, m.name as assignee_name, m.avatar_color as assignee_color
      FROM task_stages ts
      LEFT JOIN members m ON ts.assignee_id = m.id
      WHERE ts.task_id = ?
      ORDER BY ts.order_index
    `).all(req.params.id);
    res.json(stages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Göreve aşama ekle
router.post('/:id/stages', (req, res) => {
  try {
    const { title, description, assignee_id, order_index } = req.body;
    if (!title) return res.status(400).json({ error: 'Aşama başlığı zorunludur' });

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Görev bulunamadı' });

    let orderIdx = order_index;
    if (orderIdx === undefined || orderIdx === null) {
      const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM task_stages WHERE task_id = ?').get(req.params.id);
      orderIdx = maxOrder.max !== null ? maxOrder.max + 1 : 0;
    }

    const existingCount = db.prepare('SELECT COUNT(*) as count FROM task_stages WHERE task_id = ?').get(req.params.id).count;
    const isFirst = existingCount === 0;
    const stageStatus = isFirst && task.status === 'in_progress' ? 'active' : 'pending';

    const result = db.prepare(`
      INSERT INTO task_stages (task_id, title, description, assignee_id, order_index, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, title, description || null, assignee_id || null, orderIdx, stageStatus);

    // Atanan kişiyi otomatik göreve ekle
    if (assignee_id) {
      db.prepare('INSERT OR IGNORE INTO task_members (task_id, member_id) VALUES (?, ?)').run(req.params.id, assignee_id);
    }

    const stage = db.prepare(`
      SELECT ts.*, m.name as assignee_name, m.avatar_color as assignee_color
      FROM task_stages ts
      LEFT JOIN members m ON ts.assignee_id = m.id
      WHERE ts.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(stage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.getTaskWithDetails = getTaskWithDetails;
