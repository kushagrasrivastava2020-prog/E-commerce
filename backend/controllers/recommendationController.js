const svc = require('../services/recommendationService');

const ALLOWED_EVENTS = new Set(['view', 'click', 'add_to_cart', 'purchase', 'wishlist']);

const recommendationController = {
  // POST /api/recommendations/events
  async track(req, res, next) {
    try {
      const { product_id, event_type, session_id, event_data } = req.body || {};
      if (!event_type || !ALLOWED_EVENTS.has(event_type)) {
        return res.status(400).json({ success: false, message: 'Invalid event_type' });
      }
      await svc.logEvent({
        userId: req.user?.id,
        sessionId: session_id,
        productId: product_id ? Number(product_id) : null,
        eventType: event_type,
        eventData: event_data || {},
      });
      res.status(202).json({ success: true });
    } catch (e) { next(e); }
  },

  // GET /api/recommendations/preferences
  async getPreferences(req, res, next) {
    try {
      const prefs = await svc.getPreferences(req.user.id);
      res.json({ success: true, data: prefs });
    } catch (e) { next(e); }
  },

  // PUT /api/recommendations/preferences
  async setPreferences(req, res, next) {
    try {
      const { category_preferences, price_range_min, price_range_max, brand_preferences } = req.body || {};
      const prefs = await svc.upsertPreferences(req.user.id, {
        category_preferences,
        price_range_min,
        price_range_max,
        brand_preferences,
      });
      res.json({ success: true, data: prefs });
    } catch (e) { next(e); }
  },

  // GET /api/recommendations/for-you
  async forYou(req, res, next) {
    try {
      const limit = Math.min(parseInt(req.query.limit || '8', 10), 24);
      const useLlm = req.query.llm !== 'false';
      const items = await svc.forYou(req.user.id, { limit, useLlm });
      res.json({
        success: true,
        data: items,
        meta: {
          llm_enabled: svc.llmEnabled(),
          llm_provider: svc.llmProvider?.() || null,
          llm_model: svc.llmModel?.() || null,
        },
      });
    } catch (e) { next(e); }
  },

  // GET /api/recommendations/similar/:productId
  async similar(req, res, next) {
    try {
      const productId = Number(req.params.productId);
      if (!productId) return res.status(400).json({ success: false, message: 'Invalid product id' });
      const limit = Math.min(parseInt(req.query.limit || '8', 10), 24);
      const items = await svc.similarTo(productId, { limit });
      res.json({ success: true, data: items });
    } catch (e) { next(e); }
  },

  // GET /api/recommendations/trending
  async trending(req, res, next) {
    try {
      const limit = Math.min(parseInt(req.query.limit || '8', 10), 24);
      const days = Math.min(parseInt(req.query.days || '14', 10), 90);
      const items = await svc.trending({ limit, days });
      res.json({ success: true, data: items });
    } catch (e) { next(e); }
  },
};

module.exports = recommendationController;
