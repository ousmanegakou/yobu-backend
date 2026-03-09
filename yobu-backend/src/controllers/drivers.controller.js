const db = require("../db");
const smsService = require("../services/sms");

// ─── GET /drivers  — List all drivers (admin) ────────────────
exports.listDrivers = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT d.id, d.name, d.email, d.phone, d.vehicle, d.plate,
              d.status, d.lat, d.lng, d.last_seen,
              r.route_code AS active_route
       FROM drivers d
       LEFT JOIN routes r ON r.driver_id = d.id AND r.status IN ('assigned','picked_up','in_progress')
       ORDER BY d.name`
    );
    res.json({ drivers: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /drivers/available  — Available drivers ──────────────
exports.availableDrivers = async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, name, phone, vehicle, plate, lat, lng FROM drivers WHERE status='available' AND is_active=true ORDER BY name"
    );
    res.json({ drivers: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /drivers/my-routes  — Routes assigned to driver ──────
exports.myRoutes = async (req, res) => {
  const driver_id = req.user.id;
  try {
    const { rows } = await db.query(
      `SELECT r.*, m.name AS merchant_name, m.address AS store_address,
              (SELECT COUNT(*) FROM stops s WHERE s.route_id=r.id) AS total_stops,
              (SELECT COUNT(*) FROM stops s WHERE s.route_id=r.id AND s.status='delivered') AS delivered_stops
       FROM routes r
       JOIN merchants m ON m.id = r.merchant_id
       WHERE r.driver_id=$1 AND r.status NOT IN ('completed','cancelled')
       ORDER BY r.created_at DESC`,
      [driver_id]
    );
    res.json({ routes: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /drivers/my-routes/:id/stops  — Stops for active route
exports.routeStops = async (req, res) => {
  const driver_id = req.user.id;
  try {
    const { rows: [route] } = await db.query(
      "SELECT * FROM routes WHERE id=$1 AND driver_id=$2",
      [req.params.id, driver_id]
    );
    if (!route) return res.status(404).json({ error: "Route not found or not assigned to you" });

    const { rows: stops } = await db.query(
      "SELECT * FROM stops WHERE route_id=$1 ORDER BY stop_number",
      [route.id]
    );
    res.json({ route, stops });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /drivers/location  — Update driver GPS position ─────
exports.updateLocation = async (req, res) => {
  const { lat, lng, route_id } = req.body;
  const driver_id = req.user.id;

  if (!lat || !lng) return res.status(400).json({ error: "lat and lng required" });

  try {
    // Update driver current position
    await db.query(
      "UPDATE drivers SET lat=$1, lng=$2, last_seen=NOW() WHERE id=$3",
      [lat, lng, driver_id]
    );

    // Log to tracking history
    await db.query(
      "INSERT INTO driver_locations (driver_id, route_id, lat, lng) VALUES ($1,$2,$3,$4)",
      [driver_id, route_id || null, lat, lng]
    );

    // Broadcast to WebSocket clients tracking this driver
    if (req.app.locals.wss) {
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.driverSubscription === driver_id) {
          client.send(JSON.stringify({ type: "driver_location", driver_id, lat, lng, ts: new Date() }));
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /drivers/:id/location  — Get driver live position ────
exports.getLocation = async (req, res) => {
  try {
    const { rows: [driver] } = await db.query(
      "SELECT id, name, lat, lng, last_seen, status FROM drivers WHERE id=$1",
      [req.params.id]
    );
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /drivers/notify-stop  — Notify next customer (ETA) ─
exports.notifyNextStop = async (req, res) => {
  const { stop_id, eta_minutes } = req.body;
  const driver_id = req.user.id;

  try {
    const { rows: [stop] } = await db.query(
      "SELECT s.*, r.driver_id FROM stops s JOIN routes r ON r.id=s.route_id WHERE s.id=$1",
      [stop_id]
    );
    if (!stop) return res.status(404).json({ error: "Stop not found" });
    if (stop.driver_id !== driver_id) return res.status(403).json({ error: "Not authorized" });

    await smsService.sendOnTheWay(stop, req.user.name, eta_minutes || "soon");
    res.json({ success: true, message: "Customer notified" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /drivers/earnings  — Driver earnings summary ─────────
exports.earnings = async (req, res) => {
  const driver_id = req.user.id;
  const PRICE = { base: parseFloat(process.env.PRICE_BASE||5), perStop: parseFloat(process.env.PRICE_PER_STOP||3), perMile: parseFloat(process.env.PRICE_PER_MILE||1) };

  try {
    const { rows } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='completed') AS total_routes,
         COALESCE(SUM(CASE WHEN status='completed' THEN distance_miles ELSE 0 END),0) AS total_miles,
         COUNT(*) FILTER (WHERE status='completed' AND created_at >= date_trunc('month', NOW())) AS routes_this_month
       FROM routes WHERE driver_id=$1`,
      [driver_id]
    );
    const stops = await db.query(
      `SELECT COUNT(*) FROM stops s
       JOIN routes r ON r.id=s.route_id
       WHERE r.driver_id=$1 AND s.status='delivered'`,
      [driver_id]
    );
    const stopsCount = parseInt(stops.rows[0].count);
    const r = rows[0];
    const totalMiles = parseFloat(r.total_miles);
    const totalRoutes = parseInt(r.total_routes);
    const earnings = parseFloat((totalRoutes * PRICE.base + stopsCount * PRICE.perStop + totalMiles * PRICE.perMile).toFixed(2));

    res.json({
      total_routes: totalRoutes,
      total_stops: stopsCount,
      total_miles: totalMiles,
      total_earnings: earnings,
      routes_this_month: parseInt(r.routes_this_month),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
