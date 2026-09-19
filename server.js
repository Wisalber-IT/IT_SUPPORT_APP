const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// 🌟 เพิ่มบรรทัดนี้: ตรวจสอบว่ารันผ่าน .exe (pkg) หรือรันผ่าน node ปกติ
const baseDir = process.pkg ? path.dirname(process.execPath) : __dirname;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const HOST_ADMIN_PIN = "admin1234";

// 🌟 เปลี่ยน __dirname เป็น baseDir ให้หมด
const uploadDir = path.join(baseDir, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ticketId = req.params.id || 'general';
    const ticketDir = path.join(baseDir, 'public', 'uploads', `ticket_${ticketId}`);
    if (!fs.existsSync(ticketDir)) {
      fs.mkdirSync(ticketDir, { recursive: true });
    }
    cb(null, ticketDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 🌟 เปลี่ยน __dirname เป็น baseDir
const dbFile = path.join(baseDir, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) console.error('Database error:', err.message);
  else console.log('Connected to SQLite Database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_username TEXT,
    client_name TEXT,
    department TEXT,
    category TEXT,
    issue TEXT,
    priority TEXT,
    status TEXT DEFAULT 'Pending',
    assignee TEXT DEFAULT 'ยังไม่ระบุ',
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    department TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, () => {
    db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
      if (row.count === 0) {
        db.run(`INSERT INTO users (username, password, role, department) VALUES ('admin', '1234', 'Host Admin', 'Management')`);
        db.run(`INSERT INTO users (username, password, role, department) VALUES ('dispatcher', '1234', 'Admin', 'Operations')`);
        db.run(`INSERT INTO users (username, password, role, department) VALUES ('suchart', '1234', 'IT Staff', 'Infrastructure')`);
        db.run(`INSERT INTO users (username, password, role, department) VALUES ('audit', '1234', 'Audit', 'Quality Assurance')`);
        db.run(`INSERT INTO users (username, password, role, department) VALUES ('client1', '1234', 'Client', 'Customer')`);
        console.log('Default enterprise accounts created.');
      }
    });
  });

  db.run(`CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER,
    sender TEXT,
    role TEXT,
    message TEXT,
    file_url TEXT,
    file_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS internal_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER,
    sender TEXT,
    role TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
  )`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 🌟 เปลี่ยน __dirname เป็น baseDir
app.use(express.static(path.join(baseDir, 'public')));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === HOST_ADMIN_PIN) {
    return res.json({
      success: true,
      user: { id: 0, username: 'Host Admin', role: 'Host Admin', department: 'System' }
    });
  }
  db.get(`SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1`, [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: '❌ ชื่อผู้ใช้งาน รหัสผ่านไม่ถูกต้อง หรือบัญชีนี้ถูกระงับการใช้งาน' });
    res.json({ success: true, user: row });
  });
});

app.get('/api/it-staff', (req, res) => {
  db.all(`SELECT username, department FROM users WHERE role = 'IT Staff' AND is_active = 1`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/tickets', (req, res) => {
  const { username, role } = req.headers;
  let query = `SELECT * FROM tickets WHERE is_deleted = 0 ORDER BY id DESC`;
  let params = [];

  if (role === 'Client') {
    query = `SELECT * FROM tickets WHERE is_deleted = 0 AND client_username = ? ORDER BY id DESC`;
    params = [username];
  } else if (role === 'IT Staff') {
    query = `SELECT * FROM tickets WHERE is_deleted = 0 AND assignee = ? ORDER BY id DESC`;
    params = [username];
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/reports/monthly', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Missing month parameter' });

  const query = `SELECT * FROM tickets WHERE strftime('%Y-%m', created_at) = ? AND is_deleted = 0 ORDER BY id DESC`;
  db.all(query, [month], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const summary = {
      total: rows.length,
      pending: rows.filter(r => r.status === 'Pending' || r.status === 'In Progress').length,
      resolved: rows.filter(r => r.status === 'Resolved').length,
      cancelled: rows.filter(r => r.status.startsWith('Cancelled')).length,
    };
    res.json({ success: true, month, summary, tickets: rows });
  });
});

