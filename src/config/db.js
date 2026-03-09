const { Pool } = require('pg');
const { DATABASE_URL, NODE_ENV } = require('./env');
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000,
});
pool.on('error', (err) => console.error('DB error:', err));
module.exports = { query: (text, params) => pool.query(text, params), getClient: () => pool.connect(), pool };