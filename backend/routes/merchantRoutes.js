const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { authenticate } = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);
router.use(authorize('merchant', 'admin'));

router.get('/dashboard', merchantController.getDashboard);
router.get('/products', merchantController.getProducts);
router.get('/orders', merchantController.getOrders);
router.put('/orders/:id/status', merchantController.updateOrderStatus);

module.exports = router;