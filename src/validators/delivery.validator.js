const {body,validationResult}=require('express-validator');
const handle=(req,res,next)=>{ const e=validationResult(req); if(!e.isEmpty()) return res.status(400).json({errors:e.array()}); next(); };
const createDelivery=[body('pickup_address').notEmpty(),body('stops').isArray({min:1,max:8}),body('stops.*.customer_name').notEmpty(),body('stops.*.customer_phone').notEmpty(),body('stops.*.address').notEmpty(),handle];
module.exports={createDelivery,handle};
