const db = require('../config/db');
const { calculateInvoice } = require('../services/pricing');
const { getMonthRange, getPagination } = require('../utils/helpers');
const BillingController = {
  async generateInvoice(req, res) {
    const merchant_id = req.params.merchant_id || req.user.id;
    const year  = parseInt(req.body.year  || new Date().getFullYear());
    const month = parseInt(req.body.month || new Date().getMonth() + 1);
    const { period_start, period_end } = getMonthRange(year, month);
    const { rows: deliveries } = await db.query("SELECT * FROM deliveries WHERE merchant_id = $1 AND status = 'completed' AND completed_at BETWEEN $2 AND $3", [merchant_id, period_start, period_end + ' 23:59:59']);
    const totals = calculateInvoice(deliveries);
    const { rows: [invoice] } = await db.query('INSERT INTO invoices (merchant_id, period_start, period_end, total_routes, total_stops, total_miles, subtotal, tax, total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING RETURNING *', [merchant_id, period_start, period_end, totals.total_routes, totals.total_stops, totals.total_miles, totals.subtotal, totals.tax, totals.total]);
    res.json({ invoice: invoice || totals, deliveries, period: { year, month, period_start, period_end } });
  },
  async listInvoices(req, res) {
    const merchant_id = req.params.merchant_id || req.user.id;
    const { limit, offset } = getPagination(req.query);
    const { rows } = await db.query('SELECT * FROM invoices WHERE merchant_id = $1 ORDER BY period_start DESC LIMIT $2 OFFSET $3', [merchant_id, limit, offset]);
    res.json({ invoices: rows, count: rows.length });
  },
  async markPaid(req, res) {
    const { rows: [invoice] } = await db.query("UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = $1 RETURNING *", [req.params.invoice_id]);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    res.json(invoice);
  },
};
module.exports = BillingController;