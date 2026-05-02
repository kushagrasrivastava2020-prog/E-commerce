-- =============================================
-- RECOMMENDATION ENGINE SCHEMA
-- Separate schema so existing APIs remain untouched
-- =============================================

SET search_path TO recommendation, ecommerce, public;

-- User behavior tracking
CREATE TABLE IF NOT EXISTS recommendation.user_events (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES ecommerce.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    product_id INTEGER REFERENCES ecommerce.products(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'add_to_cart', 'purchase', 'wishlist'
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product similarity scores (collaborative filtering)
CREATE TABLE IF NOT EXISTS recommendation.product_similarities (
    id BIGSERIAL PRIMARY KEY,
    product_id_a INTEGER REFERENCES ecommerce.products(id) ON DELETE CASCADE,
    product_id_b INTEGER REFERENCES ecommerce.products(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5, 4) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
    algorithm VARCHAR(50) NOT NULL, -- 'collaborative', 'content_based', 'hybrid'
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id_a, product_id_b, algorithm)
);

-- User preference profiles
CREATE TABLE IF NOT EXISTS recommendation.user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES ecommerce.users(id) ON DELETE CASCADE,
    category_preferences JSONB DEFAULT '{}',
    price_range_min DECIMAL(10, 2),
    price_range_max DECIMAL(10, 2),
    brand_preferences TEXT[],
    feature_vector FLOAT8[],
    last_computed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Precomputed recommendations
CREATE TABLE IF NOT EXISTS recommendation.user_recommendations (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES ecommerce.users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES ecommerce.products(id) ON DELETE CASCADE,
    score DECIMAL(5, 4) NOT NULL,
    reason VARCHAR(255),
    algorithm VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Trending / popular products cache
CREATE TABLE IF NOT EXISTS recommendation.trending_products (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES ecommerce.products(id) ON DELETE CASCADE,
    trend_score DECIMAL(10, 4) NOT NULL,
    time_window VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly'
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- A/B test tracking
CREATE TABLE IF NOT EXISTS recommendation.ab_tests (
    id SERIAL PRIMARY KEY,
    test_name VARCHAR(100) NOT NULL,
    variant VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES ecommerce.users(id),
    product_id INTEGER REFERENCES ecommerce.products(id),
    converted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_events_user ON recommendation.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_product ON recommendation.user_events(product_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON recommendation.user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON recommendation.user_events(created_at);
CREATE INDEX IF NOT EXISTS idx_product_sim_a ON recommendation.product_similarities(product_id_a);
CREATE INDEX IF NOT EXISTS idx_product_sim_b ON recommendation.product_similarities(product_id_b);
CREATE INDEX IF NOT EXISTS idx_user_rec_user ON recommendation.user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rec_active ON recommendation.user_recommendations(is_active);
CREATE INDEX IF NOT EXISTS idx_trending_window ON recommendation.trending_products(time_window);