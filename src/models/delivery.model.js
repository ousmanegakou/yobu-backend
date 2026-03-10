const db=require('../config/db');
module.exports={ findById:id=>db.query('SELECT * FROM deliveries WHERE id=$1',[id]), findByMerchant:mid=>db.query('SELECT * FROM deliveries WHERE merchant_id=$1 ORDER BY created_at DESC',[mid]), updateStatus:(id,s)=>db.query('UPDATE deliveries SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',[s,id]) };
