import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Loading from '../Common/Loading';
import Alert from '../Common/Alert';

const AdminDashboard = () => {
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
      await api.put(`/admin/users/${userId}/role`, { role });
      setSuccess('Role updated');
      fetchUsers();
    } catch (err) {
      setError('Failed to update role');
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/toggle-active`);
      setSuccess('User status updated');
      fetchUsers();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status });
      setSuccess('Order status updated');
      fetchOrders();
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
        {['overview', 'users', 'orders'].map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && dashboard && (
        <>
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
                <h3>Users by Role</h3>
                {dashboard.users_by_role.map(r => (
                  <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                    <span style={{ textTransform: 'capitalize' }}>{r.role}</span>
                    <strong>{r.count}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h3>Orders by Status</h3>
                {dashboard.orders_by_status.map(s => (
                  <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                    <span className={`status-badge status-${s.status}`}>{s.status}</span>
                    <strong>{s.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
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
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.first_name} {u.last_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select className="form-control" value={u.role} style={{ maxWidth: 120 }}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                      <option value="user">User</option>
                      <option value="merchant">Merchant</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{u.is_active ? '✅ Active' : '❌ Disabled'}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleToggleActive(u.id)}>
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td><strong>{order.order_number}</strong></td>
                  <td>{order.first_name} {order.last_name}</td>
                  <td>${parseFloat(order.total_amount).toFixed(2)}</td>
                  <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
                  <td><span className={`status-badge status-${order.payment_status}`}>{order.payment_status}</span></td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    <select className="form-control" value={order.status} style={{ maxWidth: 150 }}
                      onChange={(e) => handleOrderStatus(order.id, e.target.value)}>
                      {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;