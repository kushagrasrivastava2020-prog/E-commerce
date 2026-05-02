import React, { useState, useEffect } from 'react';
import api from '../api/axios';

function Loading() {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
    </div>
  );
}

function Alert({ type = 'error', message, onClose }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${type}`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
          ×
        </button>
      )}
    </div>
  );
}

function AdminPage() {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setDashboard(response.data.data);
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users?limit=50');
      setUsers(response.data.data);
    } catch (err) {
      setError('Failed to load users');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/admin/orders?limit=50');
      setOrders(response.data.data);
    } catch (err) {
      setError('Failed to load orders');
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put('/admin/users/' + userId + '/role', { role });
      setSuccess('Role updated successfully');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update role');
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      await api.put('/admin/users/' + userId + '/toggle-active');
      setSuccess('User status updated');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      await api.put('/admin/orders/' + orderId + '/status', { status });
      setSuccess('Order status updated');
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update order');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="tabs">
        <button
          className={'tab' + (activeTab === 'overview' ? ' active' : '')}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={'tab' + (activeTab === 'users' ? ' active' : '')}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={'tab' + (activeTab === 'orders' ? ' active' : '')}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
      </div>

      {activeTab === 'overview' && dashboard && (
        <div>
          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Total Users</h3>
              <div className="stat-value">{dashboard.total_users}</div>
            </div>
            <div className="stat-card">
              <h3>Total Products</h3>
              <div className="stat-value">{dashboard.total_products}</div>
            </div>
            <div className="stat-card">
              <h3>Total Orders</h3>
              <div className="stat-value">{dashboard.total_orders}</div>
            </div>
            <div className="stat-card">
              <h3>Revenue</h3>
              <div className="stat-value">${dashboard.total_revenue.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card">
              <div className="card-body">
                <h3 style={{ marginBottom: '0.5rem' }}>Users by Role</h3>
                {dashboard.users_by_role.map(function (r) {
                  return (
                    <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                      <span style={{ textTransform: 'capitalize' }}>{r.role}</span>
                      <strong>{r.count}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h3 style={{ marginBottom: '0.5rem' }}>Orders by Status</h3>
                {dashboard.orders_by_status.map(function (s) {
                  return (
                    <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                      <span className={'status-badge status-' + s.status}>{s.status}</span>
                      <strong>{s.count}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(function (u) {
                return (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.first_name} {u.last_name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="form-control"
                        value={u.role}
                        style={{ maxWidth: 120 }}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="merchant">Merchant</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>{u.is_active ? '✅ Active' : '❌ Disabled'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className={'btn btn-sm ' + (u.is_active ? 'btn-danger' : 'btn-success')}
                        onClick={() => handleToggleActive(u.id)}
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(function (order) {
                return (
                  <tr key={order.id}>
                    <td><strong>{order.order_number}</strong></td>
                    <td>{order.first_name} {order.last_name}</td>
                    <td>${parseFloat(order.total_amount).toFixed(2)}</td>
                    <td><span className={'status-badge status-' + order.status}>{order.status}</span></td>
                    <td><span className={'status-badge status-' + order.payment_status}>{order.payment_status}</span></td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                      <select
                        className="form-control"
                        value={order.status}
                        style={{ maxWidth: 140 }}
                        onChange={(e) => handleOrderStatus(order.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPage;