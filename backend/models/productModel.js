const db = require('../config/db');
const { generateSlug } = require('../utils/helpers');

const ProductModel = {
  async create(merchantId, data) {
    const {
      name, description, short_description, price, compare_at_price,
      cost_price, sku, stock_quantity, category_id, image_url, images,
      tags, weight, is_featured,
    } = data;

    const slug = generateSlug(name);

    const result = await db.query(
      `INSERT INTO ecommerce.products 
       (merchant_id, name, slug, description, short_description, price, compare_at_price,
        cost_price, sku, stock_quantity, category_id, image_url, images, tags, weight, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        merchantId, name, slug, description, short_description,
        price, compare_at_price, cost_price, sku,
        stock_quantity || 0, category_id, image_url,
        images || [], tags || [], weight, is_featured || false,
      ]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      `SELECT p.*, 
              c.name AS category_name, c.slug AS category_slug,
              u.first_name AS merchant_first_name, u.last_name AS merchant_last_name
       FROM ecommerce.products p
       LEFT JOIN ecommerce.categories c ON p.category_id = c.id
       LEFT JOIN ecommerce.users u ON p.merchant_id = u.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findBySlug(slug) {
    const result = await db.query(
      `SELECT p.*, 
              c.name AS category_name, c.slug AS category_slug,
              u.first_name AS merchant_first_name, u.last_name AS merchant_last_name
       FROM ecommerce.products p
       LEFT JOIN ecommerce.categories c ON p.category_id = c.id
       LEFT JOIN ecommerce.users u ON p.merchant_id = u.id
       WHERE p.slug = $1`,
      [slug]
    );
    return result.rows[0];
  },

  async findAll({ page = 1, limit = 20, category_id, search, min_price, max_price, sort_by, merchant_id, is_featured }) {
    const offset = (page - 1) * limit;
    let conditions = ['p.is_active = true'];
    let params = [];
    let paramIndex = 1;

    if (category_id) {
      conditions.push(`p.category_id = $${paramIndex++}`);
      params.push(category_id);
    }
    if (merchant_id) {
      conditions.push(`p.merchant_id = $${paramIndex++}`);
      params.push(merchant_id);
    }
    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (min_price) {
      conditions.push(`p.price >= $${paramIndex++}`);
      params.push(min_price);
    }
    if (max_price) {
      conditions.push(`p.price <= $${paramIndex++}`);
      params.push(max_price);
    }
    if (is_featured) {
      conditions.push('p.is_featured = true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderClause = 'ORDER BY p.created_at DESC';
    if (sort_by === 'price_asc') orderClause = 'ORDER BY p.price ASC';
    else if (sort_by === 'price_desc') orderClause = 'ORDER BY p.price DESC';
    else if (sort_by === 'rating') orderClause = 'ORDER BY p.avg_rating DESC';
    else if (sort_by === 'newest') orderClause = 'ORDER BY p.created_at DESC';
    else if (sort_by === 'name') orderClause = 'ORDER BY p.name ASC';

    const countQuery = `SELECT COUNT(*) FROM ecommerce.products p ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT p.*, c.name AS category_name,
             u.first_name AS merchant_first_name, u.last_name AS merchant_last_name
      FROM ecommerce.products p
      LEFT JOIN ecommerce.categories c ON p.category_id = c.id
      LEFT JOIN ecommerce.users u ON p.merchant_id = u.id
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await db.query(dataQuery, params);
    return { products: result.rows, total };
  },

  async update(id, merchantId, data) {
    const {
      name, description, short_description, price, compare_at_price,
      cost_price, sku, stock_quantity, category_id, image_url, images,
      tags, weight, is_active, is_featured,
    } = data;

    const result = await db.query(
      `UPDATE ecommerce.products SET
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        short_description = COALESCE($5, short_description),
        price = COALESCE($6, price),
        compare_at_price = COALESCE($7, compare_at_price),
        cost_price = COALESCE($8, cost_price),
        sku = COALESCE($9, sku),
        stock_quantity = COALESCE($10, stock_quantity),
        category_id = COALESCE($11, category_id),
        image_url = COALESCE($12, image_url),
        images = COALESCE($13, images),
        tags = COALESCE($14, tags),
        weight = COALESCE($15, weight),
        is_active = COALESCE($16, is_active),
        is_featured = COALESCE($17, is_featured)
       WHERE id = $1 AND merchant_id = $2
       RETURNING *`,
      [
        id, merchantId, name, description, short_description,
        price, compare_at_price, cost_price, sku,
        stock_quantity, category_id, image_url, images, tags,
        weight, is_active, is_featured,
      ]
    );
    return result.rows[0];
  },

  async delete(id, merchantId) {
    const result = await db.query(
      'DELETE FROM ecommerce.products WHERE id = $1 AND merchant_id = $2 RETURNING id',
      [id, merchantId]
    );
    return result.rows[0];
  },

  async updateRating(productId) {
    await db.query(
      `UPDATE ecommerce.products 
       SET avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM ecommerce.reviews WHERE product_id = $1 AND is_approved = true),
           review_count = (SELECT COUNT(*) FROM ecommerce.reviews WHERE product_id = $1 AND is_approved = true)
       WHERE id = $1`,
      [productId]
    );
  },

  async getCategories() {
    const result = await db.query(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM ecommerce.categories c
       LEFT JOIN ecommerce.products p ON c.id = p.category_id AND p.is_active = true
       WHERE c.is_active = true
       GROUP BY c.id
       ORDER BY c.name`
    );
    return result.rows;
  },

  async getMerchantProducts(merchantId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const countResult = await db.query(
      'SELECT COUNT(*) FROM ecommerce.products WHERE merchant_id = $1',
      [merchantId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT p.*, c.name AS category_name
       FROM ecommerce.products p
       LEFT JOIN ecommerce.categories c ON p.category_id = c.id
       WHERE p.merchant_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [merchantId, limit, offset]
    );
    return { products: result.rows, total };
  },
};

module.exports = ProductModel;