// สร้าง user ทดสอบในฐานข้อมูล
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'game_topup'
});

// ตรวจสอบโครงสร้างตาราง users
db.query('DESCRIBE users', (err, results) => {
  if (err) {
    console.error('Error describing users table:', err);
    return;
  }
  console.log('Users table structure:', results);
  
  // สร้าง user ทดสอบ
  const testUser = {
    username: 'admin',
    password: '1234',
    email: 'admin@test.com',
    role: 'admin'
  };
  
  db.query('INSERT INTO users SET ?', testUser, (err, result) => {
    if (err) {
      console.error('Error creating user:', err);
    } else {
      console.log('Test user created with ID:', result.insertId);
    }
    
    // ดูผู้ใช้ทั้งหมด
    db.query('SELECT * FROM users LIMIT 5', (err, users) => {
      if (err) {
        console.error('Error fetching users:', err);
      } else {
        console.log('Users in database:', users);
      }
      db.end();
    });
  });
});
