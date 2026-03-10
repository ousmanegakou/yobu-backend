const db=require('../config/db');
const {asyncHandler}=require('../utils/helpers');
const {verifyQRSignature}=require('../services/codes');
const SMS=require('../services/sms');
exports.scanPickup=asyncHandler(async(req,res)=>{
  const {barcode}=req.body;
  const {rows}=await db.query('SELECT * FROM deliveries WHERE id=$1',[req.params.id]);
  if(!rows.length) return res.status(404).json({error:'Not found'});
  if(rows[0].pickup_barcode!==barcode) return res.status(400).json({error:'Invalid barcode'});
  await db.query('UPDATE deliveries SET status=$1,updated_at=NOW() WHERE id=$2',['en_route',req.params.id]);
  await SMS.pickupConfirmed(rows[0]);
  res.json({ok:true});
});
exports.confirmDelivery=asyncHandler(async(req,res)=>{
  const {otp,qr_sig}=req.body;
  const {rows}=await db.query('SELECT * FROM delivery_stops WHERE id=$1 AND delivery_id=$2',[req.params.stopId,req.params.id]);
  if(!rows.length) return res.status(404).json({error:'Stop not found'});
  const stop=rows[0];
  if(stop.status==='delivered') return res.status(400).json({error:'Already delivered'});
  if(!(otp&&otp===stop.otp)&&!(qr_sig&&verifyQRSignature(stop.tracking_id,qr_sig))) return res.status(400).json({error:'Invalid code'});
  const {rows:[updated]}=await db.query('UPDATE delivery_stops SET status=$1,delivered_at=NOW() WHERE id=$2 RETURNING *',['delivered',stop.id]);
  await SMS.delivered(stop);
  const {rows:rem}=await db.query('SELECT id FROM delivery_stops WHERE delivery_id=$1 AND status!=$2',[req.params.id,'delivered']);
  if(!rem.length) await db.query('UPDATE deliveries SET status=$1,updated_at=NOW() WHERE id=$2',['delivered',req.params.id]);
  res.json({ok:true,stop:updated});
});
