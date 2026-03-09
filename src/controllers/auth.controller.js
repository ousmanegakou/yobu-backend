const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const MerchantModel = require('../models/merchant.model');
const DriverModel   = require('../models/driver.model');
const { JWT_SECRET, JWT_EXPIRES } = require('../config/env');
const { sanitizeUser } = require('../utils/helpers');
const signToken = (user, role) => jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
const AuthController = {
  async loginMerchant(req, res) {
    const { email, password } = req.body;
    const merchant = await MerchantModel.findByEmail(email);
    if (!merchant || !await bcrypt.compare(password, merchant.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: signToken(merchant, 'merchant'), user: sanitizeUser(merchant), role: 'merchant' });
  },
  async loginDriver(req, res) {
    const { email, password } = req.body;
    const driver = await DriverModel.findByEmail(email);
    if (!driver || !await bcrypt.compare(password, driver.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: signToken(driver, 'driver'), user: sanitizeUser(driver), role: 'driver' });
  },
  async registerMerchant(req, res) {
    const { name, email, password, phone, address } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const merchant = await MerchantModel.create({ name, email, password_hash, phone, address });
    res.status(201).json({ token: signToken(merchant, 'merchant'), user: sanitizeUser(merchant) });
  },
  async registerDriver(req, res) {
    const { name, email, password, phone, vehicle_type, license_plate } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const driver = await DriverModel.create({ name, email, password_hash, phone, vehicle_type, license_plate });
    res.status(201).json({ token: signToken(driver, 'driver'), user: sanitizeUser(driver) });
  },
  async me(req, res) {
    const Model = req.user.role === 'driver' ? DriverModel : MerchantModel;
    const user  = await Model.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user: sanitizeUser(user), role: req.user.role });
  },
};
module.exports = AuthController;