app.post('/api/tickets', (req, res) => {
  const { client_username, department, category, issue, impact, urgency } = req.body;
  if (!issue) return res.status(400).json({ error: 'Missing required fields' });

  let priority = 'Low';
  const score = parseInt(impact) + parseInt(urgency);
  if (score >= 5) priority = 'Critical';
  else if (score === 4) priority = 'High';
  else if (score === 3) priority = 'Medium';

  const stmt = db.prepare(`INSERT INTO tickets (client_username, client_name, department, category, issue, priority) VALUES (?, ?, ?, ?, ?, ?)`);
  stmt.run(client_username, client_username, department, category, issue, priority, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const newTicket = { id: this.lastID, client_username, client_name: client_username, department, category, issue, priority, status: 'Pending', assignee: 'ยังไม่ระบุ', created_at: new Date() };
    io.emit('new-ticket', newTicket);
    res.json({ success: true, id: this.lastID, priority });
  });
  stmt.finalize();
});

app.patch('/api/tickets/:id', (req, res) => {
  const { status, assignee, role } = req.body;
  const { id } = req.params;

  if (role === 'IT Staff' && status === 'Resolved') {
    return res.status(403).json({ error: '⚠️ IT Staff ไม่สามารถปิดเคสได้โดยตรง ต้องส่งตรวจให้ Host Sign-off เท่านั้น' });
  }

  let query = `UPDATE tickets SET `;
  let params = [];
  if (status) { query += `status = ? `; params.push(status); }
  if (assignee !== undefined) { if (status) query += `, `; query += `assignee = ? `; params.push(assignee); }
  query += `WHERE id = ?`;
  params.push(id);

  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('update-ticket', { id, status, assignee });
    res.json({ success: true });
  });
});

app.post('/api/tickets/:id/signoff', (req, res) => {
  const { adminPin, role } = req.body;
  const { id } = req.params;
  
  if (role !== 'Admin' && role !== 'Host Admin' && role !== 'Host Admin (Local)') {
    return res.status(403).json({ error: '❌ ไม่มีสิทธิ์อนุมัติ Sign-off เคสนี้' });
  }

  db.run(`UPDATE tickets SET status = 'Resolved' WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('update-ticket', { id, status: 'Resolved' });
    res.json({ success: true });
  });
});

app.delete('/api/tickets/:id', (req, res) => {
  const { id } = req.params;
  const { reason, role } = req.body;

  if (role !== 'Admin' && role !== 'Host Admin' && role !== 'Host Admin (Local)') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const cancelStatus = reason ? `Cancelled: ${reason}` : `Cancelled: ยกเลิกโดยผู้ดูแลระบบ`;
  
  db.run(`UPDATE tickets SET status = ? WHERE id = ?`, [cancelStatus, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('update-ticket', { id, status: cancelStatus });
    res.json({ success: true });
  });
});

app.get('/api/tickets/:id/messages', (req, res) => {
  db.all(`SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tickets/:id/messages', upload.single('file'), (req, res) => {
  const ticketId = req.params.id;
  const { sender, role, message } = req.body;
  
  if (role === 'Audit') return res.status(403).json({ error: 'Read-only' });

  db.get(`SELECT status FROM tickets WHERE id = ?`, [ticketId], (err, ticket) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!ticket || ticket.status === 'Resolved' || ticket.status.startsWith('Cancelled')) {
      return res.status(403).json({ error: '❌ เคสนี้ถูกปิดหรือยกเลิกแล้ว ไม่สามารถแชทเพิ่มเติมได้' });
    }

    let fileUrl = null, fileType = null;
    if (req.file) {
      fileUrl = `/uploads/ticket_${ticketId}/${req.file.filename}`;
      if (req.file.mimetype.startsWith('image/')) fileType = 'image';
      else if (req.file.mimetype.startsWith('video/')) fileType = 'video';
      else fileType = 'file';
    }

    const stmt = db.prepare(`INSERT INTO ticket_messages (ticket_id, sender, role, message, file_url, file_type) VALUES (?, ?, ?, ?, ?, ?)`);
    stmt.run(ticketId, sender, role, message || '', fileUrl, fileType, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const newMessage = { id: this.lastID, ticket_id: ticketId, sender, role, message: message || '', file_url: fileUrl, file_type: fileType, created_at: new Date() };
      io.to(`ticket_${ticketId}`).emit('new-message', newMessage);
      res.json({ success: true, message: newMessage });
    });
    stmt.finalize();
  });
});

