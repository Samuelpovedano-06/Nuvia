import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HomeScreen() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Hola, {user?.nombre || 'Usuaria'}</h2>
          <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '14px' }}>¿Cómo te sientes hoy?</p>
        </div>
        {/* Botón Salir con más separación */}
        <button onClick={logout} style={{ background: 'transparent', border: '1px solid var(--primary-light)', padding: '8px 16px', borderRadius: '20px', color: 'var(--primary)', cursor: 'pointer', marginLeft: '20px' }}>
          Salir
        </button>
      </div>

      {/* Hero Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', color: 'white', border: 'none' }}>
        <h3 style={{ color: 'white', fontSize: '24px' }}>Día 14</h3>
        <p style={{ opacity: 0.9 }}>Fase Ovulatoria</p>
        <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', fontSize: '14px' }}>
          Alta probabilidad de embarazo
        </div>
      </div>

      {/* Grid Menu */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌸</div>
          <h4 style={{ margin: 0 }}>Registrar Síntoma</h4>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
          <h4 style={{ margin: 0 }}>Calendario</h4>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔮</div>
          <h4 style={{ margin: 0 }}>Predicciones</h4>
        </div>
        <div className="card" onClick={() => navigate('/profile')} style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
          <h4 style={{ margin: 0 }}>Mi Perfil</h4>
        </div>
      </div>
    </div>
  );
}
