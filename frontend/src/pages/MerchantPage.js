import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

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

function MerchantPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    compare_at_price: '',
    stock_quantity: '',
    category_id: '',
    sku: '',
    image_url: '',
  });

  useEffect(() => {
    fetchDashboard();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/merchant/dashboard');
      setDashboard(response.data.data);
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/merchant/products?limit=50');
      setProducts(response.data.data);
    } catch (err) {
      setError('Failed to load products');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/merchant/orders?limit=50');
      setOrders(response.data.data);
    } catch (err) {
      setError('Failed to load orders');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories/list');
      setCategories(response.data.data);
    } catch (err) {
      // silent
    }
  };

  const resetForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      compare_at_price: '',
      stock_quantity: '',
      category_id: '',
      sku: '',
      image_url: '',
    });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        compare_at_price: productForm.compare_at_price ? parseFloat(productForm.compare_at_price) : null,
        stock_quantity: parseInt(productForm.stock_quantity, 10),
        category_id: productForm.category_id ? parseInt(productForm.category_id, 10) : null,
        sku: productForm.sku || null,
        image_url: productForm.image_url || null,
      };

      if (editingProduct) {
        await api.put('/products/' + editingProduct.id, data);
      } else {
        await api.post('/products', data);
      }

      setShowProductForm(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      compare_at_price: product.compare_at_price || '',
      stock_quantity: product.stock_quantity || '',
      category_id: product.category_id || '',
      sku: product.sku || '',
      image_url: product.image_url || '',
    });
    setShowProductForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete('/products/' + id);
      fetchProducts();
      fetchDashboard();
    } catch (err) {
      setError('Failed to delete product');
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      await api.put('/merchant/orders/' + orderId + '/status', { status });
      fetchOrders();
    } catch (err) {
      setError('Failed to update order');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1>Merchant Dashboard</h1>
        <span style={{ color: 'var(--gray-500)' }}>
          Welcome, {user?.first_name}
        </span>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="tabs">
        <button
          className={'tab' + (activeTab === 'overview' ? ' active' : '')}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={'tab' + (activeTab === 'products' ? ' active' : '')}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button
          className={'tab' + (activeTab === 'orders' ? ' active' : '')}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
      </div>

      {/* ==================== OVERVIEW TAB ==================== */}
      {activeTab === 'overview' && dashboard && (
        <div>
          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Products</h3>
              <div className="stat-value">{dashboard.total_products}</div>
            </div>
            <div className="stat-card">
              <h3>Revenue</h3>
              <div className="stat-value">${dashboard.total_revenue.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <h3>Orders</h3>
              <div className="stat-value">{dashboard.total_orders}</div>
            </div>
          </div>

          {dashboard.low_stock_products.length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <h3>⚠️ Low Stock Alert</h3>
                {dashboard.low_stock_products.map(function (p) {
                  return (
                    <div key={p.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                      {p.name} — <strong>{p.stock_quantity}</strong> left
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dashboard.recent_orders.length > 0 && (
            <div className="card">
              <div className="card-body">
                <h3>Recent Orders</h3>
                {dashboard.recent_orders.map(function (o) {
                  return (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                      <span><strong>{o.order_number}</strong> — {o.first_name} {o.last_name}</span>
                      <span>
                        <span className={'status-badge status-' + o.status}>{o.status}</span>
                        {' '}${parseFloat(o.merchant_total || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== PRODUCTS TAB ==================== */}
      {activeTab === 'products' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (showProductForm && !editingProduct) {
                  setShowProductForm(false);
                } else {
                  setEditingProduct(null);
                  resetForm();
                  setShowProductForm(true);
                }
              }}
            >
              {showProductForm && !editingProduct ? 'Cancel' : '+ Add Product'}
            </button>
          </div>

          {showProductForm && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-body">
                <h3 style={{ marginBottom: '1rem' }}>
                  {editingProduct ? 'Edit Product' : 'New Product'}
                </h3>
                <form onSubmit={handleProductSubmit}>
                  <div className="checkout-grid">
                    <div className="form-group">
                      <label>Product Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>SKU</label>
                      <input
                        type="text"
                        className="form-control"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      className="form-control"
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    />
                  </div>

                  <div className="checkout-grid">
                    <div className="form-group">
                      <label>Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        required
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Compare at Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={productForm.compare_at_price}
                        onChange={(e) => setProductForm({ ...productForm, compare_at_price: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="checkout-grid">
                    <div className="form-group">
                      <label>Stock Quantity *</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        required
                        value={productForm.stock_quantity}
                        onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        className="form-control"
                        value={productForm.category_id}
                        onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                      >
                        <option value="">Select Category</option>
                        {categories.map(function (c) {
                          return (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Image URL</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://example.com/image.jpg"
                      value={productForm.image_url}
                      onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary">
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowProductForm(false);
                        setEditingProduct(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <h3>No products yet</h3>
              <p>Click "+ Add Product" to create your first product</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(function (product) {
                    var stockClass = 'in-stock';
                    if (product.stock_quantity === 0) stockClass = 'out-of-stock';
                    else if (product.stock_quantity <= (product.low_stock_threshold || 10)) stockClass = 'low-stock';

                    return (
                      <tr key={product.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt=""
                                style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                              />
                            )}
                            <strong>{product.name}</strong>
                          </div>
                        </td>
                        <td>${parseFloat(product.price).toFixed(2)}</td>
                        <td>
                          <span className={'stock-badge ' + stockClass}>
                            {product.stock_quantity}
                          </span>
                        </td>
                        <td>{product.category_name || '—'}</td>
                        <td>{product.is_active ? '✅ Active' : '❌ Hidden'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleEdit(product)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(product.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== ORDERS TAB ==================== */}
      {activeTab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No orders yet</h3>
              <p>Orders containing your products will appear here</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Your Revenue</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(function (order) {
                    return (
                      <tr key={order.id}>
                        <td><strong>{order.order_number}</strong></td>
                        <td>{order.first_name} {order.last_name}</td>
                        <td>${parseFloat(order.merchant_total || 0).toFixed(2)}</td>
                        <td>
                          <span className={'status-badge status-' + order.status}>
                            {order.status}
                          </span>
                        </td>
                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
                        <td>
                          <select
                            className="form-control"
                            value={order.status}
                            style={{ maxWidth: 150 }}
                            onChange={(e) => handleOrderStatus(order.id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
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
      )}
    </div>
  );
}

export default MerchantPage;