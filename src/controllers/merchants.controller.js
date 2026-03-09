const MerchantModel = require('../models/merchant.model');
const { sanitizeUser, getPagination } = require('../utils/helpers');
const MerchantsController = {
  async list(req, res) { const { limit, offset } = getPagination(req.query); const merchants = await MerchantModel.findAll({ limit, offset }); res.json({ merchants: merchants.map(sanitizeUser), count: merchants.length }); },
  async getOne(req, res) { const m = await MerchantModel.findById(req.params.id); if (!m) return res.status(404).json({ error: 'Not found' }); res.json(sanitizeUser(m)); },
  async getStats(req, res) { const id = req.params.id || req.user.id; const stats = await MerchantModel.getStats(id); res.json(stats); },
};
module.exports = MerchantsController;