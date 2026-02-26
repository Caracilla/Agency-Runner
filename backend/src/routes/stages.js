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

// Revize iste: aktif aşamayı önceki bir aşamaya geri gönder
router.post('/:id/request-revision', (req, res) => {
  try {
    const { toStageId, comment, requestedBy } = req.body;
    if (!comment || !comment.trim()) return res.status(400).json({ error: 'Revize gerekçesi zorunludur' });

    const currentStage = db.prepare('SELECT * FROM task_stages WHERE id = ?').get(req.params.id);
    if (!currentStage) return res.status(404).json({ error: 'Aşama bulunamadı' });
    if (currentStage.status !== 'active') return res.status(400).json({ error: 'Sadece aktif aşama için revize istenebilir' });

    // Hedef aşama (geri gönderilecek)
    let targetStage = null;
    if (toStageId) {
      targetStage = db.prepare('SELECT * FROM task_stages WHERE id = ?').get(toStageId);
      if (!targetStage || targetStage.task_id !== currentStage.task_id) {
        return res.status(400).json({ error: 'Geçersiz hedef aşama' });
      }
      if (targetStage.order_index >= currentStage.order_index) {
        return res.status(400).json({ error: 'Sadece önceki aşamalara geri gönderilebilir' });
      }
    }

    // Mevcut aşamayı pending'e al
    db.prepare(
      "UPDATE task_stages SET status = 'pending', started_at = NULL, revision_count = revision_count + 1 WHERE id = ?"
    ).run(req.params.id);

    if (targetStage) {
      // Hedef ile mevcut arasındaki tamamlanmış aşamaları pending'e al
      db.prepare(`
        UPDATE task_stages SET status = 'pending', completed_at = NULL, started_at = NULL
        WHERE task_id = ? AND order_index > ? AND order_index < ?
      `).run(currentStage.task_id, targetStage.order_index, currentStage.order_index);

      // Hedef aşamayı yeniden aktive et
      db.prepare(
        "UPDATE task_stages SET status = 'active', started_at = CURRENT_TIMESTAMP, completed_at = NULL, revision_count = revision_count + 1 WHERE id = ?"
      ).run(toStageId);

      // Görev sahibini güncelle
      if (targetStage.assignee_id) {
        db.prepare("UPDATE tasks SET current_owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(targetStage.assignee_id, currentStage.task_id);
      }
    }

    // Revize kaydını oluştur
    db.prepare(`
      INSERT INTO stage_revisions (task_id, from_stage_id, to_stage_id, requested_by, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(currentStage.task_id, currentStage.id, toStageId || null, requestedBy || null, comment.trim());

    // Güncel aşamaları döndür
    const stages = db.prepare(`
      SELECT ts.*, m.name as assignee_name, m.avatar_color as assignee_color
      FROM task_stages ts
      LEFT JOIN members m ON ts.assignee_id = m.id
      WHERE ts.task_id = ?
      ORDER BY ts.order_index
    `).all(currentStage.task_id);

    const task = db.prepare(`
      SELECT t.*, m.name as owner_name, m.avatar_color as owner_color
      FROM tasks t LEFT JOIN members m ON t.current_owner_id = m.id
      WHERE t.id = ?
    `).get(currentStage.task_id);

    res.json({ stages, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aşamanın revize geçmişini getir
router.get('/:id/revisions', (req, res) => {
  try {
    const stage = db.prepare('SELECT task_id FROM task_stages WHERE id = ?').get(req.params.id);
    if (!stage) return res.status(404).json({ error: 'Aşama bulunamadı' });

    const revisions = db.prepare(`
      SELECT sr.*,
        m.name as requester_name, m.avatar_color as requester_color,
        fs.title as from_stage_title,
        ts2.title as to_stage_title
      FROM stage_revisions sr
      LEFT JOIN members m ON sr.requested_by = m.id
      LEFT JOIN task_stages fs ON sr.from_stage_id = fs.id
      LEFT JOIN task_stages ts2 ON sr.to_stage_id = ts2.id
      WHERE sr.from_stage_id = ? OR sr.to_stage_id = ?
      ORDER BY sr.created_at DESC
    `).all(req.params.id, req.params.id);

    res.json(revisions);
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
