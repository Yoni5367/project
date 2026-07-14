import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, tokenHelper } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load — restore session from saved token
  useEffect(() => {
    const restore = async () => {
      const token = tokenHelper.get();
      if (!token) { setLoading(false); return; }
      try {
        const { user } = await authAPI.me();
        setUser(user);
      } catch {
        tokenHelper.remove(); // Token expired or invalid
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (email, password) => {
    const { user, token } = await authAPI.login({ email, password });
    tokenHelper.set(token);
    setUser(user);
    return user;
  };

  const register = async (formData) => {
    const { user, token } = await authAPI.register(formData);
    tokenHelper.set(token);
    setUser(user);
    return user;
  };

  const logout = () => {
    tokenHelper.remove();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { user } = await authAPI.me();
      setUser(user);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
