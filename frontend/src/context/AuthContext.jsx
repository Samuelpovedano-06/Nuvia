import React, { createContext, useState, useEffect } from 'react';
import { ApiService } from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const data = await ApiService.getMe();
      setUser(data);
    } catch (e) {
      setUser(null);
      // No logueamos el error si es un simple 401
      if (e.message !== 'Sesión expirada') {
         console.error("Auth check failed:", e.message);
      }
      ApiService.logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    await ApiService.login(email, password);
    await checkAuth();
  };

  const register = async (nombre, email, password) => {
    await ApiService.register(nombre, email, password);
  };

  const logout = () => {
    ApiService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
