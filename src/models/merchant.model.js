const db=require('../config/db');
module.exports={ findById:id=>db.query('SELECT * FROM merchants WHERE id=$1',[id]), findByEmail:email=>db.query('SELECT * FROM merchants WHERE email=$1',[email]) };
