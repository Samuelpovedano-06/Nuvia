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

  getLogs: async () => {
    const res = await fetch(`${baseUrl}/admin/logs`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
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

  enviarMensaje: async (idReceptor, contenido, imagenData = null) => {
    const res = await fetch(`${baseUrl}/chat/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id_receptor: idReceptor, contenido, imagen_data: imagenData })
    });
    if (!res.ok) {
      let detail = 'Error al enviar mensaje';
      try { const j = await res.json(); detail = j.detail || detail; } catch {}
      throw new Error(detail);
    }
    return await res.json();
  },

  imagenChatUrl: (id) => `${baseUrl}/chat/imagen/${id}`,
  imagenForoUrl: (id) => `${baseUrl}/foro/${id}/imagen`,

  compartirPublicacion: async (idReceptor, idPublicacion) => {
    const res = await fetch(`${baseUrl}/chat/compartir-publicacion`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id_receptor: idReceptor, id_publicacion: idPublicacion })
    });
    if (!res.ok) {
      let detail = 'Error al compartir';
      try { const j = await res.json(); detail = j.detail || detail; } catch {}
      throw new Error(detail);
    }
    return await res.json();
  },

  // Foro
  getPublicaciones: async ({ tab = 'popular', categoria = null, page = 1 } = {}) => {
    let url = `${baseUrl}/foro/?tab=${tab}&page=${page}`;
    if (categoria) url += `&categoria=${categoria}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },

  crearPublicacion: async (contenido, imagenData = null) => {
    const res = await fetch(`${baseUrl}/foro/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ contenido, imagen_data: imagenData })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al publicar');
    return data;
  },

  eliminarPublicacion: async (id) => {
    await fetch(`${baseUrl}/foro/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  toggleLikeForo: async (id) => {
    const res = await fetch(`${baseUrl}/foro/${id}/like`, { method: 'POST', headers: getHeaders() });
    return await res.json();
  },

  toggleFavoritoForo: async (id) => {
    const res = await fetch(`${baseUrl}/foro/${id}/favorito`, { method: 'POST', headers: getHeaders() });
    return await res.json();
  },

  toggleReaccionForo: async (id, emoji) => {
    const res = await fetch(`${baseUrl}/foro/${id}/reaccion`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ emoji })
    });
    return await res.json();
  },

  getRespuestas: async (id) => {
    const res = await fetch(`${baseUrl}/foro/${id}/respuestas`, { headers: getHeaders() });
    if (res.status === 404) throw new Error('404');
    if (!res.ok) return [];
    return await res.json();
  },

  crearRespuesta: async (id, contenido, imagenData = null) => {
    const res = await fetch(`${baseUrl}/foro/${id}/respuestas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ contenido, imagen_data: imagenData })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al responder');
    return data;
  },

  imagenRespuestaForoUrl: (id) => `${baseUrl}/foro/respuestas/${id}/imagen`,

  eliminarRespuesta: async (id) => {
    await fetch(`${baseUrl}/foro/respuestas/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  // ─────────── Consejos ───────────
  getClasificacionesConsejo: async (incluirInactivas = false) => {
    const url = `${baseUrl}/consejos/clasificaciones${incluirInactivas ? '?incluir_inactivas=true' : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },
  crearClasificacionConsejo: async (datos) => {
    const res = await fetch(`${baseUrl}/consejos/clasificaciones`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(datos) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  actualizarClasificacionConsejo: async (id, datos) => {
    const res = await fetch(`${baseUrl}/consejos/clasificaciones/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(datos) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  eliminarClasificacionConsejo: async (id) => {
    const res = await fetch(`${baseUrl}/consejos/clasificaciones/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Error al eliminar');
  },

  getEtiquetasConsejo: async (incluirInactivas = false) => {
    const url = `${baseUrl}/consejos/etiquetas${incluirInactivas ? '?incluir_inactivas=true' : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },
  crearEtiquetaConsejo: async (nombre) => {
    const res = await fetch(`${baseUrl}/consejos/etiquetas`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ nombre }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  actualizarEtiquetaConsejo: async (id, datos) => {
    const res = await fetch(`${baseUrl}/consejos/etiquetas/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(datos) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  eliminarEtiquetaConsejo: async (id) => {
    const res = await fetch(`${baseUrl}/consejos/etiquetas/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Error al eliminar');
  },

  getArticulosConsejo: async ({ clasificacion, etiqueta, favoritos, incluirInactivos } = {}) => {
    const params = new URLSearchParams();
    if (clasificacion) params.append('clasificacion', clasificacion);
    if (etiqueta) params.append('etiqueta', etiqueta);
    if (favoritos) params.append('favoritos', 'true');
    if (incluirInactivos) params.append('incluir_inactivos', 'true');
    const res = await fetch(`${baseUrl}/consejos/articulos?${params}`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },
  getArticuloConsejo: async (id) => {
    const res = await fetch(`${baseUrl}/consejos/articulos/${id}`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  crearArticuloConsejo: async (datos) => {
    const res = await fetch(`${baseUrl}/consejos/articulos`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(datos) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  actualizarArticuloConsejo: async (id, datos) => {
    const res = await fetch(`${baseUrl}/consejos/articulos/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(datos) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  eliminarArticuloConsejo: async (id) => {
    const res = await fetch(`${baseUrl}/consejos/articulos/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Error al eliminar');
  },
  regenerarImagenArticuloConsejo: async (id, prompt = null) => {
    const url = `${baseUrl}/consejos/articulos/${id}/regenerar-imagen${prompt ? `?prompt=${encodeURIComponent(prompt)}` : ''}`;
    const res = await fetch(url, { method: 'POST', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'No se pudo regenerar');
    return data;
  },

  previewImagenArticuloConsejo: async (id, prompt = null) => {
    const url = `${baseUrl}/consejos/articulos/${id}/preview-imagen${prompt ? `?prompt=${encodeURIComponent(prompt)}` : ''}`;
    const res = await fetch(url, { method: 'POST', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'No se pudo generar la vista previa');
    return data;
  },
  toggleFavoritoConsejo: async (id) => {
    const res = await fetch(`${baseUrl}/consejos/articulos/${id}/favorito`, { method: 'POST', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  imagenArticuloConsejoUrl: (id, version) => `${baseUrl}/consejos/articulos/${id}/imagen${version ? `?v=${version}` : ''}`,

  seedConsejosDemo: async ({ generar_imagenes = false, sobreescribir = false } = {}) => {
    const params = new URLSearchParams();
    if (generar_imagenes) params.append('generar_imagenes', 'true');
    if (sobreescribir) params.append('sobreescribir', 'true');
    const res = await fetch(`${baseUrl}/consejos/seed-demo?${params}`, { method: 'POST', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al sembrar');
    return data;
  },

  toggleSeguirForo: async (idUsuaria) => {
    const res = await fetch(`${baseUrl}/foro/seguir/${idUsuaria}`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try { const j = await res.json(); detail = j.detail || detail; } catch {}
      throw new Error(detail);
    }
    return await res.json();
  },

  toggleBloqueoForo: async (idUsuaria) => {
    const res = await fetch(`${baseUrl}/foro/bloquear/${idUsuaria}`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try { const j = await res.json(); detail = j.detail || detail; } catch {}
      throw new Error(detail);
    }
    return await res.json();
  },

  getBloqueadosForo: async () => {
    const res = await fetch(`${baseUrl}/foro/mis/bloqueados`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },

  // ─── Reportes / Banes / Avisos ───
  reportarPublicacion: async (id, motivo = '') => {
    const res = await fetch(`${baseUrl}/foro/${id}/reportar`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ motivo })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al reportar');
    return data;
  },

  adminReportesCount: async () => {
    const res = await fetch(`${baseUrl}/foro/admin/reportes/count`, { headers: getHeaders() });
    if (!res.ok) return { pendientes: 0 };
    return await res.json();
  },
  adminReportesListar: async (estado = 'pendiente') => {
    const res = await fetch(`${baseUrl}/foro/admin/reportes?estado=${estado}`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },
  adminReporteDetalle: async (id) => {
    const res = await fetch(`${baseUrl}/foro/admin/reportes/${id}`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  adminResolverEliminar: async (id, motivos, motivo_personalizado = '') => {
    const res = await fetch(`${baseUrl}/foro/admin/reportes/${id}/eliminar`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ motivos, motivo_personalizado })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  adminResolverAnular: async (id) => {
    const res = await fetch(`${baseUrl}/foro/admin/reportes/${id}/anular`, { method: 'POST', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  adminBanear: async (idUsuaria, motivos, motivo_personalizado = '', duracion_dias = null, id_reporte = null) => {
    const res = await fetch(`${baseUrl}/foro/admin/banear/${idUsuaria}`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ motivos, motivo_personalizado, duracion_dias, id_reporte })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },

  getMiBaneActivo: async () => {
    const res = await fetch(`${baseUrl}/foro/mis/bane-activo`, { headers: getHeaders() });
    if (!res.ok) return null;
    return await res.json();
  },
  adminDesbanear: async (idUsuaria) => {
    const res = await fetch(`${baseUrl}/foro/admin/desbanear/${idUsuaria}`, { method: 'POST', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    return data;
  },
  getMotivosForo: async () => {
    const res = await fetch(`${baseUrl}/foro/admin/motivos`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },
  getMisAvisosForo: async () => {
    const res = await fetch(`${baseUrl}/foro/mis/avisos`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  },
  marcarAvisoVistoForo: async (tipo, id) => {
    await fetch(`${baseUrl}/foro/mis/avisos/marcar-visto`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ tipo, id })
    });
  },

  // ─── Push notifications ───
  getVapidPublicKey: async () => {
    const res = await fetch(`${baseUrl}/notifications/vapid-public-key`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.key || null;
  },
  registerPushDevice: async (plataforma, token) => {
    const res = await fetch(`${baseUrl}/notifications/register-device`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ plataforma, token })
    });
    if (!res.ok) throw new Error('Error al registrar dispositivo');
    return await res.json();
  },
  unregisterPushDevice: async (plataforma, token) => {
    await fetch(`${baseUrl}/notifications/unregister-device`, {
      method: 'DELETE', headers: getHeaders(),
      body: JSON.stringify({ plataforma, token })
    });
  },
  testPush: async () => {
    const res = await fetch(`${baseUrl}/notifications/test`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Error al enviar prueba');
    return await res.json();
  },
};
