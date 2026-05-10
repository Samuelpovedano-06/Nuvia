import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../api';
import { Sparkles, Heart } from 'lucide-react';

const getPhaseInfo = (day, duration = 28) => {
  if (day <= 5) return { name: 'Fase Menstrual', desc: 'Día de descanso profundo', color: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)' };
  if (day <= 12) return { name: 'Fase Folicular', desc: 'Tu energía empieza a subir', color: 'linear-gradient(135deg, #FFB75E 0%, #ED8F03 100%)' };
  if (day <= 16) return { name: 'Fase Ovulatoria', desc: 'Alta probabilidad de embarazo', color: 'linear-gradient(135deg, #BA68C8 0%, #9C27B0 100%)' };
  return { name: 'Fase Lútea', desc: 'Mantén la calma y mantente hidratada', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' };
};

export default function HomeScreen() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cycleStatus, setCycleStatus] = useState({ day: 0, phase: '...', desc: 'Cargando datos...', color: 'var(--primary-light)', progress: 0 });
  const [nextEvents, setNextEvents] = useState({ period: '—', fertile: '—' });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ciclos, config] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig()
        ]);

        if (ciclos.length > 0) {
          const ultimoCiclo = ciclos[0];
          const fechaInicio = new Date(ultimoCiclo.fecha_inicio);
          const hoy = new Date();
          const duracion = config?.duracion_ciclo || 28;

          const diffTime = Math.abs(hoy - fechaInicio);
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const diaActual = (diffDays % duracion) + 1;
          
          const phase = getPhaseInfo(diaActual, duracion);
          setCycleStatus({
            day: diaActual,
            phase: phase.name,
            desc: phase.desc,
            color: phase.color,
            progress: (diaActual / duracion) * 100
          });

          // Calcular próximos eventos
          const diasParaPeriodo = duracion - diaActual;
          const proximoPeriodo = diasParaPeriodo === 0 ? '¡Hoy!' : `En ${diasParaPeriodo} ${diasParaPeriodo === 1 ? 'día' : 'días'}`;
          
          let fertileMsg = '—';
          const ovulacion = 14; // simplificado
          const fertInicio = ovulacion - 3;
          const fertFin = ovulacion + 1;

          if (diaActual >= fertInicio && diaActual <= fertFin) {
            fertileMsg = '¡Ahora!';
          } else if (diaActual < fertInicio) {
            const diasParaFert = fertInicio - diaActual;
            fertileMsg = `En ${diasParaFert} ${diasParaFert === 1 ? 'día' : 'días'}`;
          } else {
            const diasParaFert = (duracion - diaActual) + fertInicio;
            fertileMsg = `En ${diasParaFert} días`;
          }

          setNextEvents({
            period: proximoPeriodo,
            fertile: fertileMsg
          });

        } else {
          setCycleStatus({
            day: 0,
            phase: 'Sin ciclos registrados',
            desc: 'Registra tu último periodo para empezar',
            color: 'var(--primary-light)',
            progress: 0
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
        transition: 'all 0.5s ease',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {loadingData ? (
          <div style={{ padding: '20px', textAlign: 'center' }}><div className="loader" style={{ borderColor: 'white', borderTopColor: 'transparent' }}></div></div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ color: 'white', fontSize: '24px', margin: 0 }}>Día {cycleStatus.day || '—'}</h3>
                <p style={{ opacity: 0.9, margin: '4px 0 0 0' }}>{cycleStatus.phase}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                HOY
              </div>
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px', position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', left: 0, top: 0, height: '100%', 
                  width: `${cycleStatus.progress}%`, background: 'white', 
                  borderRadius: '3px', transition: 'width 1s ease' 
                }}></div>
              </div>
            </div>

            <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', fontSize: '13px' }}>
              {cycleStatus.desc}
            </div>
          </>
        )}
      </div>

      {/* Vistazo Rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '8px' }}>
            <div style={{ background: 'var(--primary-light)', padding: '6px', borderRadius: '8px' }}><Sparkles size={16} /></div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-light)' }}>Días fértiles</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-dark)' }}>{nextEvents.fertile}</div>
        </div>

        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF4D4D', marginBottom: '8px' }}>
            <div style={{ background: 'rgba(255,77,77,0.1)', padding: '6px', borderRadius: '8px' }}><Heart size={16} fill="currentColor" /></div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-light)' }}>Próximo periodo</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-dark)' }}>{nextEvents.period}</div>
        </div>
      </div>

      {/* Grid Menu */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
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
