const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// ─── POST /auth/merchant/login ────────────────────────────────
exports.merchantLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const { rows } = await db.query("SELECT * FROM merchants WHERE email = $1 AND is_active = true", [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const merchant = rows[0];
    const valid = await bcrypt.compare(password, merchant.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ id: merchant.id, role: "merchant", name: merchant.name });
    res.json({
      token,
      user: { id: merchant.id, name: merchant.name, email: merchant.email, category: merchant.category, plan: merchant.plan },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /auth/driver/login ──────────────────────────────────
exports.driverLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const { rows } = await db.query("SELECT * FROM drivers WHERE email = $1 AND is_active = true", [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const driver = rows[0];
    const valid = await bcrypt.compare(password, driver.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Mark driver as available
    await db.query("UPDATE drivers SET status = 'available', last_seen = NOW() WHERE id = $1", [driver.id]);

    const token = signToken({ id: driver.id, role: "driver", name: driver.name });
    res.json({
      token,
      user: { id: driver.id, name: driver.name, phone: driver.phone, vehicle: driver.vehicle, plate: driver.plate },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /auth/admin/login ───────────────────────────────────
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const { rows } = await db.query("SELECT * FROM admins WHERE email = $1", [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ id: admin.id, role: "admin", name: admin.name });
    res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /auth/merchant/register ────────────────────────────
exports.merchantRegister = async (req, res) => {
  const { name, email, password, phone, address, category } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "name, email, password required" });

  try {
    const exists = await db.query("SELECT id FROM merchants WHERE email = $1", [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO merchants (name, email, password_hash, phone, address, category)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, category, plan`,
      [name, email.toLowerCase(), hash, phone, address, category]
    );

    const token = signToken({ id: rows[0].id, role: "merchant", name: rows[0].name });
    res.status(201).json({ token, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /auth/driver/register ──────────────────────────────
exports.driverRegister = async (req, res) => {
  const { name, email, password, phone, vehicle, plate } = req.body;
  if (!name || !email || !password || !phone) return res.status(400).json({ error: "name, email, password, phone required" });

  try {
    const exists = await db.query("SELECT id FROM drivers WHERE email = $1", [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO drivers (name, email, password_hash, phone, vehicle, plate)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, phone, vehicle, plate`,
      [name, email.toLowerCase(), hash, phone, vehicle, plate]
    );

    const token = signToken({ id: rows[0].id, role: "driver", name: rows[0].name });
    res.status(201).json({ token, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /auth/me ─────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    let row;
    if (req.user.role === "merchant") {
      ({ rows: [row] } = await db.query("SELECT id,name,email,category,plan,phone FROM merchants WHERE id=$1", [req.user.id]));
    } else if (req.user.role === "driver") {
      ({ rows: [row] } = await db.query("SELECT id,name,email,phone,vehicle,plate,status FROM drivers WHERE id=$1", [req.user.id]));
    } else {
      ({ rows: [row] } = await db.query("SELECT id,name,email FROM admins WHERE id=$1", [req.user.id]));
    }
    res.json({ user: { ...row, role: req.user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
