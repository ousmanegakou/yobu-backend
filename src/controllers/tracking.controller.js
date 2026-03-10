const db=require('../config/db');
const {asyncHandler}=require('../utils/helpers');
exports.getByTrackingId=asyncHandler(async(req,res)=>{
  const {rows}=await db.query('SELECT s.tracking_id,s.status,s.customer_name,s.address,s.stop_order,s.delivered_at,d.id as delivery_id,d.status as delivery_status,d.pickup_address,dr.name as driver_name,dr.last_lat,dr.last_lng FROM delivery_stops s JOIN deliveries d ON d.id=s.delivery_id LEFT JOIN drivers dr ON dr.id=d.driver_id WHERE s.tracking_id=$1',[req.params.tracking_id]);
  if(!rows.length) return res.status(404).json({error:'Not found'});
  res.json(rows[0]);
});
