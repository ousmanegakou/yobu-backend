const { body, validationResult } = require('express-validator');
const validate = (req, res, next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); next(); };
const createDeliveryRules = [
  body('pickup_address').trim().notEmpty(),
  body('stops').isArray({ min: 1, max: 8 }),
  body('stops.*.customer_name').trim().notEmpty(),
  body('stops.*.customer_phone').isMobilePhone(),
  body('stops.*.address').trim().notEmpty(),
  body('total_miles').optional().isFloat({ min: 0 }),
];
const assignDriverRules = [body('driver_id').isUUID()];
module.exports = { validate, createDeliveryRules, assignDriverRules };