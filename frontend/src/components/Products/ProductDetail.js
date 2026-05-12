import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { recApi } from '../../api/recommendations';
import { useAuth } from '../../context/AuthContext';
import Loading from '../Common/Loading';
import Alert from '../Common/Alert';
import SimilarProducts from '../Recommendations/SimilarProducts';

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.get(`/products/${id}`);
        setProduct(response.data.data);
        setReviews(response.data.data.recent_reviews || []);
        recApi.trackEvent('view', parseInt(id, 10));
      } catch (err) {
        setError('Product not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setAddingToCart(true);
    try {
      await api.post('/cart/items', { product_id: parseInt(id), quantity });
      recApi.trackEvent('add_to_cart', parseInt(id, 10), { quantity });
      setSuccess('Added to cart!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/products/${id}/reviews`, reviewForm);
      setReviews([response.data.data, ...reviews]);
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: '', comment: '' });
      setSuccess('Review submitted!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    }
  };

  const renderStars = (rating) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

  const getStockBadge = () => {
    if (product.stock_quantity === 0) return <span className="stock-badge out-of-stock">Out of Stock</span>;
    if (product.stock_quantity <= product.low_stock_threshold) return <span className="stock-badge low-stock">Low Stock ({product.stock_quantity} left)</span>;
    return <span className="stock-badge in-stock">In Stock</span>;
  };

  if (loading) return <Loading />;
  if (!product) return <Alert type="error" message="Product not found" />;

  return (
    <div>
      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="product-detail">
        <div className="product-detail-image">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} />
          ) : '📦'}
        </div>

        <div className="product-detail-info">
          <h1>{product.name}</h1>

          <div className="product-card-rating" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            {renderStars(product.avg_rating || 0)} ({product.review_count || 0} reviews)
          </div>

          <div className="product-detail-price">
            ${parseFloat(product.price).toFixed(2)}
            {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
              <span style={{ textDecoration: 'line-through', color: 'var(--gray-400)', fontSize: '1.2rem', marginLeft: '0.8rem' }}>
                ${parseFloat(product.compare_at_price).toFixed(2)}
              </span>
            )}
          </div>

          <div className="product-detail-meta">
            <div>{getStockBadge()}</div>
            {product.category_name && <div>Category: {product.category_name}</div>}
            {product.sku && <div>SKU: {product.sku}</div>}
            <div>Sold by: {product.merchant_first_name} {product.merchant_last_name}</div>
          </div>

          {product.description && (
            <p style={{ marginBottom: '1.5rem', color: 'var(--gray-600)' }}>
              {product.description}
            </p>
          )}

          {product.stock_quantity > 0 && (
            <>
              <div className="quantity-control">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock_quantity, parseInt(e.target.value) || 1)))}
                  min="1"
                  max={product.stock_quantity}
                />
                <button onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}>+</button>
              </div>

              <button
                className="btn btn-primary btn-lg"
                onClick={handleAddToCart}
                disabled={addingToCart}
              >
                {addingToCart ? 'Adding...' : '🛒 Add to Cart'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Similar products */}
      <div style={{ marginTop: '2rem' }}>
        <SimilarProducts productId={parseInt(id, 10)} />
      </div>

      {/* Reviews Section */}
      <div style={{ marginTop: '2rem' }}>
        <div className="page-header">
          <h2>Reviews ({product.review_count || 0})</h2>
          {user && (
            <button className="btn btn-outline" onClick={() => setShowReviewForm(!showReviewForm)}>
              Write a Review
            </button>
          )}
        </div>

        {showReviewForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-body">
              <form onSubmit={handleSubmitReview}>
                <div className="form-group">
                  <label>Rating</label>
                  <select className="form-control" value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}>
                    {[5, 4, 3, 2, 1].map(n => (
                      <option key={n} value={n}>{n} Star{n !== 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" className="form-control" value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Comment</label>
                  <textarea className="form-control" value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary">Submit Review</button>
              </form>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="empty-state"><p>No reviews yet</p></div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div>
                  <span className="review-author">{review.first_name} {review.last_name}</span>
                  {review.is_verified_purchase && <span className="review-verified"> ✓ Verified Purchase</span>}
                </div>
                <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
              <div className="review-rating">{renderStars(review.rating)}</div>
              {review.title && <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{review.title}</div>}
              {review.comment && <div className="review-comment">{review.comment}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductDetail;