const express = require('express');
const router = express.Router();
const db = require('../db/database');

function getStageWithDetails(id) {
  return db.prepare(`
    SELECT ts.*, m.name as assignee_name, m.avatar_color as assignee_color
    FROM task_stages ts
    LEFT JOIN members m ON ts.assignee_id = m.id
    WHERE ts.id = ?
  `).get(id);
}

// Aşama güncelle
router.put('/:id', (req, res) => {
  try {
    const { title, description, assignee_id, order_index } = req.body;
    const stage = db.prepare('SELECT * FROM task_stages WHERE id = ?').get(req.params.id);
    if (!stage) return res.status(404).json({ error: 'Aşama bulunamadı' });

    db.prepare(`
      UPDATE task_stages SET title = ?, description = ?, assignee_id = ?, order_index = ?
      WHERE id = ?
    `).run(
      title || stage.title,
      description !== undefined ? description : stage.description,
      assignee_id !== undefined ? assignee_id : stage.assignee_id,
      order_index !== undefined ? order_index : stage.order_index,
      req.params.id
    );

    // Atanan kişiyi otomatik göreve ekle
    const newAssignee = assignee_id !== undefined ? assignee_id : stage.assignee_id;
    if (newAssignee) {
      db.prepare('INSERT OR IGNORE INTO task_members (task_id, member_id) VALUES (?, ?)').run(stage.task_id, newAssignee);
    }

    res.json(getStageWithDetails(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aşama sil
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM task_stages WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aşamayı tamamla → sonraki aşamayı otomatik aktif et
router.post('/:id/complete', (req, res) => {
  try {
    const stage = db.prepare('SELECT * FROM task_stages WHERE id = ?').get(req.params.id);
    if (!stage) return res.status(404).json({ error: 'Aşama bulunamadı' });
    if (stage.status === 'completed') return res.status(400).json({ error: 'Aşama zaten tamamlandı' });

    // Mevcut aşamayı tamamla
    db.prepare(
      "UPDATE task_stages SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(req.params.id);

    // Sonraki aşamayı bul
    const nextStage = db.prepare(`
      SELECT * FROM task_stages
      WHERE task_id = ? AND order_index > ? AND status != 'completed'
      ORDER BY order_index ASC
      LIMIT 1
    `).get(stage.task_id, stage.order_index);

    if (nextStage) {
      // Sonraki aşamayı aktive et
      db.prepare(
        "UPDATE task_stages SET status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(nextStage.id);

      // Görevin sahibini sonraki aşamanın sorumlusuna güncelle
      if (nextStage.assignee_id) {
        db.prepare("UPDATE tasks SET current_owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(nextStage.assignee_id, stage.task_id);
      }
    } else {
      // Tüm aşamalar tamamlandı → görevi tamamla
      db.prepare("UPDATE tasks SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(stage.task_id);
    }

    const stages = db.prepare(`
      SELECT ts.*, m.name as assignee_name, m.avatar_color as assignee_color
      FROM task_stages ts
      LEFT JOIN members m ON ts.assignee_id = m.id
      WHERE ts.task_id = ?
      ORDER BY ts.order_index
    `).all(stage.task_id);

    const task = db.prepare(`
      SELECT t.*, m.name as owner_name, m.avatar_color as owner_color
      FROM tasks t
      LEFT JOIN members m ON t.current_owner_id = m.id
      WHERE t.id = ?
    `).get(stage.task_id);

    const activatedStage = nextStage ? db.prepare(`
      SELECT ts.*, m.name as assignee_name, m.avatar_color as assignee_color
      FROM task_stages ts LEFT JOIN members m ON ts.assignee_id = m.id
      WHERE ts.id = ?
    `).get(nextStage.id) : null;

    res.json({ stages, task, activatedStage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aşamayı manuel başlat
router.post('/:id/start', (req, res) => {
  try {
    const stage = db.prepare('SELECT * FROM task_stages WHERE id = ?').get(req.params.id);
    if (!stage) return res.status(404).json({ error: 'Aşama bulunamadı' });

    db.prepare(
      "UPDATE task_stages SET status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(req.params.id);

    const updates = ["status = 'in_progress'", "updated_at = CURRENT_TIMESTAMP"];
    const params = [];
    if (stage.assignee_id) {
      updates.push('current_owner_id = ?');
      params.push(stage.assignee_id);
    }
    params.push(stage.task_id);
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    res.json(getStageWithDetails(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
