const router = require('express').Router();
const TrackingController = require('../controllers/tracking.controller');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
router.get('/:tracking_id', asyncHandler(TrackingController.getByTrackingId));
router.post('/eta', auth(['driver']), asyncHandler(TrackingController.updateETA));
module.exports = router;