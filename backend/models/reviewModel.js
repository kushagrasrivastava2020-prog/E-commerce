const db = require('../config/db');

const ReviewModel = {
  async create(userId, productId, data) {
    // Check if user purchased the product
    const purchaseCheck = await db.query(
      `SELECT 1 FROM ecommerce.order_items oi
       JOIN ecommerce.orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
       LIMIT 1`,
      [userId, productId]
    );

    const isVerified = purchaseCheck.rows.length > 0;

    const result = await db.query(
      `INSERT INTO ecommerce.reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [productId, userId, data.rating, data.title, data.comment, isVerified]
    );

    // Update product rating
    const ProductModel = require('./productModel');
    await ProductModel.updateRating(productId);

    return result.rows[0];
  },

  async findByProduct(productId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      'SELECT COUNT(*) FROM ecommerce.reviews WHERE product_id = $1 AND is_approved = true',
      [productId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT r.*, u.first_name, u.last_name
       FROM ecommerce.reviews r
       JOIN ecommerce.users u ON r.user_id = u.id
       WHERE r.product_id = $1 AND r.is_approved = true
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );

    return { reviews: result.rows, total };
  },

  async update(reviewId, userId, data) {
    const result = await db.query(
      `UPDATE ecommerce.reviews 
       SET rating = COALESCE($3, rating), title = COALESCE($4, title), comment = COALESCE($5, comment)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [reviewId, userId, data.rating, data.title, data.comment]
    );

    if (result.rows.length > 0) {
      const ProductModel = require('./productModel');
      await ProductModel.updateRating(result.rows[0].product_id);
    }

    return result.rows[0];
  },

  async delete(reviewId, userId) {
    const review = await db.query(
      'DELETE FROM ecommerce.reviews WHERE id = $1 AND user_id = $2 RETURNING product_id',
      [reviewId, userId]
    );

    if (review.rows.length > 0) {
      const ProductModel = require('./productModel');
      await ProductModel.updateRating(review.rows[0].product_id);
    }

    return review.rows[0];
  },
};

module.exports = ReviewModel;