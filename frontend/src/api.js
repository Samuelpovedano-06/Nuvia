// API base logic migrated from api_service.dart
const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Fallback to local for development

// Helper para obtener token
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const ApiService = {
  // Auth
  login: async (email, password) => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al iniciar sesión');
    localStorage.setItem('token', data.access_token);
    return data;
  },

  register: async (nombre, email, password) => {
    const res = await fetch(`${baseUrl}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al registrarse');
    return data;
  },

  getMe: async () => {
    const res = await fetch(`${baseUrl}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Sesión expirada');
    return await res.json();
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  // Ciclos
  getCiclos: async () => {
    const res = await fetch(`${baseUrl}/ciclos/`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener ciclos');
    return await res.json();
  },

  crearCiclo: async (datos) => {
    const res = await fetch(`${baseUrl}/ciclos/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al crear ciclo');
    return data;
  },

  // Síntomas
  getSintomas: async () => {
    const res = await fetch(`${baseUrl}/sintomas`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener síntomas');
    return await res.json();
  },

  // Predicciones
  getPrediccion: async () => {
    const res = await fetch(`${baseUrl}/predicciones/`, { headers: getHeaders() });
    if (!res.ok) throw new Error('No hay predicciones disponibles');
    return await res.json();
  }
};
