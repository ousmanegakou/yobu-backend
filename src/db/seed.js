const bcrypt = require('bcryptjs');
const db = require('../config/db');
async function seed() {
  console.log('Seeding YOBU test data...');
  const hash = await bcrypt.hash('password123', 10);
  await db.query("INSERT INTO merchants (name, email, password_hash, phone, address, plan) VALUES ('Pharmacie Centrale', 'merchant@yobu.com', $1, '+1-514-000-0001', '123 Main St, Montreal', 'pro') ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name", [hash]);
  await db.query("INSERT INTO drivers (name, email, password_hash, phone, vehicle_type, license_plate, status) VALUES ('Alex Dupont', 'driver@yobu.com', $1, '+1-514-000-0002', 'car', 'QC-1234', 'available') ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name", [hash]);
  await db.query("INSERT INTO merchants (name, email, password_hash, phone, plan) VALUES ('YOBU Admin', 'admin@yobu.com', $1, '+1-514-000-0000', 'admin') ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name", [hash]);
  console.log('Seed done! merchant@yobu.com / driver@yobu.com / admin@yobu.com — password: password123');
  await db.pool.end();
}
seed().catch(err => { console.error(err); process.exit(1); });