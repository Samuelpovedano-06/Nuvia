// API base logic migrated from api_service.dart
//const baseUrl = 'https://engineer-pig-municipal-mumbai.trycloudflare.com';
const baseUrl = import.meta.env.VITE_API_URL;
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
  login: async (email, password, role) => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, plataforma: role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al iniciar sesión');
    if (data.error) throw new Error(data.error);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('plataforma', role || 'usuaria');
    return data;
  },

  register: async (nombre, email, password, role, fecha_nacimiento) => {
    const res = await fetch(`${baseUrl}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, rol: role, fecha_nacimiento })
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

  getAdminStats: async () => {
    const res = await fetch(`${baseUrl}/admin/stats`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al obtener estadísticas');
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
  
  exportData: async () => {
    const res = await fetch(`${baseUrl}/admin/export`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al exportar datos');
    return await res.blob();
  },

  getSystemConfig: async () => {
    const res = await fetch(`${baseUrl}/admin/config`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al obtener configuración del sistema');
    return data;
  },

  updateSystemConfig: async (datos) => {
    const res = await fetch(`${baseUrl}/admin/config`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al actualizar configuración del sistema');
    return data;
  },

  getPublicStatus: async () => {
    const res = await fetch(`${baseUrl}/admin/status/public?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return { modo_mantenimiento: false };
    const data = await res.json();
    console.log('[Nuvia] getPublicStatus:', data);
    return data;
  },

  // Ciclos
  getCiclos: async (targetId = null) => {
    const url = targetId ? `${baseUrl}/ciclos/?id_usuaria=${targetId}` : `${baseUrl}/ciclos/`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener ciclos');
    return await res.json();
  },

  crearCiclo: async (datos, targetId = null) => {
    const url = targetId ? `${baseUrl}/ciclos/?id_usuaria=${targetId}` : `${baseUrl}/ciclos/`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al crear ciclo');
    return data;
  },

  actualizarCiclo: async (id, datos) => {
    // Nota: El backend ya maneja el permiso de pareja por el id del ciclo
    const res = await fetch(`${baseUrl}/ciclos/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al actualizar ciclo');
    return data;
  },

  // Síntomas
  getSintomas: async () => {
    const res = await fetch(`${baseUrl}/sintomas`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener síntomas');
    return await res.json();
  },

  getRegistrosSintomas: async (fecha = null, targetId = null) => {
    let url = fecha ? `${baseUrl}/registros-sintomas/${fecha}` : `${baseUrl}/registros-sintomas`;
    if (targetId) url += `${url.includes('?') ? '&' : '?'}id_usuaria=${targetId}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return [];
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
  getPrediccion: async (targetId = null) => {
    const url = targetId ? `${baseUrl}/predicciones/?id_usuaria=${targetId}` : `${baseUrl}/predicciones/`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('No hay predicciones disponibles');
    return await res.json();
  },

  // Registros Diarios (Notas, Flujo, Relaciones)
  getRegistroDiario: async (fecha, targetId = null) => {
    let url = `${baseUrl}/registros-diarios?fecha=${fecha}`;
    if (targetId) url += `&id_usuaria=${targetId}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return { notas: '', flujo: '', relaciones: 0 };
    const arr = await res.json();
    return arr[0] || { notas: '', flujo: '', relaciones: 0 };
  },

  getRegistrosDiarios: async (targetId = null) => {
    const url = targetId ? `${baseUrl}/registros-diarios?id_usuaria=${targetId}` : `${baseUrl}/registros-diarios`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },

  registrarDatoDiario: async (datos) => {
    const res = await fetch(`${baseUrl}/registros-diarios`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(datos)
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try { const err = await res.json(); detail += ': ' + (err.detail || JSON.stringify(err)); } catch {}
      throw new Error(detail);
    }
    return await res.json();
  },

  // Configuración
  getConfig: async (targetId = null) => {
    const url = targetId ? `${baseUrl}/configuracion/?id_usuaria=${targetId}` : `${baseUrl}/configuracion/`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener configuración');
    return await res.json();
  },

  updateConfig: async (datos) => {
    const res = await fetch(`${baseUrl}/configuracion/`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al actualizar configuración');
    if (data.error) throw new Error(data.error);
    return data;
  },

  getParejas: async () => {
    const vista = localStorage.getItem('plataforma') || 'usuaria';
    const res = await fetch(`${baseUrl}/parejas/?vista=${vista}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener parejas');
    return await res.json();
  },

  desvincularPareja: async (vinculoId) => {
    const res = await fetch(`${baseUrl}/parejas/${vinculoId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al desvincular');
  },

  aceptarPareja: async () => {
    const res = await fetch(`${baseUrl}/configuracion/aceptar-pareja`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  rechazarPareja: async () => {
    const res = await fetch(`${baseUrl}/configuracion/rechazar-pareja`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  limpiarRechazo: async () => {
    const res = await fetch(`${baseUrl}/configuracion/limpiar-rechazo`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    return data;
  },

  // Chat
  getMensajes: async (idPareja) => {
    const res = await fetch(`${baseUrl}/chat/${idPareja}`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },

  enviarMensaje: async (idReceptor, contenido) => {
    const res = await fetch(`${baseUrl}/chat/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id_receptor: idReceptor, contenido })
    });
    if (!res.ok) throw new Error('Error al enviar mensaje');
    return await res.json();
  }
};
