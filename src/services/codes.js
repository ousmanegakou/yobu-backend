const crypto=require('crypto');
const {nanoid}=require('nanoid');
const {HMAC_SECRET}=require('../config/env');
const generatePickupBarcode=()=>Array.from({length:13},()=>Math.floor(Math.random()*10)).join('');
const generateTrackingId=()=>'TRK-'+nanoid(8).toUpperCase();
const generateQRPayload=tid=>{ const sig=crypto.createHmac('sha256',HMAC_SECRET).update(tid).digest('hex').slice(0,16); return {tracking_id:tid,sig}; };
const verifyQRSignature=(tid,sig)=>{ const exp=crypto.createHmac('sha256',HMAC_SECRET).update(tid).digest('hex').slice(0,16); try{return crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(exp));}catch{return false;} };
const generateOTP=()=>String(Math.floor(1000+Math.random()*9000));
module.exports={generatePickupBarcode,generateTrackingId,generateQRPayload,verifyQRSignature,generateOTP};
