import React, { createContext, useState, useEffect } from 'react';
import { ApiService } from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const getMe = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await ApiService.getMe();
      // Si es pareja y se quedó sin vínculos, limpiar el selectedPartnerId cacheado
      // (la otra parte cortó el vínculo → evitamos 403 al pedir sus datos)
      if (data?.rol === 'pareja' && !data?.tiene_vinculos) {
        localStorage.removeItem('selectedPartnerId');
        localStorage.removeItem('showUsChat');
      }
      setUser(data);
    } catch (e) {
      // El token existía pero el servidor lo rechazó → la sesión caducó
      if (localStorage.getItem('token')) {
        setSessionExpired(true);
      }
      setUser(null);
      ApiService.logout();
    } finally {
      setLoading(false);
    }
  };

  const clearSessionExpired = () => setSessionExpired(false);

  useEffect(() => {
    getMe();
  }, []);

  const login = async (email, password, role) => {
    await ApiService.login(email, password, role);
    setSessionExpired(false);
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, getMe, sessionExpired, clearSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};
