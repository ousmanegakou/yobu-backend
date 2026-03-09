const db = require('../config/db');
const CodesService = require('../services/codes');
const SMSService   = require('../services/sms');
const ScanController = {
  async scanPickup(req, res) {
    const { barcode } = req.body;
    const { rows: [delivery] } = await db.query('SELECT * FROM deliveries WHERE pickup_barcode = $1', [barcode]);
    if (!delivery) return res.status(404).json({ error: 'Barcode not found' });
    if (delivery.status !== 'assigned') return res.status(400).json({ error: 'Cannot pick up - status: ' + delivery.status });
    await db.query("UPDATE deliveries SET status = 'picked_up', picked_up_at = NOW() WHERE id = $1", [delivery.id]);
    const { rows: stops } = await db.query('SELECT * FROM stops WHERE delivery_id = $1', [delivery.id]);
    setImmediate(() => SMSService.notifyAllStops(stops, 'parcelPickedUp'));
    res.json({ message: 'Pickup confirmed' });
  },
  async scanQR(req, res) {
    const { tracking_id, sig } = req.body;
    if (!CodesService.verifyQRSignature(tracking_id, sig)) return res.status(400).json({ error: 'Invalid QR signature' });
    const { rows: [stop] } = await db.query('SELECT * FROM stops WHERE tracking_id = $1', [tracking_id]);
    if (!stop) return res.status(404).json({ error: 'Stop not found' });
    await db.query("UPDATE stops SET status = 'delivered', proof_type = 'qr', proof_data = $2, delivered_at = NOW() WHERE id = $1", [stop.id, tracking_id]);
    setImmediate(() => SMSService.delivered(stop));
    res.json({ message: 'Delivered via QR' });
  },
  async verifyOTP(req, res) {
    const { stop_id, otp } = req.body;
    const { rows: [stop] } = await db.query('SELECT * FROM stops WHERE id = $1', [stop_id]);
    if (!stop) return res.status(404).json({ error: 'Stop not found' });
    if (stop.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    await db.query("UPDATE stops SET status = 'delivered', proof_type = 'otp', proof_data = $2, delivered_at = NOW() WHERE id = $1", [stop.id, otp]);
    setImmediate(() => SMSService.delivered(stop));
    res.json({ message: 'Delivered via OTP' });
  },
  async requestOTP(req, res) {
    const { tracking_id } = req.body;
    const { rows: [stop] } = await db.query('SELECT * FROM stops WHERE tracking_id = $1', [tracking_id]);
    if (!stop) return res.status(404).json({ error: 'Stop not found' });
    await SMSService.sendOTP(stop);
    res.json({ message: 'OTP sent' });
  },
};
module.exports = ScanController;