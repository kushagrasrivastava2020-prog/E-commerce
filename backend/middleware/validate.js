const { validationResult, body, param, query: queryValidator } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('role').optional().isIn(['user', 'merchant']).withMessage('Invalid role'),
  handleValidation,
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock_quantity').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('category_id').optional().isInt().withMessage('Category ID must be an integer'),
  body('description').optional().trim(),
  handleValidation,
];

const validateCartItem = [
  body('product_id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  handleValidation,
];

const validateOrder = [
  body('shipping_name').trim().notEmpty().withMessage('Shipping name required'),
  body('shipping_address').trim().notEmpty().withMessage('Shipping address required'),
  body('shipping_city').trim().notEmpty().withMessage('City required'),
  body('shipping_state').trim().notEmpty().withMessage('State required'),
  body('shipping_postal').trim().notEmpty().withMessage('Postal code required'),
  body('shipping_country').optional().trim(),
  body('payment_method').optional().trim(),
  handleValidation,
];

const validateReview = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim(),
  body('title').optional().trim(),
  handleValidation,
];

const validateIdParam = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
  handleValidation,
];

module.exports = {
  handleValidation,
  validateRegister,
  validateLogin,
  validateProduct,
  validateCartItem,
  validateOrder,
  validateReview,
  validateIdParam,
};