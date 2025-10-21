// src/auth/AuthContext.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from './api';

type AuthState = {
  isAuthenticated: boolean;
  loading: boolean;
  user?: any;
};

type AuthContextType = AuthState & {
  loginWithToken: (token?: string) => void;
  logout: () => void;
  verifyAuth: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);
const res = await fetch(apiUrl('/api/me'), {
  method: 'GET',
  credentials: 'include',
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(() => {
    return Boolean(localStorage.getItem('authToken'));
  });
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const loginWithToken = (token?: string) => {
    if (token) localStorage.setItem('authToken', token);
    setIsAuthenticated(true);
    setLoading(false);
    navigate('/');
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    // if you use cookie-session, call backend logout to expire cookie:
    fetch('http://127.0.0.1:5000/api/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setIsAuthenticated(false);
    setUser(null);
    navigate('/auth');
  };

  // verify either cookie session or token on mount
  const verifyAuth = React.useCallback(async () => {
    setLoading(true);
    // Try cookie-based verification first
    try {
      const res = await fetch('http://127.0.0.1:5000/api/me', {
        method: 'GET',
        credentials: 'include', // important for HttpOnly cookie
      });
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setUser(data.user ?? null);
        setLoading(false);
        return;
      }
    } catch {
      // ignore and fall through to token-based check
    }

    // Fallback: token-based verify
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const res2 = await fetch('http://127.0.0.1:5000/api/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        if (res2.ok) {
          const d = await res2.json();
          setIsAuthenticated(true);
          setUser(d.user ?? null);
          setLoading(false);
          return;
        } else {
          localStorage.removeItem('authToken');
        }
      } catch {
        localStorage.removeItem('authToken');
      }
    }

    setIsAuthenticated(false);
    setUser(null);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, user, loginWithToken, logout, verifyAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
