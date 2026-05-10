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
      fetchUsers();
    }
  }, [user, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getUsers();
      setUsers(data);
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
          margin: 0, background: 'linear-gradient(135deg, #BA68C8 0%, #9C27B0 100%)', 
          color: 'white', border: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '24px'
        }}>
          <Users size={24} style={{ marginBottom: '12px', opacity: 0.8 }} />
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Usuarias activas</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '4px 0' }}>1,247</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ margin: 0, padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Activity size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Registros hoy</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>342</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <Calendar size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Ciclos totales</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>4,821</div>
        </div>
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <TrendingUp size={20} color="#4CAF50" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Crecimiento</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4CAF50' }}>+12%</div>
        </div>
      </div>

      {/* Actividad Reciente */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Actividad reciente</h3>
      <div className="card" style={{ padding: '0', marginBottom: '24px', overflow: 'hidden' }}>
        {[
          { label: 'Nueva usuaria registrada', time: 'Hace 5 minutos', color: '#BA68C8', bg: 'rgba(186, 104, 200, 0.05)' },
          { label: '128 registros diarios completados', time: 'Hace 1 hora', color: '#9C27B0', bg: 'rgba(156, 39, 176, 0.03)' },
          { label: 'Actualización de predicciones', time: 'Hace 2 horas', color: '#FF9A9E', bg: 'rgba(255, 154, 158, 0.05)' }
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
              borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.03)' : 'none'
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
                <div style={{ fontSize: '13px', fontWeight: '500' }}>{Math.floor(Math.random() * 10) + 1} ciclos</div>
                <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>Hace {Math.floor(Math.random() * 24)} horas</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Configuración del Sistema */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Configuración del sistema</h3>
      <div className="card" style={{ padding: '8px 0', marginBottom: '24px' }}>
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
      <button style={{ 
        width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', 
        border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: '600',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        cursor: 'pointer', marginBottom: '40px'
      }}>
        <Download size={18} /> Exportar datos del sistema
      </button>

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


