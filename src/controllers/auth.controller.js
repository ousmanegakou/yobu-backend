const bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),db=require('../config/db');
const {JWT_SECRET,JWT_EXPIRES}=require('../config/env');
const {asyncHandler,sanitizeUser}=require('../utils/helpers');
const sign=u=>jwt.sign({id:u.id,role:u.role},JWT_SECRET,{expiresIn:JWT_EXPIRES});
exports.register=asyncHandler(async(req,res)=>{
  const {name,email,password,phone,address}=req.body;
  const hash=await bcrypt.hash(password,10);
  const {rows}=await db.query('INSERT INTO merchants(name,email,password_hash,phone,address)VALUES($1,$2,$3,$4,$5)RETURNING *',[name,email,hash,phone,address]);
  const u={...rows[0],role:'merchant'};
  res.status(201).json({user:sanitizeUser(u),token:sign(u)});
});
exports.login=asyncHandler(async(req,res)=>{
  const {email,password}=req.body;
  let user=null;
  for(const [t,r] of [['merchants','merchant'],['drivers','driver'],['admins','admin']]){
    const {rows}=await db.query(`SELECT * FROM ${t} WHERE email=$1`,[email]);
    if(rows.length&&await bcrypt.compare(password,rows[0].password_hash)){user={...rows[0],role:r};break;}
  }
  if(!user) return res.status(401).json({error:'Invalid credentials'});
  res.json({user:sanitizeUser(user),token:sign(user)});
});
exports.me=asyncHandler(async(req,res)=>{
  const m={merchant:'merchants',driver:'drivers',admin:'admins'};
  const {rows}=await db.query(`SELECT * FROM ${m[req.user.role]} WHERE id=$1`,[req.user.id]);
  if(!rows.length) return res.status(404).json({error:'Not found'});
  res.json(sanitizeUser({...rows[0],role:req.user.role}));
});
