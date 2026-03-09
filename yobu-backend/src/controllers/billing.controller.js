const db = require("../db");
const { calcMonthlyInvoice } = require("../services/pricing");

// ─── POST /billing/generate  — Generate monthly invoices (admin/cron)
exports.generateInvoices = async (req, res) => {
  const { month, year } = req.body;
  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year)  || new Date().getFullYear();

  try {
    const { rows: merchants } = await db.query("SELECT id, name FROM merchants WHERE is_active=true");
    const results = [];

    for (const merchant of merchants) {
      // Aggregate completed routes for this merchant in this period
      const { rows: [agg] } = await db.query(
        `SELECT
           COUNT(*)                               AS total_routes,
           COALESCE(SUM(distance_miles), 0)       AS total_miles
         FROM routes
         WHERE merchant_id=$1
           AND status='completed'
           AND EXTRACT(MONTH FROM completed_at)=$2
           AND EXTRACT(YEAR  FROM completed_at)=$3`,
        [merchant.id, m, y]
      );

      const { rows: [stopsAgg] } = await db.query(
        `SELECT COUNT(*) AS total_stops
         FROM stops s JOIN routes r ON r.id=s.route_id
         WHERE r.merchant_id=$1 AND s.status='delivered'
           AND EXTRACT(MONTH FROM s.delivered_at)=$2
           AND EXTRACT(YEAR  FROM s.delivered_at)=$3`,
        [merchant.id, m, y]
      );

      const totalRoutes = parseInt(agg.total_routes);
      const totalStops  = parseInt(stopsAgg.total_stops);
      const totalMiles  = parseFloat(agg.total_miles);
      const charges = calcMonthlyInvoice(totalRoutes, totalStops, totalMiles);

      // Upsert invoice
      const { rows: [invoice] } = await db.query(
        `INSERT INTO invoices
           (merchant_id, period_month, period_year,
            total_routes, total_stops, total_miles,
            charge_base, charge_stops, charge_distance, total_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (merchant_id, period_month, period_year)
         DO UPDATE SET
           total_routes=$4, total_stops=$5, total_miles=$6,
           charge_base=$7, charge_stops=$8, charge_distance=$9,
           total_amount=$10, issued_at=NOW()
         RETURNING *`,
        [merchant.id, m, y, totalRoutes, totalStops, totalMiles,
         charges.chargeBase, charges.chargeStops, charges.chargeDistance, charges.total]
      );
      results.push({ merchant: merchant.name, invoice });
    }

    res.json({ message: `Invoices generated for ${m}/${y}`, count: results.length, invoices: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /billing/invoices  — All invoices (admin) ───────────
exports.listInvoices = async (req, res) => {
  const { month, year, status } = req.query;
  try {
    let query = `
      SELECT i.*, m.name AS merchant_name, m.category, m.plan
      FROM invoices i JOIN merchants m ON m.id=i.merchant_id
      WHERE 1=1`;
    const params = [];
    if (month) { params.push(month); query += ` AND i.period_month=$${params.length}`; }
    if (year)  { params.push(year);  query += ` AND i.period_year=$${params.length}`; }
    if (status){ params.push(status);query += ` AND i.status=$${params.length}`; }
    query += " ORDER BY i.period_year DESC, i.period_month DESC, m.name";

    const { rows } = await db.query(query, params);
    res.json({ invoices: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /billing/my-invoices  — Merchant's own invoices ──────
exports.myInvoices = async (req, res) => {
  const merchant_id = req.user.id;
  try {
    const { rows } = await db.query(
      "SELECT * FROM invoices WHERE merchant_id=$1 ORDER BY period_year DESC, period_month DESC",
      [merchant_id]
    );
    res.json({ invoices: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /billing/invoices/:id  — Invoice detail ─────────────
exports.getInvoice = async (req, res) => {
  try {
    const { rows: [invoice] } = await db.query(
      `SELECT i.*, m.name AS merchant_name, m.email AS merchant_email, m.category, m.plan
       FROM invoices i JOIN merchants m ON m.id=i.merchant_id
       WHERE i.id=$1`,
      [req.params.id]
    );
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // Get route breakdown for this period
    const { rows: routes } = await db.query(
      `SELECT route_code, status, distance_miles, price_total,
              price_base, price_stops, price_distance, completed_at
       FROM routes
       WHERE merchant_id=$1
         AND EXTRACT(MONTH FROM completed_at)=$2
         AND EXTRACT(YEAR  FROM completed_at)=$3
       ORDER BY completed_at`,
      [invoice.merchant_id, invoice.period_month, invoice.period_year]
    );

    res.json({ invoice, routes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── PATCH /billing/invoices/:id/pay  — Mark invoice as paid ─
exports.markPaid = async (req, res) => {
  try {
    const { rows: [invoice] } = await db.query(
      "UPDATE invoices SET status='paid', paid_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json({ message: "Invoice marked as paid", invoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /billing/summary  — Platform revenue summary (admin) ─
exports.platformSummary = async (req, res) => {
  try {
    const { rows: [revenue] } = await db.query(
      `SELECT
         COALESCE(SUM(total_amount),0)       AS total_revenue,
         COALESCE(SUM(total_routes),0)       AS total_routes,
         COALESCE(SUM(total_stops),0)        AS total_stops,
         COUNT(DISTINCT merchant_id)         AS total_merchants,
         COUNT(*) FILTER (WHERE status='pending') AS pending_invoices
       FROM invoices`
    );
    const { rows: [monthly] } = await db.query(
      `SELECT COALESCE(SUM(total_amount),0) AS this_month
       FROM invoices
       WHERE period_month=EXTRACT(MONTH FROM NOW())
         AND period_year=EXTRACT(YEAR FROM NOW())`
    );
    res.json({ ...revenue, revenue_this_month: monthly.this_month });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
