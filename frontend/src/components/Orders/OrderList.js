import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Loading from '../Common/Loading';
import Alert from '../Common/Alert';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/orders?page=${page}&limit=10`);
        setOrders(response.data.data);
        setPagination(response.data.pagination);
      } catch (err) {
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [page]);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1>My Orders</h1>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No orders yet</h3>
          <p>Your order history will appear here</p>
        </div>
      ) : (
        orders.map(order => (
          <Link key={order.id} to={`/orders/${order.id}`}>
            <div className="order-card">
              <div className="order-header">
                <span className="order-number">{order.order_number}</span>
                <span className={`status-badge status-${order.status}`}>{order.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                  {new Date(order.created_at).toLocaleDateString()} • {order.item_count} item(s)
                </span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  ${parseFloat(order.total_amount).toFixed(2)}
                </span>
              </div>
            </div>
          </Link>
        ))
      )}

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ padding: '0.5rem 1rem' }}>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

export default OrderList;