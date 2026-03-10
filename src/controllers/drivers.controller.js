const bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),db=require('../config/db');
const {JWT_SECRET,JWT_EXPIRES}=require('../config/env');
const {asyncHandler,sanitizeUser}=require('../utils/helpers');
const sign=d=>jwt.sign({id:d.id,role:'driver'},JWT_SECRET,{expiresIn:JWT_EXPIRES});
exports.register=asyncHandler(async(req,res)=>{
  const {name,email,password,phone}=req.body;
  const hash=await bcrypt.hash(password,10);
  const {rows}=await db.query('INSERT INTO drivers(name,email,password_hash,phone)VALUES($1,$2,$3,$4)RETURNING *',[name,email,hash,phone]);
  res.status(201).json({user:sanitizeUser(rows[0]),token:sign(rows[0])});
});
exports.login=asyncHandler(async(req,res)=>{
  const {email,password}=req.body;
  const {rows}=await db.query('SELECT * FROM drivers WHERE email=$1',[email]);
  if(!rows.length||!await bcrypt.compare(password,rows[0].password_hash)) return res.status(401).json({error:'Invalid credentials'});
  res.json({user:sanitizeUser(rows[0]),token:sign(rows[0])});
});
exports.me=asyncHandler(async(req,res)=>{ const {rows}=await db.query('SELECT * FROM drivers WHERE id=$1',[req.user.id]); res.json(sanitizeUser(rows[0])); });
exports.updateLocation=asyncHandler(async(req,res)=>{ const {lat,lng}=req.body; await db.query('UPDATE drivers SET last_lat=$1,last_lng=$2,updated_at=NOW() WHERE id=$3',[lat,lng,req.user.id]); req.app.locals.broadcast?.(req.user.id,{lat,lng}); res.json({ok:true}); });
exports.listAvailable=asyncHandler(async(req,res)=>{ const {rows}=await db.query('SELECT id,name,phone,last_lat,last_lng FROM drivers WHERE is_active=true'); res.json(rows); });
exports.getById=asyncHandler(async(req,res)=>{ const {rows}=await db.query('SELECT id,name,phone,last_lat,last_lng,is_active FROM drivers WHERE id=$1',[req.params.id]); if(!rows.length) return res.status(404).json({error:'Not found'}); res.json(rows[0]); });
