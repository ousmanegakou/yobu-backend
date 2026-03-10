const db=require('../config/db');
const {asyncHandler,getPagination}=require('../utils/helpers');
const {calculatePrice}=require('../services/pricing');
const {generatePickupBarcode,generateTrackingId,generateOTP}=require('../services/codes');
const SMS=require('../services/sms');
exports.create=asyncHandler(async(req,res)=>{
  const {pickup_address,stops,notes}=req.body;
  const client=await db.getClient();
  try{
    await client.query('BEGIN');
    const price=calculatePrice({stops:stops.length});
    const barcode=generatePickupBarcode();
    const {rows:[delivery]}=await client.query('INSERT INTO deliveries(merchant_id,pickup_address,total_stops,price,pickup_barcode,notes)VALUES($1,$2,$3,$4,$5,$6)RETURNING *',[req.user.id,pickup_address,stops.length,price.total,barcode,notes]);
    const createdStops=[];
    for(let i=0;i<stops.length;i++){
      const s=stops[i],tracking=generateTrackingId(),otp=generateOTP();
      const {rows:[stop]}=await client.query('INSERT INTO delivery_stops(delivery_id,stop_order,customer_name,customer_phone,address,tracking_id,otp)VALUES($1,$2,$3,$4,$5,$6,$7)RETURNING *',[delivery.id,i+1,s.customer_name,s.customer_phone,s.address,tracking,otp]);
      createdStops.push(stop);
    }
    await client.query('COMMIT');
    for(const s of createdStops) await SMS.sendOTP(s);
    res.status(201).json({...delivery,stops:createdStops});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
});
exports.list=asyncHandler(async(req,res)=>{
  const {limit,offset}=getPagination(req.query);
  const w=req.user.role==='merchant'?`WHERE d.merchant_id='${req.user.id}'`:'';
  const {rows}=await db.query(`SELECT d.*,m.name as merchant_name FROM deliveries d JOIN merchants m ON m.id=d.merchant_id ${w} ORDER BY d.created_at DESC LIMIT $1 OFFSET $2`,[limit,offset]);
  res.json(rows);
});
exports.get=asyncHandler(async(req,res)=>{
  const {rows}=await db.query('SELECT * FROM deliveries WHERE id=$1',[req.params.id]);
  if(!rows.length) return res.status(404).json({error:'Not found'});
  const {rows:stops}=await db.query('SELECT * FROM delivery_stops WHERE delivery_id=$1 ORDER BY stop_order',[req.params.id]);
  res.json({...rows[0],stops});
});
exports.assignDriver=asyncHandler(async(req,res)=>{
  const {driver_id}=req.body;
  const {rows}=await db.query('UPDATE deliveries SET driver_id=$1,status=$2,updated_at=NOW() WHERE id=$3 RETURNING *',[driver_id,'assigned',req.params.id]);
  if(!rows.length) return res.status(404).json({error:'Not found'});
  res.json(rows[0]);
});
