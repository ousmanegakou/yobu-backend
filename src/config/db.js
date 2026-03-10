const { Pool } = require('pg');
const { DATABASE_URL, NODE_ENV } = require('./env');
const pool = new Pool({ connectionString: DATABASE_URL, ssl: NODE_ENV==='production'?{rejectUnauthorized:false}:false, max:20 });
pool.on('error', err => console.error('DB error:', err));
module.exports = { query: (t,p) => pool.query(t,p), getClient: () => pool.connect(), pool };
