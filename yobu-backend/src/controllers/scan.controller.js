const db = require("../db");
const { verifyQRScan } = require("../services/codes");
const smsService = require("../services/sms");

// ─── POST /scan/pickup  — Driver scans barcode at store ───────
// Body: { barcode }   (e.g. "YB-R4825-PKP")
exports.scanPickup = async (req, res) => {
  const { barcode, lat, lng } = req.body;
  const driver_id = req.user.id;

  if (!barcode) return res.status(400).json({ error: "barcode required" });

  try {
    // Find route by barcode
    const { rows: [route] } = await db.query(
      "SELECT * FROM routes WHERE pickup_barcode = $1",
      [barcode.trim().toUpperCase()]
    );
    if (!route) return res.status(404).json({ error: "Barcode not found", barcode });

    // Verify driver is assigned
    if (route.driver_id !== driver_id) {
      return res.status(403).json({ error: "This route is not assigned to you" });
    }
    if (route.status === "picked_up" || route.status === "in_progress") {
      return res.status(409).json({ error: "Route already picked up", route_code: route.route_code });
    }

    // Update route status
    await db.query(
      `UPDATE routes
       SET status='picked_up', pickup_scanned_at=NOW(),
           pickup_scan_lat=$1, pickup_scan_lng=$2, updated_at=NOW()
       WHERE id=$3`,
      [lat || null, lng || null, route.id]
    );

    // Update all stops to 'picked_up'
    await db.query(
      "UPDATE stops SET status='picked_up', updated_at=NOW() WHERE route_id=$1",
      [route.id]
    );

    // Update driver status
    await db.query(
      "UPDATE drivers SET status='on_route', last_seen=NOW() WHERE id=$1",
      [driver_id]
    );

    // Fetch stops and notify all customers
    const { rows: stops } = await db.query(
      "SELECT * FROM stops WHERE route_id=$1 ORDER BY stop_number",
      [route.id]
    );
    for (const stop of stops) {
      smsService.sendPickedUp(stop, req.user.name).catch(console.error);
    }

    // Fetch merchant store name
    const { rows: [merchant] } = await db.query("SELECT name FROM merchants WHERE id=$1", [route.merchant_id]);

    res.json({
      success: true,
      message: "Pickup confirmed",
      route_code: route.route_code,
      merchant: merchant?.name,
      total_stops: stops.length,
      stops: stops.map(s => ({
        stop_number: s.stop_number,
        customer_name: s.customer_name,
        address: s.delivery_address,
        status: "picked_up",
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /scan/delivery  — Driver scans QR at customer door ──
// Body: { qr_code, token, stop_id?, lat, lng }
exports.scanDelivery = async (req, res) => {
  const { qr_code, token, lat, lng } = req.body;
  const driver_id = req.user.id;

  if (!qr_code || !token) return res.status(400).json({ error: "qr_code and token required" });

  try {
    // Find stop by QR code
    const { rows: [stop] } = await db.query(
      `SELECT s.*, r.driver_id, r.route_code, r.id AS route_id
       FROM stops s JOIN routes r ON r.id = s.route_id
       WHERE s.qr_code = $1`,
      [qr_code.trim()]
    );
    if (!stop) return res.status(404).json({ error: "QR code not found" });

    // Verify driver
    if (stop.driver_id !== driver_id) {
      return res.status(403).json({ error: "This stop is not assigned to you" });
    }
    if (stop.status === "delivered") {
      return res.status(409).json({ error: "Stop already delivered" });
    }

    // Verify HMAC
    const valid = verifyQRScan(qr_code, token, stop.qr_hmac);
    if (!valid) {
      return res.status(400).json({ error: "Invalid QR code — verification failed" });
    }

    // Update stop — driver is at the door, now needs to submit proof
    await db.query(
      `UPDATE stops SET status='out_for_delivery', updated_at=NOW() WHERE id=$1`,
      [stop.id]
    );

    res.json({
      success: true,
      message: "QR verified — submit proof of delivery",
      stop: {
        id: stop.id,
        stop_number: stop.stop_number,
        customer_name: stop.customer_name,
        address: stop.delivery_address,
        otp_code: stop.otp_code,
        instructions: stop.instructions,
      },
      route_code: stop.route_code,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /scan/confirm-delivery  — Submit proof, mark delivered
// Body: { stop_id, proof_method, proof_data?, otp? }
exports.confirmDelivery = async (req, res) => {
  const { stop_id, proof_method, proof_data, otp, lat, lng } = req.body;
  const driver_id = req.user.id;

  if (!stop_id || !proof_method) return res.status(400).json({ error: "stop_id and proof_method required" });

  const VALID_METHODS = ["qr_scan", "barcode", "otp", "signature", "photo"];
  if (!VALID_METHODS.includes(proof_method)) {
    return res.status(400).json({ error: `proof_method must be one of: ${VALID_METHODS.join(", ")}` });
  }

  try {
    const { rows: [stop] } = await db.query(
      `SELECT s.*, r.driver_id, r.route_code, r.id AS route_id, r.merchant_id
       FROM stops s JOIN routes r ON r.id = s.route_id
       WHERE s.id = $1`,
      [stop_id]
    );
    if (!stop) return res.status(404).json({ error: "Stop not found" });
    if (stop.driver_id !== driver_id) return res.status(403).json({ error: "Not authorized" });
    if (stop.status === "delivered") return res.status(409).json({ error: "Already delivered" });

    // Verify OTP if that method was chosen
    if (proof_method === "otp") {
      if (!otp || otp.toString() !== stop.otp_code) {
        return res.status(400).json({ error: "Invalid OTP code" });
      }
    }

    // Mark stop delivered
    await db.query(
      `UPDATE stops
       SET status='delivered', proof_method=$1, proof_data=$2,
           otp_verified=$3, delivered_at=NOW(),
           delivery_lat=$4, delivery_lng=$5, updated_at=NOW()
       WHERE id=$6`,
      [proof_method, proof_data || null, proof_method === "otp", lat || null, lng || null, stop.id]
    );

    // SMS: delivery confirmed
    smsService.sendDelivered(stop, req.user.name).catch(console.error);

    // Check if entire route is now complete
    const pending = await db.query(
      "SELECT COUNT(*) FROM stops WHERE route_id=$1 AND status != 'delivered'",
      [stop.route_id]
    );
    const allDone = parseInt(pending.rows[0].count) === 0;

    if (allDone) {
      await db.query(
        "UPDATE routes SET status='completed', completed_at=NOW(), updated_at=NOW() WHERE id=$1",
        [stop.route_id]
      );
      await db.query(
        "UPDATE drivers SET status='available', last_seen=NOW() WHERE id=$1",
        [driver_id]
      );
    }

    res.json({
      success: true,
      message: "Delivery confirmed",
      stop_number: stop.stop_number,
      route_code: stop.route_code,
      route_completed: allDone,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
