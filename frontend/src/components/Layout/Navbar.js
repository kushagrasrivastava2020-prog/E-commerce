import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (user) {
      api.get('/cart')
        .then(res => setCartCount(res.data.data.item_count || 0))
        .catch(() => {});
    } else {
      setCartCount(0);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">🛒 ShopHub</Link>

        <div className="navbar-links">
          <Link to="/">Products</Link>

          {user ? (
            <>
              <Link to="/cart">
                Cart
                {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
              </Link>
              <Link to="/orders">Orders</Link>

              {user.role === 'merchant' && (
                <Link to="/merchant">
                  Dashboard
                  <span className="nav-role-badge merchant">M</span>
                </Link>
              )}

              {user.role === 'admin' && (
                <Link to="/admin">
                  Admin
                  <span className="nav-role-badge admin">A</span>
                </Link>
              )}

              <Link to="/profile">{user.first_name}</Link>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">
                <button className="btn btn-primary btn-sm">Sign Up</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;