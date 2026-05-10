import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../api';

const getPhaseInfo = (day, duration = 28) => {
  if (day <= 5) return { name: 'Fase Menstrual', desc: 'Día de descanso profundo', color: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)' };
  if (day <= 12) return { name: 'Fase Folicular', desc: 'Tu energía empieza a subir', color: 'linear-gradient(135deg, #FFB75E 0%, #ED8F03 100%)' };
  if (day <= 16) return { name: 'Fase Ovulatoria', desc: 'Alta probabilidad de embarazo', color: 'linear-gradient(135deg, #BA68C8 0%, #9C27B0 100%)' };
  return { name: 'Fase Lútea', desc: 'Mantén la calma y mantente hidratada', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' };
};

export default function HomeScreen() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cycleStatus, setCycleStatus] = useState({ day: '—', phase: '...', desc: 'Cargando datos...', color: 'var(--primary-light)' });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ciclos, config] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig()
        ]);

        if (ciclos.length > 0) {
          const ultimoCiclo = ciclos[0]; // El más reciente
          const fechaInicio = new Date(ultimoCiclo.fecha_inicio);
          const hoy = new Date();
          const duracion = config?.duracion_ciclo || 28;

          const diffTime = Math.abs(hoy - fechaInicio);
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const diaActual = (diffDays % duracion) + 1;
          
          const phase = getPhaseInfo(diaActual, duracion);
          setCycleStatus({
            day: `Día ${diaActual}`,
            phase: phase.name,
            desc: phase.desc,
            color: phase.color
          });
        } else {
          setCycleStatus({
            day: 'N/A',
            phase: 'Sin ciclos registrados',
            desc: 'Registra tu último periodo para empezar',
            color: 'var(--primary-light)'
          });
        }
      } catch (err) {
        console.error("Error cargando datos de la home:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Hola, {user?.nombre || 'Usuaria'}</h2>
          <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '14px' }}>¿Cómo te sientes hoy?</p>
        </div>
        <button onClick={logout} style={{ background: 'transparent', border: '1px solid var(--primary-light)', padding: '8px 16px', borderRadius: '20px', color: 'var(--primary)', cursor: 'pointer', marginLeft: '20px' }}>
          Salir
        </button>
      </div>

      {/* Hero Card Dinámica */}
      <div className="card" style={{ 
        background: cycleStatus.color, 
        color: 'white', 
        border: 'none',
        transition: 'all 0.5s ease'
      }}>
        {loadingData ? (
          <div style={{ padding: '20px', textAlign: 'center' }}><div className="loader" style={{ borderColor: 'white', borderTopColor: 'transparent' }}></div></div>
        ) : (
          <>
            <h3 style={{ color: 'white', fontSize: '24px' }}>{cycleStatus.day}</h3>
            <p style={{ opacity: 0.9 }}>{cycleStatus.phase}</p>
            <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', fontSize: '14px' }}>
              {cycleStatus.desc}
            </div>
          </>
        )}
      </div>

      {/* Grid Menu */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
        <div className="card" onClick={() => navigate('/sintomas')} style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌸</div>
          <h4 style={{ margin: 0 }}>Registrar Síntoma</h4>
        </div>
        <div className="card" onClick={() => navigate('/calendar')} style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
          <h4 style={{ margin: 0 }}>Calendario</h4>
        </div>
        <div className="card" onClick={() => navigate('/predicciones')} style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
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
