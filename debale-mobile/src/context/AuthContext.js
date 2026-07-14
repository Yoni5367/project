import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, tokenHelper } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    const restore = async () => {
      const token = await tokenHelper.get();
      if (!token) { setLoading(false); return; }
      try {
        const { user } = await authAPI.me();
        setUser(user);
      } catch {
        await tokenHelper.remove();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (email, password) => {
    const { user, token } = await authAPI.login({ email, password });
    await tokenHelper.set(token);
    setUser(user);
    return user;
  };

  const register = async (formData) => {
    const { user, token } = await authAPI.register(formData);
    await tokenHelper.set(token);
    setJustRegistered(true);
    setUser(user);
    return user;
  };

  const clearJustRegistered = () => setJustRegistered(false);

  const logout = async () => {
    await tokenHelper.remove();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { user } = await authAPI.me();
      setUser(user);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, refreshUser, setUser,
      justRegistered, clearJustRegistered,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
