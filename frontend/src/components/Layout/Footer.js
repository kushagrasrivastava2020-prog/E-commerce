import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div>
        <div className="footer-brand">
          <span className="navbar-brand-mark">🛍</span>
          <span>ShopHub</span>
        </div>
        <p className="footer-tagline">
          A modern storefront with AI-curated recommendations powered by your local Llama model.
          Built with React, Express, and PostgreSQL.
        </p>
      </div>

      <div>
        <h4>Shop</h4>
        <ul>
          <li><Link to="/">All products</Link></li>
          <li><Link to="/?category=6">Smartphones</Link></li>
          <li><Link to="/?category=7">Laptops</Link></li>
          <li><Link to="/?category=5">Sports</Link></li>
        </ul>
      </div>

      <div>
        <h4>Account</h4>
        <ul>
          <li><Link to="/profile">Profile</Link></li>
          <li><Link to="/orders">Orders</Link></li>
          <li><Link to="/cart">Cart</Link></li>
          <li><Link to="/login">Sign in</Link></li>
        </ul>
      </div>

      <div>
        <h4>For sellers</h4>
        <ul>
          <li><Link to="/merchant">Merchant dashboard</Link></li>
          <li><Link to="/register">Become a seller</Link></li>
        </ul>
      </div>
    </div>

    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} ShopHub. All rights reserved.</span>
      <span>Made with React • Express • PostgreSQL • Llama 3.2</span>
    </div>
  </footer>
);

export default Footer;
