const r=require('express').Router();
const {register,login,me}=require('../controllers/auth.controller');
const {registerMerchant,loginRules}=require('../validators/auth.validator');
const {authenticate}=require('../middleware/auth');
r.post('/register',registerMerchant,register);
r.post('/login',loginRules,login);
r.get('/me',authenticate(),me);
module.exports=r;
