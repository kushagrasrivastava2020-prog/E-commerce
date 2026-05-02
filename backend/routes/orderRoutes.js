const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validate');

router.use(authenticate);

router.post('/', validateOrder, orderController.create);
router.post(
  '/create-razorpay-order',
  validateOrder,
  orderController.createRazorpayOrder
);

router.post(
  '/verify-payment',
  orderController.verifyPayment
);
router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getById);
router.put('/:id/cancel', orderController.cancel);

module.exports = router;