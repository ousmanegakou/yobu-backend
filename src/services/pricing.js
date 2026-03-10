const BASE=5,STOP=3,MILE=1,TAX=0.05;
const calculatePrice=({stops=1,miles=0})=>{ const sub=BASE+(stops*STOP)+(miles*MILE); const tax=+(sub*TAX).toFixed(2); return {subtotal:+sub.toFixed(2),tax,total:+(sub+tax).toFixed(2)}; };
const calculateInvoice=ds=>{ let routes=ds.length,stops=0,miles=0,sub=0; ds.forEach(d=>{stops+=d.total_stops||0;miles+=+(d.total_miles||0);sub+=+(d.price||0);}); const tax=+(sub*TAX).toFixed(2); return {total_routes:routes,total_stops:stops,total_miles:+miles.toFixed(2),subtotal:+sub.toFixed(2),tax,total:+(sub+tax).toFixed(2)}; };
module.exports={calculatePrice,calculateInvoice};
