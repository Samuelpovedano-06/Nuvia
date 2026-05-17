import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';
import {
  ChevronLeft, Users, Trash2, Edit, UserPlus, X, Save, Eye, EyeOff, Search, Shield, Heart, AlertTriangle,
  Activity, Lightbulb, Droplets, Lock, Ban, ShieldOff
} from 'lucide-react';

export default function AdminUsersScreen() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: 'usuaria' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [banesInfo, setBanesInfo] = useState(null); // { total_banes, activo, historial }
  const [loadingBanes, setLoadingBanes] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Estado del modal de banear
  const [showBanModal, setShowBanModal] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const [motivosBan, setMotivosBan] = useState([]); // [{clave, etiqueta}]
  const [motivosSeleccionados, setMotivosSeleccionados] = useState([]);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [duracionDias, setDuracionDias] = useState('');
  const [submittingBan, setSubmittingBan] = useState(false);
  const [errorBan, setErrorBan] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (user && user.rol !== 'admin') {
      navigate('/');
    } else {
      fetchUsers();
    }
  }, [user, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Error al cargar usuarias');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (u = null) => {
    if (u) {
      setEditingUser(u);
      setFormData({ nombre: u.nombre, email: u.email, password: '', rol: u.rol });
    } else {
      setEditingUser(null);
      setFormData({ nombre: '', email: '', password: '', rol: 'usuaria' });
    }
    setShowModal(true);
    setShowPassword(false);
    setError('');
  };

  const handleOpenViewModal = async (u) => {
    setViewingUser(u);
    setShowViewModal(true);
    setBanesInfo(null);
    setLoadingBanes(true);
    try {
      const data = await ApiService.getBanesUsuaria(u.id_usuaria);
      setBanesInfo(data);
    } catch (_) {} finally {
      setLoadingBanes(false);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingUser) {
        await ApiService.updateUserAdmin(editingUser.id_usuaria, formData);
      } else {
        await ApiService.createUserAdmin(formData);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (u) => {
    setUserToDelete(u);
    setShowDeleteModal(true);
  };

  const handleOpenBanModal = async (u) => {
    setUserToBan(u);
    setMotivosSeleccionados([]);
    setMotivoPersonalizado('');
    setDuracionDias('');
    setErrorBan('');
    setShowBanModal(true);
    if (motivosBan.length === 0) {
      try {
        const data = await ApiService.getMotivosForo();
        setMotivosBan(data || []);
      } catch (_) {}
    }
  };

  const handleDesbanear = async (u) => {
    if (!window.confirm(`¿Desbanear a ${u.nombre}?`)) return;
    try {
      await ApiService.adminDesbanear(u.id_usuaria);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'No se pudo desbanear');
    }
  };

  const confirmBan = async () => {
    if (motivosSeleccionados.length === 0) {
      setErrorBan('Selecciona al menos un motivo');
      return;
    }
    if (motivosSeleccionados.includes('otros') && !motivoPersonalizado.trim()) {
      setErrorBan('Si eliges "Otros" debes escribir el motivo');
      return;
    }
    setSubmittingBan(true);
    setErrorBan('');
    try {
      const dur = duracionDias ? parseInt(duracionDias) : null;
      await ApiService.adminBanear(userToBan.id_usuaria, motivosSeleccionados, motivoPersonalizado.trim(), dur);
      setShowBanModal(false);
      setUserToBan(null);
      fetchUsers();
    } catch (err) {
      setErrorBan(err.message || 'No se pudo banear');
    } finally {
      setSubmittingBan(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setSubmitting(true);
    try {
      await ApiService.deleteUserAdmin(userToDelete.id_usuaria);
      setShowDeleteModal(false);
      fetchUsers();
    } catch (err) {
      alert('No se pudo eliminar la usuaria');
    } finally {
      setSubmitting(false);
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && users.length === 0) {
    return <div className="screen-container" style={{ justifyContent: 'center', alignItems: 'center' }}><div className="loader"></div></div>;
  }

  return (
    <div className="screen-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span>Panel Admin</span>
        </button>
        <button 
          onClick={() => handleOpenModal()}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}
        >
          <UserPlus size={18} /> Nueva Usuaria
        </button>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontSize: '28px', color: 'var(--primary)', margin: 0 }}>Gestión de Usuarias</h2>
        <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '14px' }}>Centro de mando de Nuvia</p>
      </div>

      {/* Search Bar Premium */}
      <div style={{ position: 'relative', marginBottom: '25px' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', background: 'white', borderRadius: '30px', 
          padding: '4px 20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9'
        }}>
          <Search size={20} style={{ color: 'var(--primary)', marginRight: '12px' }} />
          <input 
            type="text" 
            placeholder="Busca por nombre o email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              border: 'none', background: 'none', padding: '12px 0', width: '100%', 
              fontSize: '15px', color: '#1e293b', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Users List */}
      <div style={{ display: 'grid', gap: '12px', paddingBottom: '40px' }}>
        {filteredUsers.map((u, i) => (
          <div key={u.id_usuaria} className="card" style={{ margin: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
              <div style={{
                width: '45px', height: '45px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary) 0%, #F472B6 100%)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px',
                boxShadow: '0 4px 10px rgba(186, 104, 200, 0.15)'
              }}>
                {u.nombre.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nombre}</span>
                  {u.rol === 'admin' && <span style={{ fontSize: '10px', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '10px', textTransform: 'uppercase', flexShrink: 0 }}>Admin</span>}
                  {u.rol === 'pareja' && <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '10px', textTransform: 'uppercase', flexShrink: 0 }}>Pareja</span>}
                  {u.baneado && <span style={{ fontSize: '10px', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '10px', textTransform: 'uppercase', flexShrink: 0 }}>Baneada</span>}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => handleOpenViewModal(u)} title="Ver Resumen" style={{ flex: 1, minWidth: '70px', background: '#f0f9ff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                <Eye size={16} /> Ver
              </button>
              <button onClick={() => handleOpenModal(u)} title="Editar" style={{ flex: 1, minWidth: '70px', background: '#f5f3ff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                <Edit size={16} /> Editar
              </button>
              {u.id_usuaria !== user?.id_usuaria && (
                u.baneado ? (
                  <button onClick={() => handleDesbanear(u)} title="Desbanear" style={{ flex: 1, minWidth: '70px', background: '#dcfce7', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                    <ShieldOff size={16} /> Desbanear
                  </button>
                ) : (
                  <button onClick={() => handleOpenBanModal(u)} title="Banear" style={{ flex: 1, minWidth: '70px', background: '#fff7ed', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                    <Ban size={16} /> Banear
                  </button>
                )
              )}
              {u.id_usuaria !== user?.id_usuaria && (
                <button onClick={() => handleOpenDeleteModal(u)} title="Eliminar" style={{ flex: 1, minWidth: '70px', background: '#fee2e2', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                  <Trash2 size={16} /> Eliminar
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
            No se encontraron usuarias con ese criterio.
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', margin: 0, padding: '24px', animation: 'scaleIn 0.3s ease' }}>
            <div style={{ position: 'relative', marginBottom: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--primary)', textAlign: 'center' }}>{editingUser ? 'Editar Usuaria' : 'Nueva Usuaria'}</h3>
              <button 
                onClick={() => setShowModal(false)} 
                style={{ position: 'absolute', right: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '5px' }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', marginBottom: '8px', fontWeight: '600', color: '#444' }}>
                  <Users size={14} color="var(--primary)" /> Nombre Completo
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="input-field"
                  placeholder="Ej: Ana García"
                  style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px 15px', textAlign: 'center', width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', marginBottom: '8px', fontWeight: '600', color: '#444' }}>
                  <Save size={14} color="var(--primary)" /> Email de acceso
                </label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="input-field"
                  placeholder="ana@ejemplo.com"
                  style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px 15px', textAlign: 'center', width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', marginBottom: '8px', fontWeight: '600', color: '#444' }}>
                  <X size={14} color="var(--primary)" /> {editingUser ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                <input 
                  type="password" 
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="input-field"
                  placeholder={editingUser ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                  style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px 15px', textAlign: 'center', width: '100%' }}
                />
                {editingUser && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px' }}>Por seguridad, las contraseñas actuales no son visibles.</p>}
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', marginBottom: '12px', fontWeight: '600', color: '#444' }}>
                  <Shield size={14} color="var(--primary)" /> Rol en el sistema
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[
                    { id: 'admin', label: 'Admin', icon: <Shield size={16} /> },
                    { id: 'usuaria', label: 'Usuaria', icon: <Users size={16} /> },
                    { id: 'pareja', label: 'Pareja', icon: <Heart size={16} /> }
                  ].map(role => (
                    <div 
                      key={role.id}
                      onClick={() => setFormData({...formData, rol: role.id})}
                      style={{ 
                        padding: '12px 8px', borderRadius: '12px', border: `2px solid ${formData.rol === role.id ? 'var(--primary)' : '#f1f5f9'}`,
                        background: formData.rol === role.id ? '#f5f3ff' : 'white', cursor: 'pointer', textAlign: 'center',
                        transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <div style={{ color: formData.rol === role.id ? 'var(--primary)' : '#64748b' }}>
                        {role.icon}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: formData.rol === role.id ? 'var(--primary)' : '#64748b' }}>
                        {role.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '15px', textAlign: 'center', padding: '10px', background: '#fef2f2', borderRadius: '8px' }}>{error}</div>}

              <button 
                type="submit" 
                disabled={submitting}
                className="btn-primary"
                style={{ width: '100%', padding: '15px', borderRadius: '14px', fontSize: '15px' }}
              >
                {submitting ? 'Guardando cambios...' : (editingUser ? 'Actualizar Usuaria' : 'Crear Nueva Usuaria')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal for View Summary */}
      {showViewModal && viewingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', margin: 0, padding: '24px', animation: 'scaleIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {viewingUser.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Ficha de Usuaria</h3>
                    <span style={{ 
                      fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px',
                      background: viewingUser.estado === 'Activa' ? '#D1FAE5' : (viewingUser.estado === 'Inactiva' ? '#FEE2E2' : '#F3F4F6'),
                      color: viewingUser.estado === 'Activa' ? '#065F46' : (viewingUser.estado === 'Inactiva' ? '#991B1B' : '#374151')
                    }}>
                      {viewingUser.estado}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'capitalize' }}>Rol: {viewingUser.rol}</div>
                </div>
              </div>
              <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '25px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '15px', textAlign: 'center' }}>
                <Users size={18} color="var(--primary)" style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Ciclos</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{viewingUser.total_ciclos || 0}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '15px', textAlign: 'center' }}>
                <Activity size={18} color="#F472B6" style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Síntomas</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{viewingUser.total_sintomas || 0}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '15px', textAlign: 'center' }}>
                <Lightbulb size={18} color="#F59E0B" style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Notas</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{viewingUser.total_notas || 0}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  <Save size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Fecha de registro</div>
                  <div style={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                    {viewingUser.fecha_registro ? new Date(viewingUser.fecha_registro).toLocaleDateString() : 'Desconocida'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  <Eye size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Último acceso</div>
                  <div style={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                    {viewingUser.ultimo_acceso 
                      ? `${new Date(viewingUser.ultimo_acceso).toLocaleDateString()} a las ${new Date(viewingUser.ultimo_acceso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                      : 'Sin actividad registrada'}
                  </div>
                </div>
              </div>
            </div>

            {/* Historial de baneos */}
            <div style={{ marginBottom: '25px', padding: '14px', borderRadius: '14px', background: '#FFF1F2', border: '1px solid rgba(246, 65, 108, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Ban size={16} color="#F6416C" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#F6416C' }}>Historial de baneos</span>
              </div>

              {loadingBanes && (
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Cargando…</div>
              )}

              {!loadingBanes && banesInfo && (
                <>
                  <div style={{ fontSize: '13px', color: '#4a3a4a', marginBottom: '8px' }}>
                    Veces baneada: <strong>{banesInfo.total_banes}</strong>
                  </div>

                  {banesInfo.activo ? (
                    <div style={{
                      background: 'white', borderRadius: '10px', padding: '10px 12px',
                      border: '1px solid rgba(246, 65, 108, 0.25)'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', marginBottom: '4px' }}>
                        Ban activo ahora mismo
                      </div>
                      <div style={{ fontSize: '12px', color: '#4a3a4a', lineHeight: 1.5 }}>
                        Duración: <strong>
                          {banesInfo.activo.permanente
                            ? 'Permanente'
                            : (banesInfo.activo.dias_restantes != null
                                ? `${banesInfo.activo.dias_restantes} ${banesInfo.activo.dias_restantes === 1 ? 'día restante' : 'días restantes'}`
                                : '—')}
                        </strong>
                        {!banesInfo.activo.permanente && banesInfo.activo.fecha_fin && (
                          <span style={{ color: 'var(--text-light)' }}> · hasta {new Date(banesInfo.activo.fecha_fin).toLocaleDateString()}</span>
                        )}
                      </div>
                      {banesInfo.activo.motivos.length > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                          Motivos: {banesInfo.activo.motivos.map(m => m.etiqueta).join(', ')}
                        </div>
                      )}
                      {banesInfo.activo.motivo_personalizado && (
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px', fontStyle: 'italic' }}>
                          "{banesInfo.activo.motivo_personalizado}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontStyle: 'italic' }}>
                      {banesInfo.total_banes === 0
                        ? 'Sin baneos previos.'
                        : 'Sin ban activo en este momento.'}
                    </div>
                  )}

                  {banesInfo.historial.length > 1 && (
                    <details style={{ marginTop: '10px' }}>
                      <summary style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                        Ver historial completo ({banesInfo.historial.length})
                      </summary>
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {banesInfo.historial.map((b, i) => (
                          <div key={b.id} style={{ background: 'white', padding: '8px 10px', borderRadius: '8px', fontSize: '11px', color: '#4a3a4a' }}>
                            <div style={{ fontWeight: 600 }}>
                              #{banesInfo.historial.length - i} · {b.permanente ? 'Permanente' : (b.fecha_fin ? `Hasta ${new Date(b.fecha_fin).toLocaleDateString()}` : '—')}
                              {b.activo && <span style={{ color: '#F6416C', marginLeft: '6px' }}>· activo</span>}
                            </div>
                            <div style={{ color: 'var(--text-light)' }}>
                              {b.fecha_inicio && `Desde ${new Date(b.fecha_inicio).toLocaleDateString()}`}
                              {b.motivos.length > 0 && ` · ${b.motivos.map(m => m.etiqueta).join(', ')}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => { setShowViewModal(false); handleOpenModal(viewingUser); }}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Edit size={18} /> Editar Perfil Completo
            </button>
          </div>
        </div>
      )}

      {/* Modal for Ban */}
      {showBanModal && userToBan && (
        <div
          onClick={() => setShowBanModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(30, 10, 40, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: '100%', maxWidth: '420px', margin: 0, padding: '24px', maxHeight: '90vh', overflowY: 'auto', animation: 'scaleIn 0.3s ease' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: '#FFF1F2', color: '#F6416C',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Ban size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--primary)', fontWeight: 700, flex: 1, minWidth: 0 }}>
                Banear a la usuaria
              </h3>
              <button onClick={() => setShowBanModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', flexShrink: 0, padding: 0 }}>
                <X size={22} />
              </button>
            </div>

            {/* Motivos */}
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700, marginBottom: '10px' }}>
              Motivos del baneo <span style={{ color: '#F6416C' }}>*</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
              {motivosBan.map(m => {
                const sel = motivosSeleccionados.includes(m.clave);
                return (
                  <label
                    key={m.clave}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: '12px',
                      background: sel ? 'rgba(176, 91, 181, 0.12)' : '#F5F1F5',
                      cursor: 'pointer', userSelect: 'none',
                      transition: 'background 0.15s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => {
                        setMotivosSeleccionados(prev =>
                          prev.includes(m.clave) ? prev.filter(x => x !== m.clave) : [...prev, m.clave]
                        );
                      }}
                      style={{
                        width: '18px', height: '18px', flexShrink: 0,
                        accentColor: 'var(--primary)', cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '14px', color: '#4a3a4a', fontWeight: sel ? 600 : 500 }}>
                      {m.etiqueta}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Motivo personalizado si "otros" */}
            {motivosSeleccionados.includes('otros') && (
              <div style={{ marginBottom: '18px' }}>
                <textarea
                  value={motivoPersonalizado}
                  onChange={e => setMotivoPersonalizado(e.target.value)}
                  placeholder="Explica brevemente el motivo..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            )}

            {/* Duración */}
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700, marginBottom: '10px' }}>
              Duración del baneo:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
              {[
                { label: '1d', dias: 1 },
                { label: '7d', dias: 7 },
                { label: '30d', dias: 30 },
                { label: '90d', dias: 90 },
                { label: 'Permanente', dias: null }
              ].map(opt => {
                const val = opt.dias === null ? '' : String(opt.dias);
                const sel = duracionDias === val;
                return (
                  <button
                    key={opt.label}
                    onClick={() => setDuracionDias(val)}
                    type="button"
                    style={{
                      padding: '8px 18px', borderRadius: '999px',
                      border: 'none',
                      background: sel ? 'var(--primary)' : '#F5F1F5',
                      color: sel ? 'white' : '#4a3a4a',
                      cursor: 'pointer', fontWeight: sel ? 700 : 600, fontSize: '13px',
                      transition: 'all 0.15s'
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {errorBan && (
              <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 12px', borderRadius: '10px', fontSize: '13px', marginBottom: '15px' }}>
                {errorBan}
              </div>
            )}

            <button
              onClick={confirmBan}
              disabled={submittingBan}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                background: 'linear-gradient(135deg, #F6416C 0%, #d11744 100%)',
                color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '15px',
                boxShadow: '0 6px 18px rgba(246, 65, 108, 0.35)',
                opacity: submittingBan ? 0.7 : 1
              }}
            >
              {submittingBan ? 'Baneando...' : 'Banear'}
            </button>
          </div>
        </div>
      )}

      {/* Modal for Delete Confirmation */}
      {showDeleteModal && userToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30, 10, 40, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', margin: 0, padding: '30px', textAlign: 'center', animation: 'scaleIn 0.3s ease', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', background: '#fff1f2', 
              display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#f43f5e', margin: '0 auto 20px',
              boxShadow: '0 0 20px rgba(244, 63, 94, 0.1)'
            }}>
              <AlertTriangle size={32} />
            </div>
            
            <h3 style={{ margin: '0 0 10px', fontSize: '22px', color: '#1e293b', fontWeight: '700' }}>¿Eliminar usuaria?</h3>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', margin: '0 0 25px' }}>
              Estás a punto de eliminar a <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{userToDelete.nombre}</span>. 
              Esta acción borrará todos sus datos de forma permanente.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                style={{ flex: 1, padding: '14px', borderRadius: '15px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: '600', color: '#64748b', transition: 'all 0.2s' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteUser}
                disabled={submitting}
                style={{ 
                  flex: 1, padding: '14px', borderRadius: '15px', border: 'none', 
                  background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', color: 'white', cursor: 'pointer', fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)'
                }}
              >
                {submitting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
