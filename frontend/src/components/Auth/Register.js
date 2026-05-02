import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Alert from '../Common/Alert';

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', password: '', role: 'user',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create Account</h2>
        <Alert type="error" message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit}>
          <div className="checkout-grid">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" name="first_name" className="form-control"
                value={formData.first_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" name="last_name" className="form-control"
                value={formData.last_name} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" className="form-control"
              value={formData.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Password (min 8 chars, include a number)</label>
            <input type="password" name="password" className="form-control"
              value={formData.password} onChange={handleChange} required minLength={8} />
          </div>

          <div className="form-group">
            <label>Account Type</label>
            <select name="role" className="form-control" value={formData.role} onChange={handleChange}>
              <option value="user">Buyer</option>
              <option value="merchant">Merchant (Sell products)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;