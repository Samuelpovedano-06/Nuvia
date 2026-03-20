import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bell, Lock, Settings, User, LogOut } from 'lucide-react';

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
        </button>
      </div>

      {/* Profile Header */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ 
          width: '100px', 
          height: '100px', 
          background: 'var(--primary-light)', 
          borderRadius: '50%', 
          margin: '0 auto 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '42px',
          color: 'white',
          fontWeight: '500'
        }}>
          {user?.nombre?.charAt(0).toUpperCase() || 'U'}
        </div>
        <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{user?.nombre}</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '15px' }}>{user?.email}</p>
      </div>

      {/* Information Sections */}
      <div className="card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '16px', marginBottom: '16px', opacity: 0.8 }}>Información personal</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-light)' }}>Edad</span>
          <span style={{ fontWeight: '500' }}>28 años</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-light)' }}>Usando Nuvia desde</span>
          <span style={{ fontWeight: '500' }}>Septiembre 2025</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-light)' }}>Ciclos registrados</span>
          <span style={{ fontWeight: '500', color: 'var(--primary-light)' }}>3 ciclos</span>
        </div>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '16px', marginBottom: '16px', opacity: 0.8 }}>Configuración del ciclo</h4>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-light)' }}>Duración del ciclo</span>
            <span style={{ fontWeight: '500', color: 'var(--primary-light)' }}>28 días</span>
          </div>
          <div style={{ height: '8px', background: 'var(--bubble-3)', borderRadius: '4px', position: 'relative' }}>
            <div style={{ width: '45%', height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
            <div style={{ width: '20px', height: '20px', background: '#333', border: '2px solid white', borderRadius: '4px', position: 'absolute', top: '-6px', left: '42%' }}></div>
          </div>
        </div>
      </div>

      {/* Options List */}
      <div className="card" style={{ padding: '10px 0' }}>
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: '#FCE4EC', padding: '10px', borderRadius: '50%', color: '#E91E63', marginRight: '16px' }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Notificaciones</div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Recordatorios y alertas</div>
            </div>
          </div>
          <div style={{ width: '48px', height: '24px', background: 'var(--primary)', borderRadius: '12px', position: 'relative' }}>
             <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', right: '2px', top: '2px' }}></div>
          </div>
        </div>

        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: '#F3E5F5', padding: '10px', borderRadius: '50%', color: 'var(--primary)', marginRight: '16px' }}>
              <Lock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Privacidad</div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Gestiona tus datos</div>
            </div>
          </div>
          <ChevronRight size={20} color="var(--text-light)" />
        </div>

        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: '#F3E5F5', padding: '10px', borderRadius: '50%', color: 'var(--primary)', marginRight: '16px' }}>
              <Settings size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Configuración general</div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Preferencias de la app</div>
            </div>
          </div>
          <ChevronRight size={20} color="var(--text-light)" />
        </div>

        {/* ADMIN PANEL OPTION (Only for Admins) */}
        {user?.rol === 'admin' && (
          <div 
            onClick={() => navigate('/admin')}
            style={{ 
              padding: '12px 20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              cursor: 'pointer',
              borderTop: '1px solid rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: '#F3E5F5', padding: '10px', borderRadius: '50%', color: 'var(--primary)', marginRight: '16px' }}>
                <User size={18} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '500' }}>Panel de Administrador</div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Solo para administradores</div>
              </div>
            </div>
            <ChevronRight size={20} color="var(--text-light)" />
          </div>
        )}
      </div>

      {/* Logout */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ff5252', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', cursor: 'pointer' }}>
          <LogOut size={18} style={{ marginRight: '8px' }} /> Cerrar sesión
        </button>
        <p style={{ marginTop: '20px', color: 'var(--text-light)', fontSize: '13px' }}>Nuvia v1.0.0</p>
        <p style={{ marginTop: '8px', color: 'var(--text-light)', fontSize: '12px' }}>💜 Hecho con amor para tu bienestar</p>
      </div>
    </div>
  );
}
