const {WebSocketServer}=require('ws');
const setupWebSocket=(server,app)=>{
  const wss=new WebSocketServer({server});
  const subs=new Map();
  wss.on('connection',ws=>{
    ws.on('message',raw=>{ try{ const m=JSON.parse(raw); if(m.type==='subscribe_driver'){ if(!subs.has(m.driver_id)) subs.set(m.driver_id,new Set()); subs.get(m.driver_id).add(ws); ws.send(JSON.stringify({type:'subscribed',driver_id:m.driver_id})); } }catch{} });
    ws.on('close',()=>subs.forEach(s=>s.delete(ws)));
  });
  app.locals.broadcast=(driverId,data)=>{ const s=subs.get(driverId); if(!s) return; const msg=JSON.stringify({type:'location',driver_id:driverId,...data}); s.forEach(ws=>{if(ws.readyState===1)ws.send(msg);}); };
};
module.exports={setupWebSocket};
