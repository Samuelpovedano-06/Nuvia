import React, { createContext, useState, useEffect } from 'react';
import { ApiService } from '../api';

export const AuthContext = createContext();

const RECORDS_LOCAL_KEYS = {
  esquivar_compresas: 'nuvia_esquivar_record',
  sky_jump: 'nuvia_skyjump_record',
};

async function syncRecordsToLocal() {
  try {
    const records = await ApiService.getRecordsJuego();
    if (!records || typeof records !== 'object') return;
    for (const [juego, puntos] of Object.entries(records)) {
      const key = RECORDS_LOCAL_KEYS[juego];
      if (!key) continue;
      const enLocal = Number(localStorage.getItem(key) || 0);
      if (Number(puntos) > enLocal) {
        localStorage.setItem(key, String(puntos));
      }
    }
  } catch (_) {}
}

function getCachedUser() {
  try {
    const raw = localStorage.getItem('nuvia_user_cache');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const AuthProvider = ({ children }) => {
  const cachedUser = getCachedUser();

  // Si hay token + usuario cacheado: arrancar sesión inmediatamente sin spinner
  const [user, setUser] = useState(cachedUser && localStorage.getItem('token') ? cachedUser : null);
  const [loading, setLoading] = useState(!(cachedUser && localStorage.getItem('token')));
  const [sessionExpired] = useState(false);

  const setUserAndCache = (data) => {
    if (data) {
      localStorage.setItem('nuvia_user_cache', JSON.stringify(data));
    } else {
      localStorage.removeItem('nuvia_user_cache');
    }
    setUser(data);
  };

  const getMe = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUserAndCache(null);
      setLoading(false);
      return;
    }

    try {
      const data = await ApiService.getMe();
      if (data?.rol === 'pareja' && !data?.tiene_vinculos) {
        localStorage.removeItem('selectedPartnerId');
        localStorage.removeItem('showUsChat');
      }
      setUserAndCache(data);
      syncRecordsToLocal();
    } catch (e) {
      // Cualquier error (red, servidor, token) → conservar sesión, nunca cerrar automáticamente
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
    await getMe();
  };

  const register = async (nombre, email, password, role, fecha_nacimiento) => {
    await ApiService.register(nombre, email, password, role, fecha_nacimiento);
    await login(email, password, role);
  };

  const logout = () => {
    ApiService.logout();
    setUserAndCache(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getMe, sessionExpired, clearSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};
