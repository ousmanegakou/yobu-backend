const twilio = require('twilio');
const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = require('./env');
let client = null;
if (TWILIO_SID && TWILIO_TOKEN) { client = twilio(TWILIO_SID, TWILIO_TOKEN); } else { console.warn('Twilio not configured - SMS mock mode'); }
const sendSMS = async (to, body) => { if (!client) { console.log(`[SMS MOCK] To:${to} | ${body}`); return {mock:true}; } return client.messages.create({from:TWILIO_FROM,to,body}); };
module.exports = { sendSMS };
