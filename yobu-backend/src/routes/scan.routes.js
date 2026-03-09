const router = require("express").Router();
const ctrl = require("../controllers/scan.controller");
const { authenticate } = require("../middleware/auth");

router.post("/pickup",           authenticate(["driver"]), ctrl.scanPickup);
router.post("/delivery",         authenticate(["driver"]), ctrl.scanDelivery);
router.post("/confirm-delivery", authenticate(["driver"]), ctrl.confirmDelivery);

module.exports = router;
