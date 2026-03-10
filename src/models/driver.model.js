const db=require('../config/db');
module.exports={ findById:id=>db.query('SELECT * FROM drivers WHERE id=$1',[id]), findAvailable:()=>db.query('SELECT id,name,phone,last_lat,last_lng FROM drivers WHERE is_active=true'), updateLocation:(id,lat,lng)=>db.query('UPDATE drivers SET last_lat=$1,last_lng=$2,updated_at=NOW() WHERE id=$3',[lat,lng,id]) };
