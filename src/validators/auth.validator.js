const {body,validationResult}=require('express-validator');
const handle=(req,res,next)=>{ const e=validationResult(req); if (!e.isEmpty()) return res.status(400).json({errors:e.array()}); next(); };
const registerMerchant=[body('name').notEmpty(),body('email').isEmail(),body('password').isLength({min:6}),body('phone').notEmpty(),handle];
const loginRules=[body('email').isEmail(),body('password').notEmpty(),handle];
module.exports={registerMerchant,loginRules,handle};