app.get('/api/tickets/:id/internal', (req, res) => {
  db.all(`SELECT * FROM internal_notes WHERE ticket_id = ? ORDER BY id ASC`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tickets/:id/internal', (req, res) => {
  const ticketId = req.params.id;
  const { sender, role, message } = req.body;
  
  if (role === 'Client' || role === 'Audit') return res.status(403).json({ error: 'Unauthorized' });

  db.get(`SELECT status FROM tickets WHERE id = ?`, [ticketId], (err, ticket) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!ticket || ticket.status === 'Resolved' || ticket.status.startsWith('Cancelled')) {
      return res.status(403).json({ error: '❌ เคสนี้ถูกปิดหรือยกเลิกแล้ว' });
    }

    const stmt = db.prepare(`INSERT INTO internal_notes (ticket_id, sender, role, message) VALUES (?, ?, ?, ?)`);
    stmt.run(ticketId, sender, role, message, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const newNote = { id: this.lastID, ticket_id: ticketId, sender, role, message, created_at: new Date() };
      io.to(`internal_${ticketId}`).emit('new-internal-note', newNote);
      res.json({ success: true, note: newNote });
    });
    stmt.finalize();
  });
});

app.get('/api/users', (req, res) => {
  db.all(`SELECT id, username, password, role, department, created_at FROM users WHERE is_active = 1 ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/users', (req, res) => {
  const { username, password, role, department, adminPin } = req.body;
  if (adminPin !== HOST_ADMIN_PIN) return res.status(403).json({ error: '❌ PIN ไม่ถูกต้อง' });

  const uname = username.trim();
  
  db.get(`SELECT is_active FROM users WHERE username = ?`, [uname], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      if (row.is_active === 1) {
        return res.status(400).json({ error: '❌ ชื่อผู้ใช้นี้กำลังใช้งานอยู่ในระบบแล้ว' });
      } else {
        return res.status(400).json({ error: '❌ เคยมีบัญชีนี้และ พนง.คนนั้นลาออกไปแล้วหรือถูกลบไปแล้ว' });
      }
    }

    const stmt = db.prepare(`INSERT INTO users (username, password, role, department) VALUES (?, ?, ?, ?)`);
    stmt.run(uname, password.trim() || '1234', role || 'Client', department.trim() || 'ทั่วไป', function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    });
    stmt.finalize();
  });
});

app.patch('/api/users/:id/password', (req, res) => {
  const { newPassword, adminPin } = req.body;
  if (adminPin !== HOST_ADMIN_PIN) return res.status(403).json({ error: '❌ PIN ไม่ถูกต้อง' });

  db.run(`UPDATE users SET password = ? WHERE id = ?`, [newPassword.trim(), req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/users/:id', (req, res) => {
  const { adminPin } = req.body;
  if (adminPin !== HOST_ADMIN_PIN) return res.status(403).json({ error: '❌ PIN ไม่ถูกต้อง' });

  db.get(`SELECT username FROM users WHERE id = ?`, [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || user.username === 'admin') return res.status(403).json({ error: '⚠️ ห้ามลบ Host Admin หลัก' });
    
    db.run(`UPDATE users SET is_active = 0 WHERE id = ?`, [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      io.emit('force-logout', user.username);
      res.json({ success: true });
    });
  });
});

io.on('connection', (socket) => {
  socket.on('join-ticket', (id) => { socket.join(`ticket_${id}`); socket.join(`internal_${id}`); });
  socket.on('leave-ticket', (id) => { socket.leave(`ticket_${id}`); socket.leave(`internal_${id}`); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => { console.log(`IT Ticket System running on port ${PORT}`); });