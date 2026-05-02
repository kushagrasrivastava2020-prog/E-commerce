const ProductModel = require('../models/productModel');
const ReviewModel = require('../models/reviewModel');
const { buildPaginationResponse } = require('../utils/helpers');

const productController = {
  // GET /api/products
  async getAll(req, res, next) {
    try {
      const {
        page = 1, limit = 20, category_id, search,
        min_price, max_price, sort_by, is_featured,
      } = req.query;

      const { products, total } = await ProductModel.findAll({
        page: parseInt(page), limit: parseInt(limit),
        category_id, search, min_price, max_price, sort_by, is_featured,
      });

      res.json({
        success: true,
        ...buildPaginationResponse(products, total, parseInt(page), parseInt(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/products/:id
  async getById(req, res, next) {
    try {
      const product = await ProductModel.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found.',
        });
      }

      // Get reviews
      const { reviews } = await ReviewModel.findByProduct(product.id, 1, 5);

      res.json({
        success: true,
        data: { ...product, recent_reviews: reviews },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/products/slug/:slug
  async getBySlug(req, res, next) {
    try {
      const product = await ProductModel.findBySlug(req.params.slug);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found.',
        });
      }

      const { reviews } = await ReviewModel.findByProduct(product.id, 1, 5);

      res.json({
        success: true,
        data: { ...product, recent_reviews: reviews },
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/products (merchant only)
  async create(req, res, next) {
    try {
      const product = await ProductModel.create(req.user.id, req.body);

      res.status(201).json({
        success: true,
        message: 'Product created successfully.',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/products/:id (merchant only - own products)
  async update(req, res, next) {
    try {
      const product = await ProductModel.update(req.params.id, req.user.id, req.body);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found or unauthorized.',
        });
      }

      res.json({
        success: true,
        message: 'Product updated.',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/products/:id (merchant only - own products)
  async delete(req, res, next) {
    try {
      const result = await ProductModel.delete(req.params.id, req.user.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Product not found or unauthorized.',
        });
      }

      res.json({
        success: true,
        message: 'Product deleted.',
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/products/categories/list
  async getCategories(req, res, next) {
    try {
      const categories = await ProductModel.getCategories();
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/products/:id/reviews
  async getReviews(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const { reviews, total } = await ReviewModel.findByProduct(
        req.params.id, parseInt(page), parseInt(limit)
      );

      res.json({
        success: true,
        ...buildPaginationResponse(reviews, total, parseInt(page), parseInt(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/products/:id/reviews
  async createReview(req, res, next) {
    try {
      const review = await ReviewModel.create(req.user.id, req.params.id, req.body);

      res.status(201).json({
        success: true,
        message: 'Review submitted.',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/products/reviews/:reviewId
  async updateReview(req, res, next) {
    try {
      const review = await ReviewModel.update(req.params.reviewId, req.user.id, req.body);

      if (!review) {
        return res.status(404).json({ success: false, message: 'Review not found.' });
      }

      res.json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/products/reviews/:reviewId
  async deleteReview(req, res, next) {
    try {
      const result = await ReviewModel.delete(req.params.reviewId, req.user.id);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Review not found.' });
      }

      res.json({ success: true, message: 'Review deleted.' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = productController;