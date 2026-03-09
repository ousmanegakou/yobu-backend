const db = require('../config/db');
const TrackingController = {
  async getByTrackingId(req, res) {
    const { tracking_id } = req.params;
    const { rows: [stop] } = await db.query('SELECT s.id, s.stop_order, s.customer_name, s.address, s.status, s.eta_minutes, s.delivered_at, d.pickup_address, d.status AS delivery_status, dr.name AS driver_name, dr.current_lat, dr.current_lng, m.name AS merchant_name FROM stops s JOIN deliveries d ON d.id = s.delivery_id LEFT JOIN drivers dr ON dr.id = d.driver_id LEFT JOIN merchants m ON m.id = d.merchant_id WHERE s.tracking_id = $1', [tracking_id]);
    if (!stop) return res.status(404).json({ error: 'Not found' });
    res.json({ tracking_id, stop: { order: stop.stop_order, status: stop.status, eta_minutes: stop.eta_minutes, address: stop.address, delivered_at: stop.delivered_at }, delivery: { status: stop.delivery_status, pickup_address: stop.pickup_address, merchant: stop.merchant_name }, driver: stop.driver_name ? { name: stop.driver_name, lat: stop.current_lat, lng: stop.current_lng } : null });
  },
  async updateETA(req, res) {
    const { stop_id, eta_minutes } = req.body;
    const { rows: [stop] } = await db.query('UPDATE stops SET eta_minutes = $2 WHERE id = $1 RETURNING tracking_id', [stop_id, eta_minutes]);
    if (!stop) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, tracking_id: stop.tracking_id });
  },
};
module.exports = TrackingController;