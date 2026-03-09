const db = require("../db");
const { calcRoutePrice } = require("../services/pricing");
const { generateRouteCode, generatePickupBarcode, generateDeliveryQR, generateOTP, generateTrackingToken } = require("../services/codes");
const smsService = require("../services/sms");

// ─── POST /routes  — Create a new multi-stop delivery route ──
exports.createRoute = async (req, res) => {
  const { stops, distance_miles, priority, notes } = req.body;
  const merchant_id = req.user.id;

  if (!stops || !Array.isArray(stops) || stops.length === 0) {
    return res.status(400).json({ error: "At least one stop is required" });
  }

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    // Generate route code (retry if collision)
    let routeCode;
    for (let i = 0; i < 5; i++) {
      routeCode = generateRouteCode();
      const exists = await client.query("SELECT id FROM routes WHERE route_code=$1", [routeCode]);
      if (!exists.rows.length) break;
    }

    const miles = parseFloat(distance_miles) || 0;
    const pricing = calcRoutePrice(stops.length, miles);
    const pickupBarcode = generatePickupBarcode(routeCode);

    // Insert route
    const routeResult = await client.query(
      `INSERT INTO routes
         (route_code, merchant_id, priority, distance_miles,
          price_base, price_stops, price_distance, price_total, pickup_barcode, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [routeCode, merchant_id, priority || "standard", miles,
       pricing.base, pricing.stops, pricing.distance, pricing.total,
       pickupBarcode, notes]
    );
    const route = routeResult.rows[0];

    // Insert stops
    const insertedStops = [];
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      const stopNum = i + 1;
      const { qrCode, token, hmac } = generateDeliveryQR(routeCode, stopNum);
      const otp = generateOTP();
      const trackingToken = generateTrackingToken();

      const stopResult = await client.query(
        `INSERT INTO stops
           (route_id, stop_number, customer_name, customer_phone, delivery_address,
            product_desc, instructions, qr_code, qr_token, qr_hmac, otp_code, tracking_token)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [route.id, stopNum, s.customer_name, s.customer_phone, s.delivery_address,
         s.product_desc, s.instructions, qrCode, token, hmac, otp, trackingToken]
      );
      insertedStops.push(stopResult.rows[0]);
    }

    await client.query("COMMIT");

    // Send SMS to each customer (async, don't block response)
    const merchantRow = await db.query("SELECT name FROM merchants WHERE id=$1", [merchant_id]);
    const merchantName = merchantRow.rows[0]?.name || "YOBU";
    for (const stop of insertedStops) {
      smsService.sendRouteCreated(stop, merchantName).catch(console.error);
    }

    res.status(201).json({
      message: "Route created successfully",
      route: {
        ...route,
        stops: insertedStops.map(s => ({
          ...s,
          tracking_url: `${process.env.APP_URL}/track/${s.tracking_token}`,
        })),
        pricing,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// ─── GET /routes  — List routes for current merchant ─────────
exports.listRoutes = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const merchant_id = req.user.id;

  try {
    let query = `
      SELECT r.*, d.name AS driver_name,
        (SELECT COUNT(*) FROM stops s WHERE s.route_id = r.id) AS total_stops,
        (SELECT COUNT(*) FROM stops s WHERE s.route_id = r.id AND s.status = 'delivered') AS delivered_stops
      FROM routes r
      LEFT JOIN drivers d ON d.id = r.driver_id
      WHERE r.merchant_id = $1`;
    const params = [merchant_id];

    if (status) { params.push(status); query += ` AND r.status = $${params.length}`; }
    query += ` ORDER BY r.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    const total = await db.query("SELECT COUNT(*) FROM routes WHERE merchant_id=$1", [merchant_id]);

    res.json({ routes: rows, total: parseInt(total.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /routes/:id  — Get route with all stops ─────────────
exports.getRoute = async (req, res) => {
  try {
    const { rows: [route] } = await db.query(
      `SELECT r.*, d.name AS driver_name, d.phone AS driver_phone, d.lat AS driver_lat, d.lng AS driver_lng
       FROM routes r LEFT JOIN drivers d ON d.id = r.driver_id
       WHERE r.id = $1 AND (r.merchant_id = $2 OR $3 = 'admin')`,
      [req.params.id, req.user.id, req.user.role]
    );
    if (!route) return res.status(404).json({ error: "Route not found" });

    const { rows: stops } = await db.query(
      "SELECT * FROM stops WHERE route_id=$1 ORDER BY stop_number",
      [route.id]
    );

    res.json({
      ...route,
      stops: stops.map(s => ({
        ...s,
        tracking_url: `${process.env.APP_URL}/track/${s.tracking_token}`,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── PATCH /routes/:id/assign  — Assign driver to route ──────
exports.assignDriver = async (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) return res.status(400).json({ error: "driver_id required" });

  try {
    const { rows: [route] } = await db.query(
      `UPDATE routes SET driver_id=$1, status='assigned', updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [driver_id, req.params.id]
    );
    if (!route) return res.status(404).json({ error: "Route not found" });

    // Update all stops to 'assigned'
    await db.query("UPDATE stops SET status='assigned' WHERE route_id=$1", [route.id]);

    // Notify driver (optional push notification hook here)
    res.json({ message: "Driver assigned", route });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /routes/public/:token  — Public tracking (no auth) ──
exports.publicTrack = async (req, res) => {
  try {
    const { rows: [stop] } = await db.query(
      "SELECT * FROM stops WHERE tracking_token=$1",
      [req.params.token]
    );
    if (!stop) return res.status(404).json({ error: "Tracking link not found" });

    const { rows: [route] } = await db.query(
      `SELECT r.route_code, r.status AS route_status, r.priority,
              d.name AS driver_name, d.phone AS driver_phone,
              d.lat AS driver_lat, d.lng AS driver_lng,
              m.name AS merchant_name
       FROM routes r
       LEFT JOIN drivers  d ON d.id = r.driver_id
       LEFT JOIN merchants m ON m.id = r.merchant_id
       WHERE r.id = $1`,
      [stop.route_id]
    );

    const totalStops = await db.query("SELECT COUNT(*) FROM stops WHERE route_id=$1", [stop.route_id]);
    const deliveredStops = await db.query("SELECT COUNT(*) FROM stops WHERE route_id=$1 AND status='delivered'", [stop.route_id]);

    res.json({
      stop: {
        stop_number: stop.stop_number,
        customer_name: stop.customer_name,
        delivery_address: stop.delivery_address,
        product_desc: stop.product_desc,
        instructions: stop.instructions,
        status: stop.status,
        otp_code: stop.status !== "delivered" ? stop.otp_code : null,
        delivered_at: stop.delivered_at,
      },
      route: {
        ...route,
        total_stops: parseInt(totalStops.rows[0].count),
        delivered_stops: parseInt(deliveredStops.rows[0].count),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
