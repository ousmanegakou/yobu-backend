const router = require("express").Router();
const ctrl = require("../controllers/routes.controller");
const { authenticate } = require("../middleware/auth");

// Public (no auth)
router.get("/public/:token", ctrl.publicTrack);

// Merchant routes
router.post("/",         authenticate(["merchant"]),         ctrl.createRoute);
router.get("/",          authenticate(["merchant","admin"]), ctrl.listRoutes);
router.get("/:id",       authenticate(["merchant","admin","driver"]), ctrl.getRoute);
router.patch("/:id/assign", authenticate(["admin"]),         ctrl.assignDriver);

module.exports = router;
