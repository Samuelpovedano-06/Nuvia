import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ApiService } from '../api';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Shield, Trash2, Edit } from 'lucide-react';

export default function AdminPanelScreen() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Security check: If not admin, go back
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ background: 'var(--primary)', padding: '12px', borderRadius: '16px', color: 'white', marginRight: '16px' }}>
          <Shield size={32} />
        </div>
        <div>
          <h2 style={{ fontSize: '28px', margin: 0 }}>Panel Admin</h2>
          <p style={{ color: 'var(--text-light)', margin: 0 }}>Gestión de usuarias y sistema</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Usuarias Registradas</h3>
          <div style={{ background: 'var(--primary-light)', padding: '4px 12px', borderRadius: '12px', color: 'white', fontSize: '12px', fontWeight: '600' }}>
            {users.length} TOTAL
          </div>
        </div>

        {/* Dummy list for now while we update backend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--primary-light)', borderRadius: '50%', marginRight: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>U</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '500' }}>Usuario de Prueba</div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>test@nuvia.com</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Edit size={18} /></button>
              <button style={{ background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer' }}><Trash2 size={18} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px', background: 'var(--primary)', color: 'white' }}>
        <h4 style={{ color: 'white', marginBottom: '8px' }}>Estadísticas</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>1</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Activas Hoy</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>100%</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Uptime</div>
          </div>
        </div>
      </div>
    </div>
  );
}
