const db = require('../config/db');

// ---------- LLM provider selection ----------
// Priority: explicit LLM_PROVIDER env, else auto-detect (Ollama → Anthropic → none).
const OLLAMA_HOST  = process.env.OLLAMA_HOST  || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

let llmProvider = null;     // 'ollama' | 'anthropic' | null
let anthropicClient = null;

(function selectProvider() {
  const forced = (process.env.LLM_PROVIDER || '').toLowerCase();
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  if (forced === 'none') return;
  if (forced === 'ollama') { llmProvider = 'ollama'; return; }
  if (forced === 'anthropic' && hasAnthropicKey) { llmProvider = 'anthropic'; return; }

  // Auto: prefer Ollama (free/local). Reachability is checked lazily on first call.
  if (!forced) llmProvider = 'ollama';
  if (hasAnthropicKey && llmProvider !== 'ollama') llmProvider = 'anthropic';
})();

if (llmProvider === 'anthropic') {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } catch (e) {
    console.warn('Anthropic SDK not loadable; LLM rerank disabled:', e.message);
    llmProvider = null;
  }
}

// Track Ollama reachability so we don't hammer it after one failure.
let ollamaReachable = null;  // null = untested, true/false = cached
async function ensureOllama() {
  if (llmProvider !== 'ollama') return false;
  if (ollamaReachable !== null) return ollamaReachable;
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
    ollamaReachable = res.ok;
  } catch {
    ollamaReachable = false;
  }
  if (!ollamaReachable) console.warn(`Ollama unreachable at ${OLLAMA_HOST}; classical recs will be used.`);
  return ollamaReachable;
}

