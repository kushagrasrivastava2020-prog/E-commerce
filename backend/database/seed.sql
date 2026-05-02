SET search_path TO ecommerce, public;

-- Seed Categories
INSERT INTO ecommerce.categories (name, slug, description) VALUES
('Electronics', 'electronics', 'Electronic devices and gadgets'),
('Clothing', 'clothing', 'Fashion and apparel'),
('Books', 'books', 'Books and literature'),
('Home & Garden', 'home-garden', 'Home improvement and garden supplies'),
('Sports', 'sports', 'Sports equipment and accessories')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO ecommerce.categories (name, slug, description, parent_id) VALUES
('Smartphones', 'smartphones', 'Mobile phones', 1),
('Laptops', 'laptops', 'Laptop computers', 1),
('Men''s Clothing', 'mens-clothing', 'Clothing for men', 2),
('Women''s Clothing', 'womens-clothing', 'Clothing for women', 2),
('Fiction', 'fiction', 'Fiction books', 3)
ON CONFLICT (slug) DO NOTHING;

-- Note: Admin/Merchant users created via API with hashed passwords
-- The seed data below is minimal; real data inserted through the app

SELECT 'Database seeded successfully' AS status;