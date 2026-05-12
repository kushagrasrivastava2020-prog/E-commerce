import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

// Curated visuals for the top-level categories (Unsplash photos already used in seed)
const VISUALS = {
  electronics:    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
  clothing:       'https://images.unsplash.com/photo-1485518882345-15568b007407?w=800',
  books:          'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
  'home-garden':  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800',
  sports:         'https://images.unsplash.com/photo-1517344800994-80b20463999c?w=800',
  smartphones:    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
  laptops:        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
  'mens-clothing':'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
  'womens-clothing': 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800',
  fiction:        'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800',
};

const ICONS = {
  electronics: '🎧', clothing: '👕', books: '📚', 'home-garden': '🏡',
  sports: '🏀', smartphones: '📱', laptops: '💻', 'mens-clothing': '👔',
  'womens-clothing': '👗', fiction: '📖',
};

// Pick the 6 most-stocked sub-categories for the showcase
const PICK = ['smartphones', 'laptops', 'mens-clothing', 'womens-clothing', 'sports', 'home-garden'];

const CategoryShowcase = () => {
  const [cats, setCats] = useState([]);

  useEffect(() => {
    api.get('/products/categories/list')
      .then((r) => {
        const all = r.data?.data || [];
        const bySlug = Object.fromEntries(all.map(c => [c.slug, c]));
        const ordered = PICK.map(s => bySlug[s]).filter(Boolean);
        setCats(ordered.length ? ordered : all.slice(0, 6));
      })
      .catch(() => {});
  }, []);

  if (cats.length === 0) return null;

  return (
    <section className="reveal" style={{ marginBottom: '3rem' }}>
      <div className="section-heading">
        <div>
          <div className="section-title">Shop by category</div>
          <span className="section-subtitle">Browse our most-loved departments</span>
        </div>
      </div>

      <div className="category-grid">
        {cats.map((c) => (
          <Link key={c.id} to={`/?category=${c.id}`} className="category-tile">
            {VISUALS[c.slug]
              ? <div className="category-tile-img" style={{ backgroundImage: `url(${VISUALS[c.slug]})` }} />
              : <div className="category-tile-fallback">{ICONS[c.slug] || '🛒'}</div>}
            <div className="category-tile-name">{c.name}</div>
            <div className="category-tile-meta">
              {c.product_count ? `${c.product_count} items` : 'Explore →'}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryShowcase;
