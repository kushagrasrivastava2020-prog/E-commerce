const db = require('../config/db');

const CartModel = {
  async getOrCreateCart(userId) {
    let result = await db.query(
      'SELECT id FROM ecommerce.carts WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      result = await db.query(
        'INSERT INTO ecommerce.carts (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
    }

    return result.rows[0].id;
  },

  async getCartItems(userId) {
    const cartId = await this.getOrCreateCart(userId);

    const result = await db.query(
      `SELECT ci.id, ci.quantity, ci.product_id,
              p.name, p.price, p.image_url, p.stock_quantity, p.is_active,
              (ci.quantity * p.price) AS item_total
       FROM ecommerce.cart_items ci
       JOIN ecommerce.products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at DESC`,
      [cartId]
    );

    const items = result.rows;
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.item_total), 0);

    return { cart_id: cartId, items, subtotal, item_count: items.length };
  },

  async addItem(userId, productId, quantity) {
    const cartId = await this.getOrCreateCart(userId);

    // Check product exists and has stock
    const product = await db.query(
      'SELECT id, stock_quantity, is_active, price FROM ecommerce.products WHERE id = $1',
      [productId]
    );

    if (product.rows.length === 0 || !product.rows[0].is_active) {
      throw Object.assign(new Error('Product not available'), { statusCode: 400 });
    }

    if (product.rows[0].stock_quantity < quantity) {
      throw Object.assign(new Error('Insufficient stock'), { statusCode: 400 });
    }

    const result = await db.query(
      `INSERT INTO ecommerce.cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id) 
       DO UPDATE SET quantity = ecommerce.cart_items.quantity + $3
       RETURNING *`,
      [cartId, productId, quantity]
    );

    return result.rows[0];
  },

  async updateItemQuantity(userId, itemId, quantity) {
    const cartId = await this.getOrCreateCart(userId);

    // Verify stock
    const item = await db.query(
      `SELECT ci.product_id, p.stock_quantity 
       FROM ecommerce.cart_items ci
       JOIN ecommerce.products p ON ci.product_id = p.id
       WHERE ci.id = $1 AND ci.cart_id = $2`,
      [itemId, cartId]
    );

    if (item.rows.length === 0) {
      throw Object.assign(new Error('Cart item not found'), { statusCode: 404 });
    }

    if (item.rows[0].stock_quantity < quantity) {
      throw Object.assign(new Error('Insufficient stock'), { statusCode: 400 });
    }

    const result = await db.query(
      `UPDATE ecommerce.cart_items SET quantity = $3
       WHERE id = $1 AND cart_id = $2
       RETURNING *`,
      [itemId, cartId, quantity]
    );

    return result.rows[0];
  },

  async removeItem(userId, itemId) {
    const cartId = await this.getOrCreateCart(userId);

    const result = await db.query(
      'DELETE FROM ecommerce.cart_items WHERE id = $1 AND cart_id = $2 RETURNING id',
      [itemId, cartId]
    );

    if (result.rows.length === 0) {
      throw Object.assign(new Error('Cart item not found'), { statusCode: 404 });
    }

    return true;
  },

  async clearCart(userId) {
    const cartId = await this.getOrCreateCart(userId);
    await db.query('DELETE FROM ecommerce.cart_items WHERE cart_id = $1', [cartId]);
    return true;
  },
};

module.exports = CartModel;