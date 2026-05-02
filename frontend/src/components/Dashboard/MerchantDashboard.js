import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Loading from '../Common/Loading';
import Alert from '../Common/Alert';

const MerchantDashboard = () => {
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
    name: '', description: '', price: '', compare_at_price: '',
    stock_quantity: '', category_id: '', sku: '', image_url: '',
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
    } catch (err) { /* silent */ }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...productForm,
        price: parseFloat(productForm.price),
        compare_at_price: productForm.compare_at_price ? parseFloat(productForm.compare_at_price) : null,
        stock_quantity: parseInt(productForm.stock_quantity),
        category_id: productForm.category_id ? parseInt(productForm.category_id) : null,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, data);
      } else {
        await api.post('/products', data);
      }

      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ name: '', description: '', price: '', compare_at_price: '', stock_quantity: '', category_id: '', sku: '', image_url: '' });
      fetchProducts();
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      compare_at_price: product.compare_at_price || '',
      stock_quantity: product.stock_quantity,
      category_id: product.category_id || '',
      sku: product.sku || '',
      image_url: product.image_url || '',
    });
    setShowProductForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
      fetchDashboard();
    } catch (err) {
      setError('Failed to delete product');
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/merchant/orders/${orderId}/status`, { status });
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
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="tabs">
        {['overview', 'products', 'orders'].map(tab => (
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
                {dashboard.low_stock_products.map(p => (
                  <div key={p.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                    {p.name} — <strong>{p.stock_quantity}</strong> left
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'products' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={() => {
              setEditingProduct(null);
              setProductForm({ name: '', description: '', price: '', compare_at_price: '', stock_quantity: '', category_id: '', sku: '', image_url: '' });
              setShowProductForm(!showProductForm);
            }}>
              {showProductForm ? 'Cancel' : '+ Add Product'}
            </button>
          </div>

          {showProductForm && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-body">
                <h3>{editingProduct ? 'Edit Product' : 'New Product'}</h3>
                <form onSubmit={handleProductSubmit}>
                  <div className="checkout-grid">
                    <div className="form-group">
                      <label>Product Name *</label>
                      <input type="text" className="form-control" required value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>SKU</label>
                      <input type="text" className="form-control" value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea className="form-control" value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                  </div>
                  <div className="checkout-grid">
                    <div className="form-group">
                      <label>Price *</label>
                      <input type="number" step="0.01" className="form-control" required value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Compare at Price</label>
                      <input type="number" step="0.01" className="form-control" value={productForm.compare_at_price}
                        onChange={(e) => setProductForm({ ...productForm, compare_at_price: e.target.value })} />
                    </div>
                  </div>
                  <div className="checkout-grid">
                    <div className="form-group">
                      <label>Stock Quantity *</label>
                      <input type="number" className="form-control" required value={productForm.stock_quantity}
                        onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select className="form-control" value={productForm.category_id}
                        onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Image URL</label>
                    <input type="url" className="form-control" value={productForm.image_url}
                      onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                </form>
              </div>
            </div>
          )}

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
                {products.map(product => (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong></td>
                    <td>${parseFloat(product.price).toFixed(2)}</td>
                    <td>
                      <span className={`stock-badge ${product.stock_quantity === 0 ? 'out-of-stock' : product.stock_quantity <= (product.low_stock_threshold || 10) ? 'low-stock' : 'in-stock'}`}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td>{product.category_name || '—'}</td>
                    <td>{product.is_active ? '✅' : '❌'}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }}
                        onClick={() => handleEdit(product)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(product.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'orders' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Your Revenue</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td><strong>{order.order_number}</strong></td>
                  <td>{order.first_name} {order.last_name}</td>
                  <td>${parseFloat(order.merchant_total || 0).toFixed(2)}</td>
                  <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    <select className="form-control" value={order.status} style={{ maxWidth: 150 }}
                      onChange={(e) => handleOrderStatus(order.id, e.target.value)}>
                      {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map(s => (
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

export default MerchantDashboard;