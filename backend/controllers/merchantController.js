const ProductModel = require('../models/productModel');
const OrderModel = require('../models/orderModel');
const db = require('../config/db');
const { buildPaginationResponse } = require('../utils/helpers');

const merchantController = {
  // GET /api/merchant/dashboard
  async getDashboard(req, res, next) {
    try {
      const merchantId = req.user.id;

      // Products count
      const productsCount = await db.query(
        'SELECT COUNT(*) FROM ecommerce.products WHERE merchant_id = $1',
        [merchantId]
      );

      // Total revenue
      const revenue = await db.query(
        `SELECT COALESCE(SUM(oi.total_price), 0) AS total_revenue
         FROM ecommerce.order_items oi
         JOIN ecommerce.orders o ON oi.order_id = o.id
         WHERE oi.merchant_id = $1 AND o.payment_status = 'completed'`,
        [merchantId]
      );

      // Orders count
      const ordersCount = await db.query(
        `SELECT COUNT(DISTINCT o.id) 
         FROM ecommerce.orders o
         JOIN ecommerce.order_items oi ON o.id = oi.order_id
         WHERE oi.merchant_id = $1`,
        [merchantId]
      );

      // Low stock products
      const lowStock = await db.query(
        `SELECT id, name, stock_quantity, low_stock_threshold
         FROM ecommerce.products 
         WHERE merchant_id = $1 AND stock_quantity <= low_stock_threshold AND is_active = true
         ORDER BY stock_quantity ASC
         LIMIT 10`,
        [merchantId]
      );

      // Recent orders
      const recentOrders = await db.query(
        `SELECT DISTINCT o.id, o.order_number, o.status, o.created_at,
                u.first_name, u.last_name,
                (SELECT SUM(oi2.total_price) FROM ecommerce.order_items oi2 
                 WHERE oi2.order_id = o.id AND oi2.merchant_id = $1) AS merchant_total
         FROM ecommerce.orders o
         JOIN ecommerce.order_items oi ON o.id = oi.order_id
         JOIN ecommerce.users u ON o.user_id = u.id
         WHERE oi.merchant_id = $1
         ORDER BY o.created_at DESC
         LIMIT 5`,
        [merchantId]
      );

      res.json({
        success: true,
        data: {
          total_products: parseInt(productsCount.rows[0].count),
          total_revenue: parseFloat(revenue.rows[0].total_revenue),
          total_orders: parseInt(ordersCount.rows[0].count),
          low_stock_products: lowStock.rows,
          recent_orders: recentOrders.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/merchant/products
  async getProducts(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const { products, total } = await ProductModel.getMerchantProducts(
        req.user.id, parseInt(page), parseInt(limit)
      );

      res.json({
        success: true,
        ...buildPaginationResponse(products, total, parseInt(page), parseInt(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/merchant/orders
  async getOrders(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const { orders, total } = await OrderModel.getMerchantOrders(
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

  // PUT /api/merchant/orders/:id/status
  async updateOrderStatus(req, res, next) {
    try {
      const { status } = req.body;

      // Verify merchant owns items in this order
      const check = await db.query(
        `SELECT 1 FROM ecommerce.order_items WHERE order_id = $1 AND merchant_id = $2 LIMIT 1`,
        [req.params.id, req.user.id]
      );

      if (check.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      const order = await OrderModel.updateStatus(req.params.id, status);

      res.json({
        success: true,
        message: 'Order status updated.',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = merchantController;