// ---------- event logging ----------
async function logEvent({ userId, sessionId, productId, eventType, eventData = {} }) {
  await db.query(
    `INSERT INTO recommendation.user_events (user_id, session_id, product_id, event_type, event_data)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId || null, sessionId || null, productId || null, eventType, eventData]
  );
}

// ---------- preferences ----------
async function getPreferences(userId) {
  const { rows } = await db.query(
    `SELECT user_id, category_preferences, price_range_min, price_range_max, brand_preferences, last_computed
       FROM recommendation.user_profiles
      WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function upsertPreferences(userId, { category_preferences, price_range_min, price_range_max, brand_preferences }) {
  const catJson = JSON.stringify(category_preferences || {});
  const { rows } = await db.query(
    `INSERT INTO recommendation.user_profiles
       (user_id, category_preferences, price_range_min, price_range_max, brand_preferences, last_computed)
     VALUES ($1, $2::jsonb, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET
       category_preferences = EXCLUDED.category_preferences,
       price_range_min      = EXCLUDED.price_range_min,
       price_range_max      = EXCLUDED.price_range_max,
       brand_preferences    = EXCLUDED.brand_preferences,
       last_computed        = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, catJson, price_range_min ?? null, price_range_max ?? null, brand_preferences || null]
  );
  return rows[0];
}

// ---------- signal collection ----------
async function getUserSignals(userId) {
  const prefs = await getPreferences(userId);

  const { rows: recentEvents } = await db.query(
    `SELECT ue.event_type, ue.product_id, ue.created_at,
            p.name, p.category_id, p.tags, p.price
       FROM recommendation.user_events ue
       LEFT JOIN ecommerce.products p ON p.id = ue.product_id
      WHERE ue.user_id = $1
        AND ue.created_at > NOW() - INTERVAL '90 days'
      ORDER BY ue.created_at DESC
      LIMIT 200`,
    [userId]
  );

  // Aggregate signals
  const catScore = new Map();   // category_id -> weight
  const tagScore = new Map();   // tag -> weight
  const seenProductIds = new Set();
  const eventWeight = { view: 1, click: 1.5, wishlist: 3, add_to_cart: 4, purchase: 6 };

  for (const e of recentEvents) {
    if (!e.product_id) continue;
    seenProductIds.add(e.product_id);
    const w = eventWeight[e.event_type] || 0.5;
    if (e.category_id) catScore.set(e.category_id, (catScore.get(e.category_id) || 0) + w);
    if (Array.isArray(e.tags)) {
      for (const t of e.tags) tagScore.set(t, (tagScore.get(t) || 0) + w);
    }
  }

  // Fold explicit preferences into the score map (heavier weight)
  if (prefs?.category_preferences) {
    const explicit = prefs.category_preferences;
    const list = Array.isArray(explicit) ? explicit : (explicit.categories || []);
    for (const cid of list) catScore.set(Number(cid), (catScore.get(Number(cid)) || 0) + 8);
  }

  return {
    prefs,
    recentEvents,
    catScore,
    tagScore,
    seenProductIds,
  };
}

// ---------- classical scoring ----------
async function scoreCandidates(userId, { limit = 8 } = {}) {
  const { prefs, recentEvents, catScore, tagScore, seenProductIds } = await getUserSignals(userId);

  // Cold start: if no signals, return featured + trending
  const hasAnySignal = catScore.size > 0 || tagScore.size > 0;
  if (!hasAnySignal) {
    const { rows } = await db.query(
      `SELECT p.*, c.name AS category_name
         FROM ecommerce.products p
         LEFT JOIN ecommerce.categories c ON c.id = p.category_id
        WHERE p.is_active = true
        ORDER BY p.is_featured DESC, p.avg_rating DESC, p.created_at DESC
        LIMIT $1`,
      [limit]
    );
    return rows.map(p => ({ ...p, score: 0, reason: 'Popular and featured picks to get you started' }));
  }

  const priceMin = prefs?.price_range_min ? Number(prefs.price_range_min) : null;
  const priceMax = prefs?.price_range_max ? Number(prefs.price_range_max) : null;

  // Pull candidate pool — everything active. With small catalogs this is fine;
  // scale-out: filter by top categories first.
  const { rows: candidates } = await db.query(
    `SELECT p.id, p.name, p.slug, p.description, p.short_description,
            p.price, p.compare_at_price, p.image_url, p.tags, p.category_id,
            p.avg_rating, p.review_count, p.stock_quantity, p.is_active, p.is_featured,
            c.name AS category_name
       FROM ecommerce.products p
       LEFT JOIN ecommerce.categories c ON c.id = p.category_id
      WHERE p.is_active = true AND p.stock_quantity > 0`
  );

  const seen = seenProductIds;
  const scored = candidates.map(p => {
    let score = 0;
    const reasons = [];

    // Category affinity
    const catW = catScore.get(p.category_id) || 0;
    if (catW > 0) {
      score += catW * 1.0;
      reasons.push(`matches your interest in ${p.category_name}`);
    }

    // Tag overlap
    if (Array.isArray(p.tags)) {
      let tagSum = 0;
      for (const t of p.tags) tagSum += (tagScore.get(t) || 0);
      if (tagSum > 0) {
        score += tagSum * 0.7;
        reasons.push('similar to items you viewed');
      }
    }

    // Price-window fit
    const price = Number(p.price);
    if (priceMin != null || priceMax != null) {
      const inRange =
        (priceMin == null || price >= priceMin) &&
        (priceMax == null || price <= priceMax);
      if (inRange) {
        score += 3;
        reasons.push('within your preferred price range');
      } else {
        score -= 1.5;
      }
    }

    // Rating prior — small lift for well-rated products
    score += Number(p.avg_rating || 0) * 0.4;

    // Featured nudge
    if (p.is_featured) score += 0.5;

    // Lightly down-rank already-seen items so we don't echo their last view
    if (seen.has(p.id)) score -= 2;

    return {
      ...p,
      score: Math.round(score * 100) / 100,
      reason: reasons[0] ? reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1) : 'Picked for you',
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(p => p.score > 0).slice(0, limit);
}

// ---------- LLM upgrade ----------
function buildLlmInputs(classical, prefs, recentEvents, limit) {
  const recentSummary = recentEvents.slice(0, 25).map(e => ({
    type: e.event_type,
    product: e.name,
    price: e.price ? Number(e.price) : undefined,
  }));
  const candidatePayload = classical.slice(0, Math.min(25, classical.length)).map(p => ({
    id: p.id,
    name: p.name,
    category: p.category_name,
    price: Number(p.price),
    tags: p.tags || [],
    rating: Number(p.avg_rating || 0),
  }));
  const prefsSummary = prefs ? {
    favorite_categories: prefs.category_preferences,
    price_min: prefs.price_range_min ? Number(prefs.price_range_min) : null,
    price_max: prefs.price_range_max ? Number(prefs.price_range_max) : null,
  } : null;
  const systemPrompt =
    'You are a product recommendation engine for an e-commerce site. ' +
    'Pick the BEST products for this shopper from the candidates. ' +
    'Return JSON ONLY of the form {"picks":[{"id":number,"reason":"one short sentence"}]} ' +
    'with up to ' + limit + ' picks, ordered best first. ' +
    'The reason must reference the user\'s preferences or history concretely. No prose outside the JSON.';
  const userPayload = {
    shopper_preferences: prefsSummary,
    recent_activity: recentSummary,
    candidates: candidatePayload,
    pick_top_n: limit,
  };
  return { systemPrompt, userPayload };
}

function extractPicks(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* try harder below */ }
  const match = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function callOllama(systemPrompt, userPayload) {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: 'json',
      options: { temperature: 0.4 },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: JSON.stringify(userPayload) },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  return data?.message?.content || '';
}

async function callAnthropic(systemPrompt, userPayload) {
  const resp = await anthropicClient.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: JSON.stringify(userPayload) }],
  });
  return (resp.content || []).map(b => b.text || '').join('').trim();
}

async function llmRerank(userId, classical, { limit = 8 } = {}) {
  if (!llmProvider || classical.length === 0) return classical;
  if (llmProvider === 'ollama' && !(await ensureOllama())) return classical;

  const { prefs, recentEvents } = await getUserSignals(userId);
  const { systemPrompt, userPayload } = buildLlmInputs(classical, prefs, recentEvents, limit);

  try {
    const text = llmProvider === 'ollama'
      ? await callOllama(systemPrompt, userPayload)
      : await callAnthropic(systemPrompt, userPayload);

    const parsed = extractPicks(text);
    const picks = Array.isArray(parsed) ? parsed
                 : Array.isArray(parsed?.picks) ? parsed.picks
                 : null;
    if (!picks) return classical;

    const byId = new Map(classical.map(c => [c.id, c]));
    const ordered = [];
    for (const pick of picks) {
      const c = byId.get(Number(pick.id));
      if (c && !ordered.some(o => o.id === c.id)) {
        ordered.push({ ...c, reason: pick.reason || c.reason, algorithm: llmProvider });
      }
      if (ordered.length >= limit) break;
    }
    return ordered.length ? ordered : classical;
  } catch (err) {
    console.warn(`LLM rerank (${llmProvider}) failed, using classical:`, err.message);
    if (llmProvider === 'ollama') ollamaReachable = false;
    return classical;
  }
}

// ---------- public: for-you ----------
async function forYou(userId, { limit = 8, useLlm = true } = {}) {
  const classical = await scoreCandidates(userId, { limit: Math.max(limit, 12) });
  const final = (useLlm && llmProvider)
    ? await llmRerank(userId, classical, { limit })
    : classical.slice(0, limit);
  return final.map(p => ({ ...p, algorithm: p.algorithm || (llmProvider ? 'hybrid' : 'classical') }));
}

// ---------- public: similar products ----------
async function similarTo(productId, { limit = 8 } = {}) {
  const { rows: baseRows } = await db.query(
    `SELECT id, category_id, tags, price FROM ecommerce.products WHERE id = $1`,
    [productId]
  );
  const base = baseRows[0];
  if (!base) return [];

  const baseTags = base.tags || [];
  const { rows } = await db.query(
    `SELECT p.id, p.name, p.slug, p.price, p.compare_at_price, p.image_url,
            p.avg_rating, p.review_count, p.tags, p.category_id,
            c.name AS category_name,
            CASE WHEN p.tags && $2::text[] THEN cardinality(ARRAY(SELECT UNNEST(p.tags) INTERSECT SELECT UNNEST($2::text[]))) ELSE 0 END AS tag_overlap
       FROM ecommerce.products p
       LEFT JOIN ecommerce.categories c ON c.id = p.category_id
      WHERE p.is_active = true
        AND p.id <> $1
        AND p.stock_quantity > 0
      ORDER BY
        (CASE WHEN p.category_id = $3 THEN 1 ELSE 0 END) DESC,
        (CASE WHEN p.tags && $2::text[] THEN 1 ELSE 0 END) DESC,
        ABS(p.price - $4) ASC,
        p.avg_rating DESC
      LIMIT $5`,
    [productId, baseTags, base.category_id, Number(base.price), limit]
  );
  return rows.map(r => ({ ...r, reason: r.category_id === base.category_id ? 'Same category' : 'Shares tags with this product' }));
}

// ---------- public: trending ----------
async function trending({ limit = 8, days = 14 } = {}) {
  const { rows } = await db.query(
    `SELECT p.id, p.name, p.slug, p.price, p.compare_at_price, p.image_url,
            p.avg_rating, p.review_count, p.tags, p.category_id,
            c.name AS category_name,
            COALESCE(stats.score, 0) AS trend_score
       FROM ecommerce.products p
       LEFT JOIN ecommerce.categories c ON c.id = p.category_id
       LEFT JOIN (
         SELECT product_id,
                SUM(CASE event_type
                      WHEN 'purchase'    THEN 6
                      WHEN 'add_to_cart' THEN 4
                      WHEN 'wishlist'    THEN 3
                      WHEN 'click'       THEN 1.5
                      WHEN 'view'        THEN 1
                      ELSE 0.5
                    END) AS score
           FROM recommendation.user_events
          WHERE created_at > NOW() - ($1::int || ' days')::interval
            AND product_id IS NOT NULL
          GROUP BY product_id
       ) stats ON stats.product_id = p.id
      WHERE p.is_active = true AND p.stock_quantity > 0
      ORDER BY trend_score DESC, p.is_featured DESC, p.avg_rating DESC
      LIMIT $2`,
    [days, limit]
  );
  return rows;
}

module.exports = {
  llmEnabled: () => !!llmProvider,
  llmProvider: () => llmProvider,
  llmModel: () => llmProvider === 'ollama' ? OLLAMA_MODEL : (llmProvider === 'anthropic' ? 'claude-haiku-4-5' : null),
  logEvent,
  getPreferences,
  upsertPreferences,
  forYou,
  similarTo,
  trending,
};
