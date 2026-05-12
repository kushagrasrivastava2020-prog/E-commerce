import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { recApi } from '../../api/recommendations';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [wished, setWished] = useState(false);
  const [adding, setAdding] = useState(false);

  const price = parseFloat(product.price);
  const compareAt = product.compare_at_price ? parseFloat(product.compare_at_price) : null;
  const onSale = compareAt && compareAt > price;
  const discountPct = onSale ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
  const outOfStock = product.stock_quantity != null && Number(product.stock_quantity) === 0;

  const renderStars = (rating) =>
    '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

  const quickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (outOfStock || adding) return;
    setAdding(true);
    try {
      await api.post('/cart/items', { product_id: product.id, quantity: 1 });
      recApi.trackEvent('add_to_cart', product.id, { quantity: 1 });
      toast(`${product.name} added to cart`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Could not add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const toggleWish = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setWished((w) => !w);
    recApi.trackEvent('wishlist', product.id, { state: !wished });
    toast(wished ? 'Removed from wishlist' : 'Saved to wishlist', 'success', 1800);
  };

  return (
    <div className="card product-card" onClick={() => navigate(`/products/${product.id}`)}>
      <div className="product-card-image">
        {onSale && <span className="product-card-badge">-{discountPct}%</span>}
        {!onSale && product.is_featured && (
          <span className="product-card-badge featured">Featured</span>
        )}

        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          '📦'
        )}

        <div className="product-card-actions-hover">
          <button
            className={`icon-btn ${wished ? 'active' : ''}`}
            onClick={toggleWish}
            title={wished ? 'Remove from wishlist' : 'Save to wishlist'}
            aria-label="Toggle wishlist"
          >
            {wished ? '♥' : '♡'}
          </button>
        </div>

        {!outOfStock && (
          <div className="product-card-quick-add" onClick={quickAdd}>
            {adding ? 'Adding…' : '🛒 Quick add'}
          </div>
        )}
      </div>

      <div className="product-card-body">
        {product.category_name && (
          <span className="product-card-category">{product.category_name}</span>
        )}

        <Link to={`/products/${product.id}`} onClick={(e) => e.stopPropagation()}>
          <div className="product-card-title">{product.name}</div>
        </Link>

        <div className="product-card-rating">
          <span>{renderStars(product.avg_rating || 0)}</span>
          <span className="review-count">({product.review_count || 0})</span>
        </div>

        <div className="product-card-price">
          <span>${price.toFixed(2)}</span>
          {onSale && (
            <span className="product-card-compare-price">${compareAt.toFixed(2)}</span>
          )}
        </div>

        <div className="product-card-actions">
          <Link
            to={`/products/${product.id}`}
            className="btn btn-outline btn-block btn-sm"
            onClick={(e) => e.stopPropagation()}
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
