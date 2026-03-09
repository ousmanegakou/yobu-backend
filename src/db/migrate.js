const fs = require('fs');
const path = require('path');
const db = require('../config/db');
async function migrate() {
  console.log('Running YOBU migrations...');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  try { await db.query(sql); console.log('Migration complete'); }
  catch (err) { console.error('Migration failed:', err.message); process.exit(1); }
  finally { await db.pool.end(); }
}
migrate();