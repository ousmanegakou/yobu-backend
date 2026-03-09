require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const rateLimit = require("express-rate-limit");
const { WebSocketServer } = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);

// ─── WebSocket Server (live driver tracking) ─────────────────
const wss = new WebSocketServer({ server });
app.locals.wss = wss;

wss.on("connection", (ws, req) => {
  // Client sends: { type: "subscribe_driver", driver_id: "..." }
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === "subscribe_driver") {
        ws.driverSubscription = msg.driver_id;
      }
    } catch {}
  });
  ws.on("error", () => {});
});

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(express.json({ limit: "10mb" })); // 10mb for proof photos (base64)

// Rate limiting
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Too many requests" } }));
app.use("/api/scan", rateLimit({ windowMs: 1  * 60 * 1000, max: 60 }));
app.use("/api",      rateLimit({ windowMs: 1  * 60 * 1000, max: 300 }));

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/auth",    require("./routes/auth.routes"));
app.use("/api/routes",  require("./routes/routes.routes"));
app.use("/api/scan",    require("./routes/scan.routes"));
app.use("/api/drivers", require("./routes/drivers.routes"));
app.use("/api/billing", require("./routes/billing.routes"));

// ─── Health check ────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "YOBU API", version: "1.0.0", ts: new Date() });
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Endpoint not found" }));

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start server ─────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 YOBU API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
