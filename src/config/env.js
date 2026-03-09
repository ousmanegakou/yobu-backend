require('dotenv').config();
const required = ['DATABASE_URL', 'JWT_SECRET'];
required.forEach(key => { if (!process.env[key]) throw new Error('Missing env: ' + key); });
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
};