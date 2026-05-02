import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import CartItem from './CartItem';
import Loading from '../Common/Loading';
import Alert from '../Common/Alert';

const Cart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const [shippingData, setShippingData] = useState({
    shipping_name: '', shipping_address: '', shipping_city: '',
    shipping_state: '', shipping_postal: '', shipping_country: 'US',
    payment_method: 'card',
  });

  const fetchCart = useCallback(async () => {
    try {
      const response = await api.get('/cart');
      setCart(response.data.data);
    } catch (err) {
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdateQuantity = async (itemId, quantity) => {
    try {
      await api.put(`/cart/items/${itemId}`, { quantity });
      fetchCart();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      fetchCart();
    } catch (err) {
      setError('Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    try {
      await api.delete('/cart');
      fetchCart();
    } catch (err) {
      setError('Failed to clear cart');
    }
  };

 const handleCheckout = async (e) => {
  e.preventDefault();

  try {
    setProcessing(true);
    setError('');

    const orderResponse = await api.post(
      '/orders/create-razorpay-order',
      {
        ...shippingData,
        total_amount: total,
      }
    );

    const razorpayOrder = orderResponse.data.data;

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: 'ShopHub',
      description: 'Order Payment',
      order_id: razorpayOrder.id,

      handler: async function (response) {
        try {
          await api.post('/orders/verify-payment', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            shippingData,
          });

          setSuccess('Payment successful!');

          setTimeout(() => {
            navigate('/orders');
          }, 2000);

        } catch (err) {
          setError('Payment verification failed');
        }
      },

      prefill: {
        name: shippingData.shipping_name,
      },

      theme: {
        color: '#3399cc',
      },
    };

    const razor = new window.Razorpay(options);

    razor.open();

  } catch (err) {
    setError(err.response?.data?.message || 'Payment failed');
  } finally {
    setProcessing(false);
  }
};

  if (loading) return <Loading />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some products to get started!</p>
        <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
          Browse Products
        </button>
      </div>
    );
  }

  const tax = cart.subtotal * 0.08;
  const shipping = cart.subtotal > 100 ? 0 : 9.99;
  const total = cart.subtotal + tax + shipping;

  return (
    <div>
      <div className="page-header">
        <h1>{checkoutMode ? 'Checkout' : 'Shopping Cart'}</h1>
        {!checkoutMode && (
          <button className="btn btn-secondary btn-sm" onClick={handleClearCart}>Clear Cart</button>
        )}
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="cart-container">
        <div>
          {checkoutMode ? (
            <form onSubmit={handleCheckout}>
              <div className="card">
                <div className="card-body">
                  <h3 style={{ marginBottom: '1rem' }}>Shipping Information</h3>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" className="form-control" required
                      value={shippingData.shipping_name}
                      onChange={(e) => setShippingData({ ...shippingData, shipping_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input type="text" className="form-control" required
                      value={shippingData.shipping_address}
                      onChange={(e) => setShippingData({ ...shippingData, shipping_address: e.target.value })} />
                  </div>
                  <div className="checkout-grid">
                    <div className="form-group">
                      <label>City</label>
                      <input type="text" className="form-control" required
                        value={shippingData.shipping_city}
                        onChange={(e) => setShippingData({ ...shippingData, shipping_city: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input type="text" className="form-control" required
                        value={shippingData.shipping_state}
                        onChange={(e) => setShippingData({ ...shippingData, shipping_state: e.target.value })} />
                    </div>
                  </div>
                  <div className="checkout-grid">
                    <div className="form-group">
                      <label>Postal Code</label>
                      <input type="text" className="form-control" required
                        value={shippingData.shipping_postal}
                        onChange={(e) => setShippingData({ ...shippingData, shipping_postal: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Country</label>
                      <input type="text" className="form-control"
                        value={shippingData.shipping_country}
                        onChange={(e) => setShippingData({ ...shippingData, shipping_country: e.target.value })} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select className="form-control" value={shippingData.payment_method}
                      onChange={(e) => setShippingData({ ...shippingData, payment_method: e.target.value })}>
                      <option value="card">Credit Card</option>
                      <option value="paypal">PayPal</option>
                      <option value="cod">Cash on Delivery</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary"
                      onClick={() => setCheckoutMode(false)}>Back to Cart</button>
                    <button type="submit" className="btn btn-success btn-lg" disabled={processing}>
                      {processing ? 'Processing...' : `Place Order ($${total.toFixed(2)})`}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="cart-items">
              {cart.items.map(item => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>

        <div className="cart-summary">
          <h3>Order Summary</h3>
          <div className="cart-summary-row">
            <span>Items ({cart.item_count})</span>
            <span>${cart.subtotal.toFixed(2)}</span>
          </div>
          <div className="cart-summary-row">
            <span>Tax (8%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="cart-summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
          </div>
          {cart.subtotal < 100 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: '0.5rem' }}>
              Add ${(100 - cart.subtotal).toFixed(2)} more for free shipping!
            </div>
          )}
          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          {!checkoutMode && (
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: '1rem' }}
              onClick={() => setCheckoutMode(true)}>
              Proceed to Checkout
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;