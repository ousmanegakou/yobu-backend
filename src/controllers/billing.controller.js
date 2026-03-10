const db=require('../config/db');
const {asyncHandler,getMonthRange}=require('../utils/helpers');
const {calculateInvoice}=require('../services/pricing');
exports.listInvoices=asyncHandler(async(req,res)=>{ const {rows}=await db.query('SELECT * FROM invoices WHERE merchant_id=$1 ORDER BY created_at DESC',[req.user.id]); res.json(rows); });
exports.getInvoice=asyncHandler(async(req,res)=>{ const {rows}=await db.query('SELECT * FROM invoices WHERE id=$1 AND merchant_id=$2',[req.params.id,req.user.id]); if(!rows.length) return res.status(404).json({error:'Not found'}); res.json(rows[0]); });
exports.generateInvoice=asyncHandler(async(req,res)=>{
  const {merchant_id,year,month}=req.body;
  const {period_start,period_end}=getMonthRange(year,month);
  const {rows:ds}=await db.query('SELECT * FROM deliveries WHERE merchant_id=$1 AND status=$2 AND created_at BETWEEN $3 AND $4',[merchant_id,'delivered',period_start,period_end]);
  const c=calculateInvoice(ds);
  const {rows:[inv]}=await db.query('INSERT INTO invoices(merchant_id,period_start,period_end,total_routes,total_stops,subtotal,tax,total)VALUES($1,$2,$3,$4,$5,$6,$7,$8)RETURNING *',[merchant_id,period_start,period_end,c.total_routes,c.total_stops,c.subtotal,c.tax,c.total]);
  res.status(201).json(inv);
});
exports.adminListAll=asyncHandler(async(req,res)=>{ const {rows}=await db.query('SELECT i.*,m.name as merchant_name FROM invoices i JOIN merchants m ON m.id=i.merchant_id ORDER BY i.created_at DESC LIMIT 100'); res.json(rows); });
