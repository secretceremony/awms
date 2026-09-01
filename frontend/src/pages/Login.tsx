import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import './Login.css';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoadingForm(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoadingForm(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-form-side">
        <div className="login-form-container">
          <div className="login-logo-header">
            <div className="logo-icon-cube">A</div>
            <h1>ALSSA WMS</h1>
            <p>Warehouse Management System</p>
          </div>

          {error && (
            <div className="login-error-alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="e.g. admin.logistics@alssa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={isLoadingForm} className="btn-submit-login">
              {isLoadingForm ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer-info">
            <p>Authorized personnel only. Sessions are monitored.</p>
          </div>
        </div>
      </div>
      <div className="login-branding-side">
        <div className="branding-content">
          <div className="branding-logo-box">A</div>
          <h2>ALSSA</h2>
          <p className="branding-subtitle">LOGISTICS &amp; SUPPLY CHAIN</p>
          <div className="branding-accent-line" />
          <p className="branding-description">
            Secure enterprise warehouse administration system. Monitor movements, audit logs, and manage delivery orders dynamically.
          </p>
        </div>
      </div>
    </div>
  );
};
