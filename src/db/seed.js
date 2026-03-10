require('../config/env');
const bcrypt=require('bcryptjs'),db=require('../config/db');
(async()=>{
  console.log('Seeding...');
  const hash=await bcrypt.hash('password123',10);
  await db.query('INSERT INTO merchants(name,email,password_hash,phone,address)VALUES($1,$2,$3,$4,$5)ON CONFLICT(email)DO NOTHING',['Cafe Bloom','merchant@yobu.com',hash,'+15145550001','142 Rue Saint-Denis']);
  await db.query('INSERT INTO drivers(name,email,password_hash,phone)VALUES($1,$2,$3,$4)ON CONFLICT(email)DO NOTHING',['Marcus T.','driver@yobu.com',hash,'+15145550002']);
  await db.query('INSERT INTO admins(name,email,password_hash)VALUES($1,$2,$3)ON CONFLICT(email)DO NOTHING',['Admin','admin@yobu.com',hash]);
  console.log('Seed complete: merchant@yobu.com / driver@yobu.com / admin@yobu.com — password: password123');
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
