const {sendSMS}=require('../config/twilio');
const {APP_URL}=require('../config/env');
module.exports={
  routeCreated: async d=>console.log(`[SMS] Route created: ${d.id}`),
  driverAssigned: async (d,dr)=>console.log(`[SMS] Driver ${dr.name} assigned to ${d.id}`),
  pickupConfirmed: async d=>console.log(`[SMS] Pickup confirmed: ${d.id}`),
  driverEnRoute: async (s,eta)=>{ if(s.customer_phone) await sendSMS(s.customer_phone,`YOBU: Your delivery is ${eta} min away! Track: ${APP_URL}/track/${s.tracking_id}`); },
  delivered: async s=>{ if(s.customer_phone) await sendSMS(s.customer_phone,'YOBU: Your package has been delivered!'); },
  sendOTP: async s=>{ if(s.customer_phone) await sendSMS(s.customer_phone,`YOBU: Your delivery code is ${s.otp}`); },
};
