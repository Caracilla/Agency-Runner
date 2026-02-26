const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const membersRouter = require('./routes/members');
const tasksRouter = require('./routes/tasks');
const stagesRouter = require('./routes/stages');
const briefsRouter = require('./routes/briefs');

app.use('/api/members', membersRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/stages', stagesRouter);
app.use('/api/briefs', briefsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
  try {
    const db = require('./db/database');
    res.json({
      total_tasks: db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
      todo: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='todo'").get().c,
      in_progress: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='in_progress'").get().c,
      completed: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='completed'").get().c,
      blocked: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='blocked'").get().c,
      total_members: db.prepare('SELECT COUNT(*) as c FROM members').get().c,
      urgent_tasks: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE priority='urgent' AND status!='completed'").get().c,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Agency Runner API: http://localhost:${PORT}`);
});
