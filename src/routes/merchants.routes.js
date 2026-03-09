const router = require('express').Router();
const MerchantsController = require('../controllers/merchants.controller');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
router.get('/',          auth(['admin']),    asyncHandler(MerchantsController.list));
router.get('/stats',     auth(['merchant']), asyncHandler(MerchantsController.getStats));
router.get('/:id',       auth(['admin']),    asyncHandler(MerchantsController.getOne));
router.get('/:id/stats', auth(['admin']),    asyncHandler(MerchantsController.getStats));
module.exports = router;