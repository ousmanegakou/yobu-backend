const twilio = require("twilio");

let client;
function getClient() {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

const FROM = () => process.env.TWILIO_PHONE_NUMBER;
const APP  = () => process.env.APP_URL || "https://app.yobu.com";

async function send(to, body) {
  // In dev mode: just log to console
  if (process.env.NODE_ENV !== "production") {
    console.log(`[SMS → ${to}]: ${body}`);
    return { sid: "dev-mode", status: "logged" };
  }
  const msg = await getClient().messages.create({ from: FROM(), to, body });
  return { sid: msg.sid, status: msg.status };
}

// ── 1. Route created — sent to each customer ─────────────────
async function sendRouteCreated(stop, merchantName) {
  const url = `${APP()}/track/${stop.tracking_token}`;
  const body = `Your order from ${merchantName} is on the way!\nTrack your delivery: ${url}`;
  return send(stop.customer_phone, body);
}

// ── 2. Driver assigned ────────────────────────────────────────
async function sendDriverAssigned(stop, driverName) {
  const body = `${driverName} has been assigned to deliver your order. We'll notify you when it's picked up.`;
  return send(stop.customer_phone, body);
}

// ── 3. Package picked up from store ──────────────────────────
async function sendPickedUp(stop, driverName) {
  const url = `${APP()}/track/${stop.tracking_token}`;
  const body = `Your package has been picked up by ${driverName}! Track live: ${url}`;
  return send(stop.customer_phone, body);
}

// ── 4. Driver on the way to this stop ────────────────────────
async function sendOnTheWay(stop, driverName, etaMinutes) {
  const url = `${APP()}/track/${stop.tracking_token}`;
  const body = `${driverName} is on the way! ETA: ${etaMinutes} min.\nTrack live: ${url}`;
  return send(stop.customer_phone, body);
}

// ── 5. Package delivered ─────────────────────────────────────
async function sendDelivered(stop, driverName) {
  const body = `Your package has been delivered! Thank you for using YOBU. 🎉`;
  return send(stop.customer_phone, body);
}

// ── 6. OTP reminder (if customer requests it) ─────────────────
async function sendOTP(stop) {
  const body = `Your YOBU delivery OTP code: ${stop.otp_code}\nShare this with the driver to confirm delivery.`;
  return send(stop.customer_phone, body);
}

module.exports = {
  sendRouteCreated,
  sendDriverAssigned,
  sendPickedUp,
  sendOnTheWay,
  sendDelivered,
  sendOTP,
};
