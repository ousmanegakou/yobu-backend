require('../config/env');
const fs=require('fs'),path=require('path'),db=require('../config/db');
(async()=>{ console.log('Running migrations...'); const sql=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'); await db.query(sql); console.log('Migrations complete'); process.exit(0); })().catch(e=>{console.error(e);process.exit(1);});
