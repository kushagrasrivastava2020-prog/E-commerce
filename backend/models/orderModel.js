const db = require('../config/db');
const { generateOrderNumber } = require('../utils/helpers');

const OrderModel = {
  async create(userId, shippingData, paymentMethod) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      await client.query('SET search_path TO ecommerce, public');

      // Get cart items
      const cartResult = await client.query(
        `SELECT ci.quantity, ci.product_id,
                p.name, p.price, p.image_url, p.stock_quantity, p.merchant_id, p.is_active
         FROM ecommerce.cart_items ci
         JOIN ecommerce.carts c ON ci.cart_id = c.id
         JOIN ecommerce.products p ON ci.product_id = p.id
         WHERE c.user_id = $1`,
        [userId]
      );

      if (cartResult.rows.length === 0) {
        throw Object.assign(new Error('Cart is empty'), { statusCode: 400 });
      }

      // Validate all items
      for (const item of cartResult.rows) {
        if (!item.is_active) {
          throw Object.assign(new Error(`Product "${item.name}" is no longer available`), { statusCode: 400 });
        }
        if (item.stock_quantity < item.quantity) {
          throw Object.assign(new Error(`Insufficient stock for "${item.name}"`), { statusCode: 400 });
        }
      }

      // Calculate totals
      const subtotal = cartResult.rows.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity, 0
      );
      const tax_amount = subtotal * 0.08; // 8% tax
      const shipping_amount = subtotal > 100 ? 0 : 9.99;
      const total_amount = subtotal + tax_amount + shipping_amount;

      const orderNumber = generateOrderNumber();

      // Create order
      const orderResult = await client.query(
        `INSERT INTO ecommerce.orders 
         (user_id, order_number, subtotal, tax_amount, shipping_amount, total_amount,
          payment_method, shipping_name, shipping_address, shipping_city, 
          shipping_state, shipping_postal, shipping_country)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          userId, orderNumber, subtotal, tax_amount, shipping_amount, total_amount,
          paymentMethod || 'card',
          shippingData.shipping_name, shippingData.shipping_address,
          shippingData.shipping_city, shippingData.shipping_state,
          shippingData.shipping_postal, shippingData.shipping_country || 'US',
        ]
      );

      const order = orderResult.rows[0];

      // Create order items and update stock
      for (const item of cartResult.rows) {
        await client.query(
          `INSERT INTO ecommerce.order_items 
           (order_id, product_id, merchant_id, product_name, product_image, quantity, unit_price, total_price)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            order.id, item.product_id, item.merchant_id, item.name,
            item.image_url, item.quantity, item.price,
            parseFloat(item.price) * item.quantity,
          ]
        );

        // Decrement stock
        await client.query(
          'UPDATE ecommerce.products SET stock_quantity = stock_quantity - $2 WHERE id = $1',
          [item.product_id, item.quantity]
        );
      }

      // Clear cart
      await client.query(
        `DELETE FROM ecommerce.cart_items WHERE cart_id = (
          SELECT id FROM ecommerce.carts WHERE user_id = $1
        )`,
        [userId]
      );

      await client.query('COMMIT');

      // Fetch full order with items
      return this.findById(order.id, userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async findById(orderId, userId = null) {
    let query = `
      SELECT o.*, u.first_name, u.last_name, u.email
      FROM ecommerce.orders o
      JOIN ecommerce.users u ON o.user_id = u.id
      WHERE o.id = $1
    `;
    const params = [orderId];

    if (userId) {
      query += ' AND o.user_id = $2';
      params.push(userId);
    }

    const orderResult = await db.query(query, params);

    if (orderResult.rows.length === 0) return null;

    const itemsResult = await db.query(
      `SELECT oi.*, p.slug AS product_slug
       FROM ecommerce.order_items oi
       LEFT JOIN ecommerce.products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    return { ...orderResult.rows[0], items: itemsResult.rows };
  },

  async findByUser(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      'SELECT COUNT(*) FROM ecommerce.orders WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT o.*, 
              (SELECT COUNT(*) FROM ecommerce.order_items WHERE order_id = o.id) AS item_count
       FROM ecommerce.orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return { orders: result.rows, total };
  },

  async updateStatus(orderId, status) {
    const result = await db.query(
      `UPDATE ecommerce.orders SET status = $2 WHERE id = $1 RETURNING *`,
      [orderId, status]
    );
    return result.rows[0];
  },

  async updatePaymentStatus(orderId, paymentStatus) {
    const result = await db.query(
      `UPDATE ecommerce.orders SET payment_status = $2 WHERE id = $1 RETURNING *`,
      [orderId, paymentStatus]
    );
    return result.rows[0];
  },

  async findAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`o.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters.user_id) {
      conditions.push(`o.user_id = $${paramIndex++}`);
      params.push(filters.user_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM ecommerce.orders o ${whereClause}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT o.*, u.first_name, u.last_name, u.email,
              (SELECT COUNT(*) FROM ecommerce.order_items WHERE order_id = o.id) AS item_count
       FROM ecommerce.orders o
       JOIN ecommerce.users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return { orders: result.rows, total };
  },

  async getMerchantOrders(merchantId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      `SELECT COUNT(DISTINCT o.id)
       FROM ecommerce.orders o
       JOIN ecommerce.order_items oi ON o.id = oi.order_id
       WHERE oi.merchant_id = $1`,
      [merchantId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT DISTINCT o.*, u.first_name, u.last_name, u.email,
              (SELECT SUM(oi2.total_price) FROM ecommerce.order_items oi2 
               WHERE oi2.order_id = o.id AND oi2.merchant_id = $1) AS merchant_total
       FROM ecommerce.orders o
       JOIN ecommerce.order_items oi ON o.id = oi.order_id
       JOIN ecommerce.users u ON o.user_id = u.id
       WHERE oi.merchant_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [merchantId, limit, offset]
    );

    return { orders: result.rows, total };
  },
};

module.exports = OrderModel;