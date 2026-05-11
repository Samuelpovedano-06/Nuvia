import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ApiService } from '../api';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Users, Shield, Trash2, Edit, UserPlus, X, Save, Eye, EyeOff, 
  TrendingUp, Activity, Calendar, Download, Settings, Zap, ArrowUpRight
} from 'lucide-react';

export default function AdminPanelScreen() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total_users: 0, total_ciclos: 0, registros_hoy: 0, crecimiento_semanal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: 'usuaria' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.rol !== 'admin') {
      navigate('/');
    } else {
      fetchData();
    }
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        ApiService.getUsers(),
        ApiService.getAdminStats()
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
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
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('¿Estás segura de eliminar esta usuaria y todos sus datos?')) {
      try {
        await ApiService.deleteUserAdmin(id);
        fetchUsers();
      } catch (err) { alert(err.message); }
    }
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
          <ChevronLeft size={18} /> Volver
        </button>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontSize: '32px', color: 'var(--primary)', margin: 0, fontWeight: '700' }}>Panel de Admin</h2>
        <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '14px' }}>Gestión y estadísticas del sistema</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card" style={{ 
          margin: 0, background: 'white', 
          color: '#1e293b', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
        }}>
          <Users size={24} color="var(--primary)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Usuarias registradas</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '4px 0' }}>{stats.total_users.toLocaleString()}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ margin: 0, padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Activity size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Registros hoy</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.registros_hoy}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <Calendar size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Ciclos totales</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.total_ciclos.toLocaleString()}</div>
        </div>
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <TrendingUp size={20} color={stats.crecimiento_semanal >= 0 ? "#4CAF50" : "#F44336"} style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Crecimiento sem.</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: stats.crecimiento_semanal >= 0 ? "#4CAF50" : "#F44336" }}>
            {stats.crecimiento_semanal >= 0 ? '+' : ''}{stats.crecimiento_semanal}%
          </div>
        </div>
      </div>

      {/* Actividad Reciente */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Actividad reciente</h3>
      <div className="card" style={{ padding: '0', marginBottom: '24px', overflow: 'hidden' }}>
        {[
          { label: 'Sincronización de base de datos', time: 'Ahora mismo', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.05)' },
          { label: `${users.length} perfiles analizados`, time: 'Hace 1 minuto', color: '#BA68C8', bg: 'rgba(186, 104, 200, 0.03)' },
          { label: 'Servidor de predicciones activo', time: 'Sistema estable', color: '#9C27B0', bg: 'rgba(156, 39, 176, 0.05)' }
        ].map((item, i) => (
          <div key={i} style={{ 
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px',
            background: item.bg, borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.03)' : 'none'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }}></div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{item.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de Usuarias */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', margin: 0 }}>Lista de usuarias</h3>
        <button onClick={() => navigate('/admin/users')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '13px', cursor: 'pointer' }}>Ver todas</button>
      </div>

      <div className="card" style={{ padding: '0', marginBottom: '24px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}><div className="loader"></div></div>
        ) : (
          users.slice(0, 4).map((u, i) => (
            <div key={u.id_usuaria} style={{ 
              padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: i < users.slice(0, 4).length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', background: ['#BA68C8', '#FF9A9E', '#A78BFA', '#F472B6'][i % 4],
                  display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold'
                }}>
                  {u.nombre.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{u.nombre}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{u.email}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>{u.total_ciclos || 0} ciclos</div>
                <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                  {u.ultimo_acceso 
                    ? `Último acceso: ${new Date(u.ultimo_acceso).toLocaleDateString()} ${new Date(u.ultimo_acceso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                    : 'Sin actividad'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Configuración del Sistema */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Configuración del sistema</h3>
      <div className="card" style={{ padding: '8px 0', marginBottom: '30px' }}>
        {[
          { icon: <Settings size={18} />, label: 'Configuración de notificaciones' },
          { icon: <Zap size={18} />, label: 'Algoritmos de predicción' },
          { icon: <Users size={18} />, label: 'Gestión de usuarios' }
        ].map((item, i) => (
          <div key={i} style={{ 
            padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer',
            borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.03)' : 'none'
          }}>
            <div style={{ color: 'var(--primary)' }}>{item.icon}</div>
            <div style={{ fontSize: '14px' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Export Button */}
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <button style={{ 
          padding: '12px 30px', background: 'var(--primary)', color: 'white', 
          border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          cursor: 'pointer', boxShadow: '0 4px 15px rgba(186, 104, 200, 0.2)'
        }}>
          <Download size={18} /> Exportar datos
        </button>
      </div>

      {/* Help Floating Icon */}
      <div style={{ 
        position: 'fixed', bottom: '20px', right: '20px', width: '40px', height: '40px',
        background: '#333', color: 'white', borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px'
      }}>
        ?
      </div>
    </div>
  );
}


