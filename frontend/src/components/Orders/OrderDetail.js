import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import Loading from '../Common/Loading';
import Alert from '../Common/Alert';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/orders/${id}`);
        setOrder(response.data.data);
      } catch (err) {
        setError('Order not found');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await api.put(`/orders/${id}/cancel`);
      setOrder({ ...order, status: 'cancelled' });
      setSuccess('Order cancelled');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel');
    }
  };

  if (loading) return <Loading />;
  if (!order) return <Alert type="error" message="Order not found" />;

  return (
    <div>
      <div className="page-header">
        <h1>Order {order.order_number}</h1>
        <Link to="/orders" className="btn btn-secondary">← Back to Orders</Link>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: '1rem' }}>Order Items</h3>
              {order.items?.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: '1rem', padding: '0.8rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ width: 60, height: 60, background: 'var(--gray-100)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.product_image ? <img src={item.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                      Qty: {item.quantity} × ${parseFloat(item.unit_price).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600 }}>${parseFloat(item.total_price).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: '1rem' }}>Shipping Information</h3>
              <p><strong>{order.shipping_name}</strong></p>
              <p>{order.shipping_address}</p>
              <p>{order.shipping_city}, {order.shipping_state} {order.shipping_postal}</p>
              <p>{order.shipping_country}</p>
            </div>
          </div>
        </div>

        <div className="cart-summary">
          <h3>Order Summary</h3>
          <div className="cart-summary-row">
            <span>Status</span>
            <span className={`status-badge status-${order.status}`}>{order.status}</span>
          </div>
          <div className="cart-summary-row">
            <span>Payment</span>
            <span className={`status-badge status-${order.payment_status}`}>{order.payment_status}</span>
          </div>
          <div className="cart-summary-row">
            <span>Date</span>
            <span>{new Date(order.created_at).toLocaleDateString()}</span>
          </div>
          <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid var(--gray-200)' }} />
          <div className="cart-summary-row">
            <span>Subtotal</span>
            <span>${parseFloat(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="cart-summary-row">
            <span>Tax</span>
            <span>${parseFloat(order.tax_amount).toFixed(2)}</span>
          </div>
          <div className="cart-summary-row">
            <span>Shipping</span>
            <span>${parseFloat(order.shipping_amount).toFixed(2)}</span>
          </div>
          {parseFloat(order.discount_amount) > 0 && (
            <div className="cart-summary-row">
              <span>Discount</span>
              <span>-${parseFloat(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>
            <span>${parseFloat(order.total_amount).toFixed(2)}</span>
          </div>

          {['pending', 'confirmed'].includes(order.status) && (
            <button className="btn btn-danger btn-block" style={{ marginTop: '1rem' }} onClick={handleCancel}>
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;