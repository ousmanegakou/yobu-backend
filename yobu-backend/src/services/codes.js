const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

/**
 * Generate a unique route code: YB-RXXXX
 */
function generateRouteCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `YB-R${num}`;
}

/**
 * Generate pickup barcode string for a route
 */
function generatePickupBarcode(routeCode) {
  return `${routeCode}-PKP`;
}

/**
 * Generate a delivery QR code payload for a stop
 * Returns: { qrCode, token, hmac }
 */
function generateDeliveryQR(routeCode, stopNumber) {
  const token = crypto.randomBytes(16).toString("hex");
  const payload = `${routeCode}-S${stopNumber}-DLV`;
  const hmac = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "yobu_secret")
    .update(`${payload}:${token}`)
    .digest("hex")
    .substring(0, 24);

  return { qrCode: payload, token, hmac };
}

/**
 * Verify a QR scan payload
 */
function verifyQRScan(qrCode, token, storedHmac) {
  const expectedHmac = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "yobu_secret")
    .update(`${qrCode}:${token}`)
    .digest("hex")
    .substring(0, 24);
  return expectedHmac === storedHmac;
}

/**
 * Generate a 4-digit OTP code
 */
function generateOTP() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Generate a unique tracking token for public tracking URLs
 */
function generateTrackingToken() {
  return crypto.randomBytes(8).toString("hex"); // "a8f2k9x1"
}

module.exports = {
  generateRouteCode,
  generatePickupBarcode,
  generateDeliveryQR,
  verifyQRScan,
  generateOTP,
  generateTrackingToken,
};
