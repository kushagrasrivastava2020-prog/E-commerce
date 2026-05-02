import React from 'react';
import { Link } from 'react-router-dom';

const ProductCard = ({ product }) => {
  const renderStars = (rating) => {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  return (
    <div className="card product-card">
      <Link to={`/products/${product.id}`}>
        <div className="product-card-image">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} />
          ) : (
            '📦'
          )}
        </div>
      </Link>

      <div className="product-card-body">
        <Link to={`/products/${product.id}`}>
          <div className="product-card-title">{product.name}</div>
        </Link>

        {product.category_name && (
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '0.3rem' }}>
            {product.category_name}
          </div>
        )}

        <div className="product-card-rating">
          {renderStars(product.avg_rating || 0)} ({product.review_count || 0})
        </div>

        <div className="product-card-price">
          ${parseFloat(product.price).toFixed(2)}
          {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
            <span className="product-card-compare-price">
              ${parseFloat(product.compare_at_price).toFixed(2)}
            </span>
          )}
        </div>

        <div className="product-card-actions">
          <Link to={`/products/${product.id}`} className="btn btn-primary btn-block btn-sm">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;