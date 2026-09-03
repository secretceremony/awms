import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { hasPermission, type PermissionCapability } from '../utils/permissions.js';

interface ProtectedRouteProps {
  requiredPermission?: PermissionCapability;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading application session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(user?.role, requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
