// Basic Express server with MySQL connection for db: game_topup
// Load environment variables from .env file
require('dotenv').config();

const { getPrimaryKey } = require('./dbUtils');
const { authenticateToken, SECRET } = require('./auth');
const jwt = require('jsonwebtoken');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for localhost development
app.use(cors({
  origin: true, // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// MySQL connection pool for better stability
const db = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'game_topup',
  connectionLimit: 10,
  connectTimeout: 30000
});

// Test MySQL connection
const testConnection = () => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error('MySQL connection failed:', err);
      console.log('Retrying MySQL connection in 5 seconds...');
      setTimeout(testConnection, 5000);
    } else {
      console.log('Connected to MySQL database successfully');
      connection.release();
    }
  });
};

// Start MySQL connection test
testConnection();

// Health check endpoint (สำคัญสำหรับ Easy Panel)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Alaskan API is running!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      login: '/login',
      api: '/api/{table}'
    }
  });
});

// Debug endpoint: ดูโครงสร้างตาราง users
app.get('/debug/users-structure', (req, res) => {
  db.query('DESCRIBE users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Debug endpoint: ดูข้อมูลผู้ใช้ทั้งหมด (เฉพาะ field ที่ไม่ sensitive)
app.get('/debug/users', (req, res) => {
  db.query('SELECT id, username, email, role, created_at FROM users LIMIT 5', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Login endpoint (POST /login) - แก้ไขให้ตรงกับโครงสร้างตาราง users
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  // หาผู้ใช้ด้วย email
  db.query('SELECT * FROM users WHERE email = ? AND status = ?', [email, 'ACTIVE'], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const user = results[0];
    
    // เปรียบเทียบ password (plain text - ใน production ควรใช้ bcrypt)
    if (user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
    
    // อัพเดท last_login_at
    db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    
    // สร้าง JWT token
    const token = jwt.sign({ 
      id: user.id, 
      email: user.email,
      name: user.name,
      role: user.role
    }, SECRET, { expiresIn: '10h' });
    
    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });
  });
});
// ...existing code...

// CRUD: Read all (protected)
app.get('/api/:table', authenticateToken, (req, res) => {
  const table = req.params.table;
  db.query(`SELECT * FROM ??`, [table], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// CRUD: Read one by primary key (protected)
app.get('/api/:table/:id', authenticateToken, (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  getPrimaryKey(db, table, (err, pk) => {
    if (err) return res.status(400).json({ error: err.message });
    db.query(`SELECT * FROM ?? WHERE ?? = ?`, [table, pk, id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(results[0]);
    });
  });
});

// CRUD: Create (protected)
app.post('/api/:table', authenticateToken, (req, res) => {
  const table = req.params.table;
  const data = req.body;
  db.query(`INSERT INTO ?? SET ?`, [table, data], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId, ...data });
  });
});

// CRUD: Update by primary key (protected)
app.put('/api/:table/:id', authenticateToken, (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  const data = req.body;
  getPrimaryKey(db, table, (err, pk) => {
    if (err) return res.status(400).json({ error: err.message });
    db.query(`UPDATE ?? SET ? WHERE ?? = ?`, [table, data, pk, id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ affectedRows: result.affectedRows });
    });
  });
});

// CRUD: Delete by primary key (protected)
app.delete('/api/:table/:id', authenticateToken, (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  getPrimaryKey(db, table, (err, pk) => {
    if (err) return res.status(400).json({ error: err.message });
    db.query(`DELETE FROM ?? WHERE ?? = ?`, [table, pk, id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ affectedRows: result.affectedRows });
    });
  });
});

// Import และใช้ refund routes
const createRefundRoutes = require('./refundRoutes');
app.use('/api/refunds', createRefundRoutes(db));

// Import และใช้ order routes
const createOrderRoutes = require('./orderRoutes');
app.use('/api/orders', createOrderRoutes(db));

app.listen(port, '0.0.0.0', () => {
  console.log(`API server running at http://0.0.0.0:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MySQL Host: ${process.env.MYSQL_HOST || 'localhost'}`);
});
