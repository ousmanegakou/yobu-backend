const r=require('express').Router();
const ctrl=require('../controllers/tracking.controller');
r.get('/:tracking_id',ctrl.getByTrackingId);
module.exports=r;
