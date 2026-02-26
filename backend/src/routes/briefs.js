const express = require('express');
const router = express.Router();
const db = require('../db/database');

function getBriefWithApprovals(briefId) {
  const brief = db.prepare(`
    SELECT b.*, m.name as creator_name, m.avatar_color as creator_color
    FROM briefs b
    LEFT JOIN members m ON b.created_by = m.id
    WHERE b.id = ?
  `).get(briefId);

  if (!brief) return null;

  brief.approvals = db.prepare(`
    SELECT ba.*, m.name as approver_name, m.avatar_color as approver_color
    FROM brief_approvals ba
    JOIN members m ON ba.approver_id = m.id
    WHERE ba.brief_id = ?
    ORDER BY ba.created_at
  `).all(briefId);

  return brief;
}

// Görevin briefini getir
router.get('/task/:taskId', (req, res) => {
  try {
    const brief = db.prepare('SELECT id FROM briefs WHERE task_id = ?').get(req.params.taskId);
    if (!brief) return res.json(null);
    res.json(getBriefWithApprovals(brief.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brief oluştur
router.post('/task/:taskId', (req, res) => {
  try {
    const { title, description, objectives, target_audience, deliverables, budget, timeline_notes, notes, created_by } = req.body;
    if (!title) return res.status(400).json({ error: 'Brief başlığı zorunludur' });

    const existing = db.prepare('SELECT id FROM briefs WHERE task_id = ?').get(req.params.taskId);
    if (existing) return res.status(400).json({ error: 'Bu görevin zaten bir briefi var' });

    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Görev bulunamadı' });

    const result = db.prepare(`
      INSERT INTO briefs (task_id, title, description, objectives, target_audience, deliverables, budget, timeline_notes, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.taskId, title, description || null, objectives || null, target_audience || null,
           deliverables || null, budget || null, timeline_notes || null, notes || null, created_by || null);

    res.status(201).json(getBriefWithApprovals(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brief güncelle (sadece draft veya rejected iken)
router.put('/:id', (req, res) => {
  try {
    const { title, description, objectives, target_audience, deliverables, budget, timeline_notes, notes } = req.body;
    const brief = db.prepare('SELECT * FROM briefs WHERE id = ?').get(req.params.id);
    if (!brief) return res.status(404).json({ error: 'Brief bulunamadı' });
    if (brief.status === 'pending') return res.status(400).json({ error: 'Onay bekleyen brief düzenlenemez' });
    if (brief.status === 'approved') return res.status(400).json({ error: 'Onaylanan brief düzenlenemez' });

    db.prepare(`
      UPDATE briefs SET
        title = ?, description = ?, objectives = ?, target_audience = ?,
        deliverables = ?, budget = ?, timeline_notes = ?, notes = ?,
        status = 'draft', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || brief.title,
      description !== undefined ? description : brief.description,
      objectives !== undefined ? objectives : brief.objectives,
      target_audience !== undefined ? target_audience : brief.target_audience,
      deliverables !== undefined ? deliverables : brief.deliverables,
      budget !== undefined ? budget : brief.budget,
      timeline_notes !== undefined ? timeline_notes : brief.timeline_notes,
      notes !== undefined ? notes : brief.notes,
      req.params.id
    );

    res.json(getBriefWithApprovals(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brief'i onaya gönder (onaylayıcıları belirle)
router.post('/:id/submit', (req, res) => {
  try {
    const { approverIds } = req.body; // array of member ids
    if (!approverIds || approverIds.length === 0) {
      return res.status(400).json({ error: 'En az bir onaylayıcı seçmelisiniz' });
    }

    const brief = db.prepare('SELECT * FROM briefs WHERE id = ?').get(req.params.id);
    if (!brief) return res.status(404).json({ error: 'Brief bulunamadı' });
    if (brief.status === 'approved') return res.status(400).json({ error: 'Brief zaten onaylandı' });
    if (brief.status === 'pending') return res.status(400).json({ error: 'Brief zaten onay bekliyor' });

    // Mevcut onay kayıtlarını temizle (revizyon durumunda)
    db.prepare('DELETE FROM brief_approvals WHERE brief_id = ?').run(req.params.id);

    // Yeni onaylayıcıları ekle
    const insertApproval = db.prepare(
      'INSERT INTO brief_approvals (brief_id, approver_id) VALUES (?, ?)'
    );
    for (const approverId of approverIds) {
      insertApproval.run(req.params.id, approverId);
    }

    // Brief durumunu güncelle
    db.prepare(
      "UPDATE briefs SET status = 'pending', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(req.params.id);

    res.json(getBriefWithApprovals(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brief onay kararı ver (approve / reject)
router.post('/:id/respond', (req, res) => {
  try {
    const { approverId, decision, comment } = req.body; // decision: 'approved' | 'rejected'
    if (!approverId || !decision) return res.status(400).json({ error: 'approverId ve decision zorunludur' });
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Geçersiz karar' });

    const brief = db.prepare('SELECT * FROM briefs WHERE id = ?').get(req.params.id);
    if (!brief) return res.status(404).json({ error: 'Brief bulunamadı' });
    if (brief.status !== 'pending') return res.status(400).json({ error: 'Brief onay beklemiyor' });

    const approval = db.prepare(
      'SELECT * FROM brief_approvals WHERE brief_id = ? AND approver_id = ?'
    ).get(req.params.id, approverId);

    if (!approval) return res.status(403).json({ error: 'Bu briefe onay verme yetkiniz yok' });
    if (approval.status !== 'pending') return res.status(400).json({ error: 'Zaten yanıt verdiniz' });

    // Onay kaydını güncelle
    db.prepare(`
      UPDATE brief_approvals SET status = ?, comment = ?, responded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(decision, comment || null, approval.id);

    // Genel brief durumunu belirle
    const allApprovals = db.prepare('SELECT status FROM brief_approvals WHERE brief_id = ?').all(req.params.id);
    const hasRejection = allApprovals.some(a => a.status === 'rejected');
    const allApproved = allApprovals.every(a => a.status === 'approved');

    let newStatus = 'pending';
    if (hasRejection) newStatus = 'rejected';
    else if (allApproved) newStatus = 'approved';

    db.prepare("UPDATE briefs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(newStatus, req.params.id);

    res.json(getBriefWithApprovals(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brief'i draft'a geri al (revizyon için)
router.post('/:id/revise', (req, res) => {
  try {
    const brief = db.prepare('SELECT * FROM briefs WHERE id = ?').get(req.params.id);
    if (!brief) return res.status(404).json({ error: 'Brief bulunamadı' });
    if (brief.status !== 'rejected') return res.status(400).json({ error: 'Sadece reddedilen briefler revize edilebilir' });

    db.prepare("UPDATE briefs SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(req.params.id);
    db.prepare('DELETE FROM brief_approvals WHERE brief_id = ?').run(req.params.id);

    res.json(getBriefWithApprovals(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
