import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../api';
import { Sparkles, Heart, Zap, Calendar } from 'lucide-react';

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
            fertile: fertileMsg,
            ovulation: diaActual <= ovulacion ? `En ${ovulacion - diaActual} d.` : `En ${(duracion - diaActual) + ovulacion} d.`
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

      {/* Caja Grande de Indicadores (Ahora con el Día incluido) */}
      <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.4)', margin: '0 0 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          
          {/* Día Actual (Sustituye al Hero Card) */}
          <div className="card" style={{ 
            margin: 0, padding: '16px', border: 'none', color: 'white', minHeight: '100px',
            background: cycleStatus.color,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Calendar size={14} />
              <span style={{ fontSize: '10px', fontWeight: '700', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Día {cycleStatus.day || '—'}</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.2' }}>{cycleStatus.phase}</div>
          </div>

          {/* Días Fértiles */}
          <div className="card" style={{ 
            margin: 0, padding: '16px', border: 'none', color: 'white', minHeight: '100px',
            background: 'linear-gradient(135deg, #BA68C8 0%, #9C27B0 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Sparkles size={14} />
              <span style={{ fontSize: '10px', fontWeight: '700', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fértil</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{nextEvents.fertile}</div>
          </div>

          {/* Próximo Periodo */}
          <div className="card" style={{ 
            margin: 0, padding: '16px', border: 'none', color: 'white', minHeight: '100px',
            background: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Heart size={14} fill="white" />
              <span style={{ fontSize: '10px', fontWeight: '700', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Periodo</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{nextEvents.period}</div>
          </div>

          {/* Ovulación */}
          <div className="card" style={{ 
            margin: 0, padding: '16px', border: 'none', color: 'white', minHeight: '100px',
            background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Zap size={14} fill="white" />
              <span style={{ fontSize: '10px', fontWeight: '700', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ovulac.</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{nextEvents.ovulation}</div>
          </div>

        </div>
      </div>

      {/* Grid Menu */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
