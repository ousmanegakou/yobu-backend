const DriverModel = require('../models/driver.model');
const { sanitizeUser, getPagination } = require('../utils/helpers');
const DriversController = {
  async list(req, res) { const { limit, offset } = getPagination(req.query); const drivers = await DriverModel.findAll({ limit, offset }); res.json({ drivers: drivers.map(sanitizeUser), count: drivers.length }); },
  async getAvailable(req, res) { const drivers = await DriverModel.findAvailable(); res.json({ drivers }); },
  async getOne(req, res) { const driver = await DriverModel.findById(req.params.id); if (!driver) return res.status(404).json({ error: 'Not found' }); res.json(sanitizeUser(driver)); },
  async updateStatus(req, res) {
    const { status } = req.body;
    if (!['offline','available','on_route'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const driver = await DriverModel.updateStatus(req.user.id, status);
    res.json(sanitizeUser(driver));
  },
  async updateLocation(req, res) {
    const { lat, lng } = req.body;
    await DriverModel.updateLocation(req.user.id, lat, lng);
    if (req.app.locals.broadcast) req.app.locals.broadcast(req.user.id, { lat, lng });
    res.json({ ok: true });
  },
};
module.exports = DriversController;