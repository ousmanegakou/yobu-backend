const db = require('../config/db');
const DriverModel = {
  async findById(id) { const { rows } = await db.query('SELECT * FROM drivers WHERE id = $1', [id]); return rows[0]; },
  async findByEmail(email) { const { rows } = await db.query('SELECT * FROM drivers WHERE email = $1', [email]); return rows[0]; },
  async findAvailable() { const { rows } = await db.query("SELECT id, name, phone, vehicle_type, current_lat, current_lng FROM drivers WHERE status = 'available' AND active = TRUE"); return rows; },
  async updateStatus(id, status) { const { rows } = await db.query('UPDATE drivers SET status = $2 WHERE id = $1 RETURNING *', [id, status]); return rows[0]; },
  async updateLocation(id, lat, lng) {
    await db.query('UPDATE drivers SET current_lat = $2, current_lng = $3 WHERE id = $1', [id, lat, lng]);
    await db.query('INSERT INTO driver_locations (driver_id, lat, lng) VALUES ($1, $2, $3)', [id, lat, lng]);
  },
  async findAll({ limit = 50, offset = 0 } = {}) { const { rows } = await db.query('SELECT id, name, email, phone, vehicle_type, license_plate, status, active FROM drivers ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]); return rows; },
  async create(data) {
    const { name, email, password_hash, phone, vehicle_type, license_plate } = data;
    const { rows } = await db.query('INSERT INTO drivers (name, email, password_hash, phone, vehicle_type, license_plate) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [name, email, password_hash, phone, vehicle_type, license_plate]);
    return rows[0];
  },
};
module.exports = DriverModel;