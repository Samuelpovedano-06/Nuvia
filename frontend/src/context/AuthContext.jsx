import React, { createContext, useState, useEffect } from 'react';
import { ApiService } from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getMe = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await ApiService.getMe();
      setUser(data);
    } catch (e) {
      setUser(null);
      ApiService.logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMe();
  }, []);

  const login = async (email, password, role) => {
    await ApiService.login(email, password, role);
    await getMe();
  };

  const register = async (nombre, email, password, role, fecha_nacimiento) => {
    await ApiService.register(nombre, email, password, role, fecha_nacimiento);
    await login(email, password, role);
  };

  const logout = () => {
    ApiService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getMe }}>
      {children}
    </AuthContext.Provider>
  );
};
