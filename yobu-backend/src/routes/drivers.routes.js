const router = require("express").Router();
const ctrl = require("../controllers/drivers.controller");
const { authenticate } = require("../middleware/auth");

router.get("/",                authenticate(["admin"]),          ctrl.listDrivers);
router.get("/available",       authenticate(["admin","merchant"]),ctrl.availableDrivers);
router.get("/my-routes",       authenticate(["driver"]),         ctrl.myRoutes);
router.get("/my-routes/:id/stops", authenticate(["driver"]),     ctrl.routeStops);
router.get("/earnings",        authenticate(["driver"]),         ctrl.earnings);
router.post("/location",       authenticate(["driver"]),         ctrl.updateLocation);
router.get("/:id/location",    authenticate(["admin","merchant","driver"]), ctrl.getLocation);
router.post("/notify-stop",    authenticate(["driver"]),         ctrl.notifyNextStop);

module.exports = router;
