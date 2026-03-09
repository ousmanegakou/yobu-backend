const db = require('../config/db');
const MerchantModel = {
  async findById(id) { const { rows } = await db.query('SELECT * FROM merchants WHERE id = $1', [id]); return rows[0]; },
  async findByEmail(email) { const { rows } = await db.query('SELECT * FROM merchants WHERE email = $1', [email]); return rows[0]; },
  async create({ name, email, password_hash, phone, address, plan = 'starter' }) {
    const { rows } = await db.query('INSERT INTO merchants (name, email, password_hash, phone, address, plan) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [name, email, password_hash, phone, address, plan]);
    return rows[0];
  },
  async findAll({ limit = 50, offset = 0 } = {}) {
    const { rows } = await db.query('SELECT id, name, email, phone, plan, active, created_at FROM merchants ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
    return rows;
  },
  async getStats(id) {
    const { rows } = await db.query('SELECT COUNT(d.id) AS total_deliveries, COUNT(d.id) FILTER (WHERE d.status = \'completed\') AS completed, SUM(d.total_price) FILTER (WHERE d.status = \'completed\') AS total_revenue FROM deliveries d WHERE d.merchant_id = $1', [id]);
    return rows[0];
  },
};
module.exports = MerchantModel;