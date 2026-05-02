const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { validateProduct, validateReview, validateIdParam } = require('../middleware/validate');

// Public routes
router.get('/categories/list', productController.getCategories);
router.get('/', optionalAuth, productController.getAll);
router.get('/slug/:slug', optionalAuth, productController.getBySlug);
router.get('/:id', validateIdParam, optionalAuth, productController.getById);
router.get('/:id/reviews', validateIdParam, productController.getReviews);

// Authenticated user routes
router.post('/:id/reviews', authenticate, validateReview, productController.createReview);
router.put('/reviews/:reviewId', authenticate, productController.updateReview);
router.delete('/reviews/:reviewId', authenticate, productController.deleteReview);

// Merchant routes
router.post('/', authenticate, authorize('merchant', 'admin'), validateProduct, productController.create);
router.put('/:id', authenticate, authorize('merchant', 'admin'), productController.update);
router.delete('/:id', authenticate, authorize('merchant', 'admin'), productController.delete);

module.exports = router;