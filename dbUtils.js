// Utility: Get primary key for a table
const getPrimaryKey = (db, table, cb) => {
  db.query(`SHOW KEYS FROM ?? WHERE Key_name = 'PRIMARY'`, [table], (err, results) => {
    if (err) return cb(err);
    if (results.length === 0) return cb(new Error('No primary key found'));
    cb(null, results[0].Column_name);
  });
};

module.exports = { getPrimaryKey };
