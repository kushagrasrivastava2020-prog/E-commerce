const CartModel = require('../models/cartModel');

const cartController = {
  // GET /api/cart
  async getCart(req, res, next) {
    try {
      const cart = await CartModel.getCartItems(req.user.id);

      res.json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/cart/items
  async addItem(req, res, next) {
    try {
      const { product_id, quantity } = req.body;
      const item = await CartModel.addItem(req.user.id, product_id, quantity);

      res.status(201).json({
        success: true,
        message: 'Item added to cart.',
        data: item,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/cart/items/:itemId
  async updateItem(req, res, next) {
    try {
      const { quantity } = req.body;
      const item = await CartModel.updateItemQuantity(
        req.user.id, req.params.itemId, quantity
      );

      res.json({
        success: true,
        message: 'Cart item updated.',
        data: item,
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/cart/items/:itemId
  async removeItem(req, res, next) {
    try {
      await CartModel.removeItem(req.user.id, req.params.itemId);

      res.json({
        success: true,
        message: 'Item removed from cart.',
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/cart
  async clearCart(req, res, next) {
    try {
      await CartModel.clearCart(req.user.id);

      res.json({
        success: true,
        message: 'Cart cleared.',
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = cartController;