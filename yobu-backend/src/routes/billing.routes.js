const router = require("express").Router();
const ctrl = require("../controllers/billing.controller");
const { authenticate } = require("../middleware/auth");

router.post("/generate",          authenticate(["admin"]),    ctrl.generateInvoices);
router.get("/invoices",           authenticate(["admin"]),    ctrl.listInvoices);
router.get("/my-invoices",        authenticate(["merchant"]), ctrl.myInvoices);
router.get("/invoices/:id",       authenticate(["admin","merchant"]), ctrl.getInvoice);
router.patch("/invoices/:id/pay", authenticate(["admin"]),    ctrl.markPaid);
router.get("/summary",            authenticate(["admin"]),    ctrl.platformSummary);

module.exports = router;
