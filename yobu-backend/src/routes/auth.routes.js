const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");

router.post("/merchant/register", ctrl.merchantRegister);
router.post("/merchant/login",    ctrl.merchantLogin);
router.post("/driver/register",   ctrl.driverRegister);
router.post("/driver/login",      ctrl.driverLogin);
router.post("/admin/login",       ctrl.adminLogin);
router.get("/me", authenticate(["merchant","driver","admin"]), ctrl.getMe);

module.exports = router;
