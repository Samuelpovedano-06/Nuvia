// API base logic migrated from api_service.dart
const baseUrl = 'https://nuvia-production.up.railway.app'; // Railway backend URL

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

  // Password Reset
  forgotPassword: async (email) => {
    const res = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al solicitar recuperación');
    return data;
  },

  verifyOtp: async (email, otp) => {
    const res = await fetch(`${baseUrl}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Código inválido');
    return data;
  },

  resetPassword: async (email, otp, nueva_password) => {
    const res = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, nueva_password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al cambiar contraseña');
    return data;
  },

  // Admin
  getUsers: async () => {
    const res = await fetch(`${baseUrl}/admin/users`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al obtener usuarios');
    return data;
  },

  createUserAdmin: async (userData) => {
    const res = await fetch(`${baseUrl}/admin/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al crear usuario');
    return data;
  },

  updateUserAdmin: async (id, userData) => {
    const res = await fetch(`${baseUrl}/admin/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al actualizar usuario');
    return data;
  },

  deleteUserAdmin: async (id) => {
    const res = await fetch(`${baseUrl}/admin/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Error al eliminar usuario');
    }
    return true;
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

  registrarSintoma: async (datos) => {
    const res = await fetch(`${baseUrl}/registros-sintomas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al registrar síntoma');
    return data;
  },

  // Predicciones
  getPrediccion: async () => {
    const res = await fetch(`${baseUrl}/predicciones/`, { headers: getHeaders() });
    if (!res.ok) throw new Error('No hay predicciones disponibles');
    return await res.json();
  }
};
