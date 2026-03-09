const crypto = require('crypto');
const { nanoid } = require('nanoid');
const HMAC_SECRET = process.env.HMAC_SECRET || 'yobu-hmac-secret';
const CodesService = {
  generatePickupBarcode: (deliveryId) => 'YOBU-PKP-' + deliveryId.substring(0, 8).toUpperCase(),
  generateQRPayload: (trackingId) => {
    const sig = crypto.createHmac('sha256', HMAC_SECRET).update(trackingId).digest('hex').substring(0, 8);
    return 'https://app.yobu.com/verify/' + trackingId + '?sig=' + sig;
  },
  generateOTP: () => Math.floor(1000 + Math.random() * 9000).toString(),
  generateTrackingId: () => nanoid(12),
  verifyQRSignature: (trackingId, sig) => {
    const expected = crypto.createHmac('sha256', HMAC_SECRET).update(trackingId).digest('hex').substring(0, 8);
    return expected === sig;
  },
};
module.exports = CodesService;