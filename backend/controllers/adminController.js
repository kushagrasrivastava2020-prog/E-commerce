const UserModel = require('../models/userModel');
const OrderModel = require('../models/orderModel');
const db = require('../config/db');
const { buildPaginationResponse } = require('../utils/helpers');

const adminController = {
  // GET /api/admin/dashboard
  async getDashboard(req, res, next) {
    try {
      const usersCount = await db.query('SELECT COUNT(*) FROM ecommerce.users');
      const productsCount = await db.query('SELECT COUNT(*) FROM ecommerce.products WHERE is_active = true');
      const ordersCount = await db.query('SELECT COUNT(*) FROM ecommerce.orders');

      const revenue = await db.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue 
         FROM ecommerce.orders WHERE payment_status = 'completed'`
      );

      const recentOrders = await db.query(
        `SELECT o.*, u.first_name, u.last_name
         FROM ecommerce.orders o
         JOIN ecommerce.users u ON o.user_id = u.id
         ORDER BY o.created_at DESC LIMIT 10`
      );

      const usersByRole = await db.query(
        `SELECT role, COUNT(*) FROM ecommerce.users GROUP BY role`
      );

      const ordersByStatus = await db.query(
        `SELECT status, COUNT(*) FROM ecommerce.orders GROUP BY status`
      );

      res.json({
        success: true,
        data: {
          total_users: parseInt(usersCount.rows[0].count),
          total_products: parseInt(productsCount.rows[0].count),
          total_orders: parseInt(ordersCount.rows[0].count),
          total_revenue: parseFloat(revenue.rows[0].total_revenue),
          recent_orders: recentOrders.rows,
          users_by_role: usersByRole.rows,
          orders_by_status: ordersByStatus.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/users
  async getUsers(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const { users, total } = await UserModel.findAll(parseInt(page), parseInt(limit));

      res.json({
        success: true,
        ...buildPaginationResponse(users, total, parseInt(page), parseInt(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/admin/users/:id/role
  async updateUserRole(req, res, next) {
    try {
      const { role } = req.body;

      if (!['user', 'merchant', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role.' });
      }

      const user = await UserModel.updateRole(req.params.id, role);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      res.json({ success: true, message: 'User role updated.', data: user });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/admin/users/:id/toggle-active
  async toggleUserActive(req, res, next) {
    try {
      const userCheck = await UserModel.findById(req.params.id);
      if (!userCheck) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const user = await UserModel.toggleActive(req.params.id, !userCheck.is_active);

      res.json({ success: true, message: `User ${user.is_active ? 'activated' : 'deactivated'}.`, data: user });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/orders
  async getOrders(req, res, next) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const { orders, total } = await OrderModel.findAll(
        parseInt(page), parseInt(limit), { status }
      );

      res.json({
        success: true,
        ...buildPaginationResponse(orders, total, parseInt(page), parseInt(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/admin/orders/:id/status
  async updateOrderStatus(req, res, next) {
    try {
      const { status } = req.body;
      const order = await OrderModel.updateStatus(req.params.id, status);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      res.json({ success: true, message: 'Order status updated.', data: order });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/products
  async getProducts(req, res, next) {
    try {
      const { page = 1, limit = 20, search } = req.query;

      const ProductModel = require('../models/productModel');
      const { products, total } = await ProductModel.findAll({
        page: parseInt(page), limit: parseInt(limit), search,
      });

      res.json({
        success: true,
        ...buildPaginationResponse(products, total, parseInt(page), parseInt(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/admin/products/:id
  async deleteProduct(req, res, next) {
    try {
      const result = await db.query(
        'DELETE FROM ecommerce.products WHERE id = $1 RETURNING id',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }

      res.json({ success: true, message: 'Product deleted by admin.' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = adminController;