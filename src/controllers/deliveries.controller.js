const db = require('../config/db');
const { getPagination } = require('../utils/helpers');
const { calculatePrice } = require('../services/pricing');
const CodesService = require('../services/codes');
const SMSService   = require('../services/sms');
const DeliveriesController = {
  async create(req, res) {
    const { pickup_address, stops, total_miles = 0, scheduled_at } = req.body;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const pricing = calculatePrice(stops.length, total_miles);
      const pickup_barcode = CodesService.generatePickupBarcode(req.user.id.substring(0,4) + '-' + Date.now());
      const { rows: [delivery] } = await client.query('INSERT INTO deliveries (merchant_id, pickup_address, pickup_barcode, total_stops, total_miles, base_price, stops_price, mileage_price, total_price, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [req.user.id, pickup_address, pickup_barcode, stops.length, total_miles, pricing.base_price, pricing.stops_price, pricing.mileage_price, pricing.total_price, scheduled_at]);
      const createdStops = [];
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const tracking_id = CodesService.generateTrackingId();
        const qr_code     = CodesService.generateQRPayload(tracking_id);
        const otp         = CodesService.generateOTP();
        const { rows: [s] } = await client.query('INSERT INTO stops (delivery_id, stop_order, customer_name, customer_phone, address, tracking_id, qr_code, otp, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [delivery.id, i+1, stop.customer_name, stop.customer_phone, stop.address, tracking_id, qr_code, otp, stop.notes || null]);
        createdStops.push(s);
      }
      await client.query('COMMIT');
      setImmediate(async () => { for (const stop of createdStops) { try { await SMSService.routeCreated(stop); } catch {} } });
      res.status(201).json({ ...delivery, stops: createdStops, pricing });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  },
  async list(req, res) {
    const { limit, offset } = getPagination(req.query);
    const { status } = req.query;
    let rows;
    if (req.user.role === 'merchant') {
      const params = [req.user.id, limit, offset]; const sf = status ? 'AND d.status = $4' : ''; if (status) params.push(status);
      const r = await db.query('SELECT d.*, COUNT(s.id) AS stop_count FROM deliveries d LEFT JOIN stops s ON s.delivery_id = d.id WHERE d.merchant_id = $1 ' + sf + ' GROUP BY d.id ORDER BY d.created_at DESC LIMIT $2 OFFSET $3', params);
      rows = r.rows;
    } else if (req.user.role === 'driver') {
      const r = await db.query("SELECT d.*, json_agg(s.* ORDER BY s.stop_order) AS stops FROM deliveries d LEFT JOIN stops s ON s.delivery_id = d.id WHERE d.driver_id = $1 AND d.status NOT IN ('completed','cancelled') GROUP BY d.id ORDER BY d.created_at DESC", [req.user.id]);
      rows = r.rows;
    } else {
      const params = [limit, offset]; const sf = status ? 'WHERE d.status = $3' : ''; if (status) params.push(status);
      const r = await db.query('SELECT d.*, m.name AS merchant_name FROM deliveries d LEFT JOIN merchants m ON m.id = d.merchant_id ' + sf + ' ORDER BY d.created_at DESC LIMIT $1 OFFSET $2', params);
      rows = r.rows;
    }
    res.json({ deliveries: rows, count: rows.length });
  },
  async getOne(req, res) {
    const { rows: [d] } = await db.query("SELECT d.*, json_agg(s.* ORDER BY s.stop_order) AS stops FROM deliveries d LEFT JOIN stops s ON s.delivery_id = d.id WHERE d.id = $1 GROUP BY d.id", [req.params.id]);
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  },
  async assignDriver(req, res) {
    const { rows: [d] } = await db.query("UPDATE deliveries SET status = 'assigned', driver_id = $2 WHERE id = $1 RETURNING *", [req.params.id, req.body.driver_id]);
    res.json(d);
  },
  async cancel(req, res) {
    const { rows: [d] } = await db.query("UPDATE deliveries SET status = 'cancelled' WHERE id = $1 RETURNING *", [req.params.id]);
    res.json(d);
  },
};
module.exports = DeliveriesController;