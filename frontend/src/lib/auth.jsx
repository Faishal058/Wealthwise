import { createContext, useContext, useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8081';
const API_HOST = (() => {
  try {
    return new URL(API).host;
  } catch {
    return 'the backend';
  }
})();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ww_token'));
  const [loading, setLoading] = useState(true);

  /* On mount, restore session from localStorage */
  useEffect(() => {
    const saved = localStorage.getItem('ww_user');
    const savedToken = localStorage.getItem('ww_token');
    if (saved && savedToken) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  function persist(userData, jwtToken) {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('ww_user', JSON.stringify(userData));
    localStorage.setItem('ww_token', jwtToken);
  }

  function clear() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ww_user');
    localStorage.removeItem('ww_token');
  }

  async function signUp(email, password, fullName) {
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json();
      if (!res.ok) return { error: { message: data.message || 'Signup failed' } };
      persist(data.user, data.token);
      return { error: null };
    } catch (err) {
      return { error: { message: `Cannot connect to server. Make sure the backend is running at ${API_HOST}.` } };
    }
  }

  async function signInWithPassword(email, password) {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: { message: data.message || 'Login failed' } };
      persist(data.user, data.token);
      return { error: null };
    } catch (err) {
      return { error: { message: `Cannot connect to server. Make sure the backend is running at ${API_HOST}.` } };
    }
  }

  async function signOut() {
    clear();
  }

  const value = {
    user,
    token,
    loading,
    signUp,
    signInWithPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
