const db=require('../config/db');
const DeliveryService={
  findById: id=>db.query('SELECT * FROM deliveries WHERE id=$1',[id]),
  findStops: did=>db.query('SELECT * FROM delivery_stops WHERE delivery_id=$1 ORDER BY stop_order',[did]),
  updateStatus: (id,status)=>db.query('UPDATE deliveries SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',[status,id]),
};
module.exports=DeliveryService;
