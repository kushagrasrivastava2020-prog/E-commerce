import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import ProductCard from './ProductCard';
import Alert from '../Common/Alert';

const SkeletonGrid = ({ count = 8 }) => (
  <div className="product-grid">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <div className="skeleton skeleton-image" />
        <div className="skeleton-body">
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line mid" />
        </div>
      </div>
    ))}
  </div>
);

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: '', category_id: '', sort_by: 'newest', page: 1,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      params.append('page', filters.page);
      params.append('limit', 12);

      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/products/categories/list');
      setCategories(response.data.data);
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  if (error) return <Alert type="error" message={error} />;

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="form-control"
          placeholder="Search products..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />

        <select
          className="form-control"
          value={filters.category_id}
          onChange={(e) => handleFilterChange('category_id', e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name} ({cat.product_count})</option>
          ))}
        </select>

        <select
          className="form-control"
          value={filters.sort_by}
          onChange={(e) => handleFilterChange('sort_by', e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {loading ? (
        <SkeletonGrid count={8} />
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No products found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, pagination.page - 2) + i;
                if (pageNum > pagination.totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    className={pagination.page === pageNum ? 'active' : ''}
                    onClick={() => setFilters(p => ({ ...p, page: pageNum }))}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={!pagination.hasNext}
                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductList;