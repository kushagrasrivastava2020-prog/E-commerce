-- =============================================
-- E-COMMERCE DATABASE SCHEMA
-- =============================================

-- Create schemas for separation
CREATE SCHEMA IF NOT EXISTS ecommerce;
CREATE SCHEMA IF NOT EXISTS recommendation;

-- Set search path
SET search_path TO ecommerce, public;

-- =============================================
-- ENUM TYPES
-- =============================================
DO $$ BEGIN
    CREATE TYPE ecommerce.user_role AS ENUM ('user', 'merchant', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ecommerce.order_status AS ENUM (
        'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ecommerce.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ecommerce.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ecommerce.user_role DEFAULT 'user',
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ADDRESSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ecommerce.addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES ecommerce.users(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'home',
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'US',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ecommerce.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES ecommerce.categories(id) ON DELETE SET NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ecommerce.products (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER NOT NULL REFERENCES ecommerce.users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES ecommerce.categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    compare_at_price DECIMAL(10, 2) CHECK (compare_at_price >= 0),
    cost_price DECIMAL(10, 2) CHECK (cost_price >= 0),
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INTEGER DEFAULT 10,
    weight DECIMAL(8, 2),
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    image_url TEXT,
    images TEXT[],
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    avg_rating DECIMAL(3, 2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CART TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ecommerce.carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES ecommerce.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CART ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ecommerce.cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES ecommerce.carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES ecommerce.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id)
);

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ecommerce.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES ecommerce.users(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status ecommerce.order_status DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status ecommerce.payment_status DEFAULT 'pending',
    payment_method VARCHAR(50),
    -- Razorpay fields
razorpay_order_id VARCHAR(255),
razorpay_payment_id VARCHAR(255),
razorpay_signature TEXT,
paid_at TIMESTAMP,
    shipping_address_id INTEGER REFERENCES ecommerce.addresses(id),
    shipping_name VARCHAR(200),
    shipping_address TEXT,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal VARCHAR(20),
    shipping_country VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ORDER ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ecommerce.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES ecommerce.orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES ecommerce.products(id),
    merchant_id INTEGER NOT NULL REFERENCES ecommerce.users(id),
    product_name VARCHAR(255) NOT NULL,
    product_image TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- REVIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ecommerce.reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES ecommerce.products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES ecommerce.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id)
);

-- =============================================
-- WISHLISTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ecommerce.wishlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES ecommerce.users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES ecommerce.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON ecommerce.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON ecommerce.users(role);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON ecommerce.products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON ecommerce.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON ecommerce.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON ecommerce.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON ecommerce.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_price ON ecommerce.products(price);
CREATE INDEX IF NOT EXISTS idx_products_tags ON ecommerce.products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON ecommerce.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON ecommerce.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON ecommerce.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON ecommerce.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_merchant ON ecommerce.order_items(merchant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON ecommerce.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON ecommerce.addresses(user_id);

-- =============================================
-- UPDATE TIMESTAMP FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION ecommerce.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS
DROP TRIGGER IF EXISTS update_users_updated_at ON ecommerce.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON ecommerce.users
    FOR EACH ROW EXECUTE FUNCTION ecommerce.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON ecommerce.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON ecommerce.products
    FOR EACH ROW EXECUTE FUNCTION ecommerce.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON ecommerce.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON ecommerce.orders
    FOR EACH ROW EXECUTE FUNCTION ecommerce.update_updated_at_column();

DROP TRIGGER IF EXISTS update_carts_updated_at ON ecommerce.carts;
CREATE TRIGGER update_carts_updated_at
    BEFORE UPDATE ON ecommerce.carts
    FOR EACH ROW EXECUTE FUNCTION ecommerce.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON ecommerce.reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON ecommerce.reviews
    FOR EACH ROW EXECUTE FUNCTION ecommerce.update_updated_at_column();