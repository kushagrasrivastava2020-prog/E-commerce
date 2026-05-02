const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const OrderModel = require('../models/orderModel');
const { buildPaginationResponse } = require('../utils/helpers');

const orderController = {
  async verifyPayment(req, res, next) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      shippingData,
    } = req.body;

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    const order = await OrderModel.create(
      req.user.id,
      shippingData,
      'razorpay'
    );

    await OrderModel.updatePaymentStatus(order.id, 'completed');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
},
  async createRazorpayOrder(req, res, next) {
  try {
    const amount = Math.round(req.body.total_amount * 100);

    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: razorpayOrder,
    });
  } catch (error) {
    next(error);
  }
},
  // POST /api/orders
  async create(req, res, next) {
    try {
      const order = await OrderModel.create(
        req.user.id,
        req.body,
        req.body.payment_method
      );

      res.status(201).json({
        success: true,
        message: 'Order placed successfully.',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/orders
  async getMyOrders(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const { orders, total } = await OrderModel.findByUser(
        req.user.id, parseInt(page), parseInt(limit)
      );

      res.json({
        success: true,
        ...buildPaginationResponse(orders, total, parseInt(page), parseInt(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/orders/:id
  async getById(req, res, next) {
    try {
      const order = await OrderModel.findById(req.params.id, req.user.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/orders/:id/cancel
  async cancel(req, res, next) {
    try {
      const order = await OrderModel.findById(req.params.id, req.user.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
        });
      }

      if (!['pending', 'confirmed'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled at this stage.',
        });
      }

      const updated = await OrderModel.updateStatus(order.id, 'cancelled');

      res.json({
        success: true,
        message: 'Order cancelled.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = orderController;