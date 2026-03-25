import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ApiService } from '../api';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Shield, Trash2, Edit, UserPlus, X, Save, Eye, EyeOff } from 'lucide-react';

export default function AdminPanelScreen() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null means "Create New"
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
    if (window.confirm('¿Estás segura de eliminar esta usuaria y todos sus datos? Esta acción es irreversible.')) {
      try {
        await ApiService.deleteUserAdmin(id);
        fetchUsers();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ background: 'var(--primary)', padding: '12px', borderRadius: '16px', color: 'white', marginRight: '16px' }}>
            <Shield size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', margin: 0 }}>Panel Admin</h2>
            <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '14px' }}>Gestión de usuarias</p>
          </div>
        </div>
        <button onClick={() => handleOpenModal()} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(176,91,181,0.3)' }}>
          <UserPlus size={22} />
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Usuarias ({users.length})</h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><div className="loader"></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.map(u => (
              <div key={u.id_usuaria} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, marginRight: '8px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: u.rol === 'admin' ? 'var(--primary)' : 'var(--primary-light)',
                    borderRadius: '50%',
                    marginRight: '12px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: 'white',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nombre} {u.rol === 'admin' && '👑'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button onClick={() => handleOpenModal(u)} style={{ padding: '8px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Edit size={18} /></button>
                  <button onClick={() => handleDeleteUser(u.id_usuaria)} style={{ padding: '8px', background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer' }}><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '30px', position: 'relative', animation: 'fadeIn 0.3s ease' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
              <X size={24} />
            </button>

            <h3 style={{ marginBottom: '20px' }}>{editingUser ? 'Editar Usuaria' : 'Nueva Usuaria'}</h3>

            {error && <div style={{ color: 'red', fontSize: '13px', marginBottom: '15px', background: '#ffebee', padding: '10px', borderRadius: '8px' }}>{error}</div>}

            <form onSubmit={handleSaveUser}>
              <div className="input-group">
                <label className="input-label">Nombre</label>
                <input type="text" className="styled-input" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input type="email" className="styled-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="input-group" style={{ position: 'relative' }}>
                <label className="input-label">{editingUser ? 'Password (dejar vacío para no cambiar)' : 'Password'}</label>
                <input type={showPassword ? "text" : "password"} className="styled-input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingUser} style={{ paddingRight: '45px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle" style={{ top: '38px' }}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="input-group">
                <label className="input-label">Rol</label>
                <select className="styled-input" value={formData.rol} onChange={e => setFormData({ ...formData, rol: e.target.value })} style={{ appearance: 'none' }}>
                  <option value="usuaria">Usuaria</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Guardando...' : (editingUser ? 'Actualizar' : 'Crear Usuario')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

