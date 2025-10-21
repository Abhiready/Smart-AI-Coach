// src/auth/PrivateRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
// AuthContext lives in src/AuthContext.tsx, so go up one level from src/auth
import { useAuth } from './AuthContext';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
