import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const Hero = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: 70, categories: 9 });
  const [chips, setChips] = useState([]);

  useEffect(() => {
    api.get('/products?limit=4&sort_by=newest&is_featured=true')
      .then((r) => {
        const items = (r.data?.data || []).slice(0, 3);
        setChips(items);
      })
      .catch(() => {});
    api.get('/products/categories/list')
      .then((r) => {
        const cats = r.data?.data || [];
        const productCount = cats.reduce((acc, c) => acc + (parseInt(c.product_count, 10) || 0), 0);
        setStats({ products: productCount || 70, categories: cats.filter(c => (parseInt(c.product_count, 10) || 0) > 0).length || 9 });
      })
      .catch(() => {});
  }, []);

  return (
    <section className="hero reveal is-visible">
      <div className="hero-grid-overlay" />

      <div>
        <span className="hero-eyebrow">
          <span className="ai-dot" style={{ background: '#fde68a' }} />
          AI-curated shopping
        </span>
        <h1>
          Discover products <br />
          <span className="hero-accent">picked just for you</span>
        </h1>
        <p>
          ShopHub learns what you love and surfaces the right products from {stats.products}+ items
          across smartphones, laptops, fashion, home and more — reranked in real time by a local
          Llama model running on your Mac.
        </p>
        <div className="hero-actions">
          <Link to={user ? '/profile' : '/register'}>
            <button className="btn btn-primary btn-lg">
              {user ? 'My account' : 'Get started — it’s free'}
            </button>
          </Link>
          <a href="#shop">
            <button className="btn btn-outline btn-lg">Browse the catalog</button>
          </a>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-value">{stats.products}+</span>
            <span className="hero-stat-label">Products</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">{stats.categories}</span>
            <span className="hero-stat-label">Categories</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">100%</span>
            <span className="hero-stat-label">Local AI</span>
          </div>
        </div>
      </div>

      <div className="hero-art" aria-hidden="true">
        {chips[0] && (
          <Link to={`/products/${chips[0].id}`} className="hero-chip c1">
            {chips[0].image_url && <img src={chips[0].image_url} alt="" />}
            <div className="hero-chip-name">{chips[0].name}</div>
            <div className="hero-chip-price">${parseFloat(chips[0].price).toFixed(0)}</div>
          </Link>
        )}
        {chips[1] && (
          <Link to={`/products/${chips[1].id}`} className="hero-chip c2">
            {chips[1].image_url && <img src={chips[1].image_url} alt="" />}
            <div className="hero-chip-name">{chips[1].name}</div>
            <div className="hero-chip-price">${parseFloat(chips[1].price).toFixed(0)}</div>
          </Link>
        )}
        {chips[2] && (
          <Link to={`/products/${chips[2].id}`} className="hero-chip c3">
            {chips[2].image_url && <img src={chips[2].image_url} alt="" />}
            <div className="hero-chip-name">{chips[2].name}</div>
            <div className="hero-chip-price">${parseFloat(chips[2].price).toFixed(0)}</div>
          </Link>
        )}
        <div className="hero-chip c4">
          <span className="ai-pulse">✨ AI pick of the day</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;
