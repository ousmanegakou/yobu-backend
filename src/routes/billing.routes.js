const r=require('express').Router();
const ctrl=require('../controllers/billing.controller');
const {authenticate}=require('../middleware/auth');
r.get('/invoices',authenticate(['merchant']),ctrl.listInvoices);
r.get('/invoices/:id',authenticate(['merchant']),ctrl.getInvoice);
r.post('/invoices/generate',authenticate(['admin']),ctrl.generateInvoice);
r.get('/admin/all',authenticate(['admin']),ctrl.adminListAll);
module.exports=r;
