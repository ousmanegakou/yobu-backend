const { body, validationResult } = require('express-validator');
const validate = (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); next(); };
const loginRules = [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6 })];
const registerMerchantRules = [body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 }), body('phone').optional().isMobilePhone()];
const registerDriverRules = [body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 }), body('phone').isMobilePhone(), body('vehicle_type').isIn(['car', 'bike', 'scooter', 'van'])];
module.exports = { validate, loginRules, registerMerchantRules, registerDriverRules };