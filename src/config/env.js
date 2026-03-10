require('dotenv').config();
['DATABASE_URL','JWT_SECRET'].forEach(k => { if (!process.env[k]) throw new Error('Missing: '+k); });
module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '7d',
  TWILIO_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_FROM: process.env.TWILIO_PHONE_NUMBER,
  APP_URL: process.env.APP_URL || 'https://app.yobu.com',
  HMAC_SECRET: process.env.HMAC_SECRET || 'dev-hmac-secret',
};
