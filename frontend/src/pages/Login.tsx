import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { FormField, Input, Button } from '../components/ui/index.js';
import logisticsIllustration from '../assets/logistics-illustration.svg';

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
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoadingForm(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Left Form Area */}
      <div className="login-form-side">
        <div className="login-form-container">
          <div className="login-logo-header">
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-navy)', letterSpacing: '-0.02em', margin: 0 }}>
              AWMS
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Enterprise Warehouse Management System
            </p>
          </div>

          {error && (
            <div className="login-error-alert" style={{ marginBottom: '1.25rem' }}>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <FormField label="Email Address" required>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </FormField>

            <FormField label="Password" required>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormField>

            <div style={{ marginTop: '0.75rem' }}>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoadingForm}
                style={{ width: '100%', justifyContent: 'center', height: '42px', fontSize: '0.95rem' }}
              >
                Sign In to AWMS
              </Button>
            </div>
          </form>

          <div className="login-footer-info" style={{ marginTop: '2rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: 0 }}>
              Authorized internal access only. All actions are logged and audited.
            </p>
          </div>
        </div>
      </div>

      {/* Right Visual / Illustration Area */}
      <div className="login-branding-side">
        <div className="branding-content" style={{ textAlign: 'center', maxWidth: '480px' }}>
          <img
            src={logisticsIllustration}
            alt="Logistics and Warehouse System Illustration"
            style={{ width: '100%', maxHeight: '340px', objectFit: 'contain', marginBottom: '1.5rem' }}
          />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 0.5rem 0' }}>
            Smart Logistics &amp; Inventory Control
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            Unified real-time stock balances, serialized asset tracking, warehouse routing, and delivery management in one platform.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
