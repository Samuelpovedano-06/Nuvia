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
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeCycle, setActiveCycle] = useState(null);
  const [userConfig, setUserConfig] = useState(null);
  const [rawCiclos, setRawCiclos] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ciclos, config] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig()
        ]);

        if (ciclos.length > 0) {
          setRawCiclos(ciclos);
          setUserConfig(config);
          
          // Detectar si hay un ciclo "abierto" (sin fecha_fin)
          const abierto = ciclos.find(c => !c.fecha_fin);
          setActiveCycle(abierto);

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

  const handleLogPeriod = async () => {
    setShowConfirm(false);
    try {
      setLoadingData(true);
      const hoy = new Date().toISOString().split('T')[0];

      if (activeCycle) {
        // CERRAR CICLO (Terminó hoy)
        await ApiService.actualizarCiclo(activeCycle.id, { fecha_fin: hoy });
        
        // --- MOTOR DE APRENDIZAJE NUVIA ---
        const todosLosCiclos = await ApiService.getCiclos();
        const completados = todosLosCiclos.filter(c => c.fecha_inicio && c.fecha_fin);
        
        if (completados.length > 0) {
          const updates = {};
          
          // 1. Calcular nueva duración promedio del periodo (lo rojo)
          let totalPeriodo = 0;
          completados.forEach(c => {
            const diff = (new Date(c.fecha_fin) - new Date(c.fecha_inicio)) / (86400000);
            totalPeriodo += Math.floor(diff) + 1;
          });
          const nuevaDuracionP = Math.round(totalPeriodo / completados.length);
          if (nuevaDuracionP !== userConfig.duracion_periodo) {
            updates.duracion_periodo = nuevaDuracionP;
          }

          // 2. Calcular nueva frecuencia promedio (el ciclo)
          if (todosLosCiclos.length >= 2) {
            let totalCiclo = 0;
            let count = 0;
            for (let i = 0; i < Math.min(3, todosLosCiclos.length - 1); i++) {
              const diff = Math.abs(new Date(todosLosCiclos[i].fecha_inicio) - new Date(todosLosCiclos[i+1].fecha_inicio)) / 86400000;
              totalCiclo += Math.floor(diff);
              count++;
            }
            const nuevaFrecuencia = Math.round(totalCiclo / count);
            if (nuevaFrecuencia !== userConfig.duracion_ciclo) {
              updates.duracion_ciclo = nuevaFrecuencia;
            }
          }

          if (Object.keys(updates).length > 0) {
            await ApiService.updateConfig(updates);
          }
        }
      } else {
        // EMPEZAR NUEVO CICLO
        await ApiService.crearCiclo({ fecha_inicio: hoy });
      }
      
      window.location.reload(); 
    } catch (err) {
      alert('Error al procesar el registro: ' + err.message);
      setLoadingData(false);
    }
  };

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

        {/* Botón de Registro Inteligente (Dual) */}
        <button 
          onClick={() => setShowConfirm(true)}
          disabled={loadingData}
          style={{
            width: '100%',
            marginTop: '16px',
            background: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)', // Siempre Nuvia
            color: 'white',
            border: 'none',
            padding: '16px',
            borderRadius: '20px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 4px 15px rgba(246, 65, 108, 0.2)',
            transition: 'all 0.3s ease'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {activeCycle ? <Calendar size={18} /> : <Heart size={18} fill="white" />}
          {loadingData 
            ? 'Procesando...' 
            : (activeCycle ? 'Mi periodo terminó hoy' : 'Hoy empezó mi periodo')
          }
        </button>
      </div>

      {/* Grid Menu */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card" onClick={() => navigate('/sintomas')} style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌸</div>
          <h4 style={{ margin: 0 }}>Registrar Síntoma</h4>
        </div>
        <div className="card" onClick={() => navigate('/calendar')} style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
          <h4 style={{ margin: 0 }}>Calendario y Ciclo</h4>
        </div>
        <div className="card" onClick={() => navigate('/wellness')} style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ color: 'var(--primary)', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
            <Sparkles size={32} />
          </div>
          <h4 style={{ margin: 0 }}>Mi Bienestar</h4>
        </div>
        <div className="card" onClick={() => navigate('/profile')} style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
          <h4 style={{ margin: 0 }}>Mi Perfil</h4>
        </div>
      </div>

      {/* Modal de Confirmación Estilo Nuvia Adaptado */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{
            maxWidth: '320px', width: '100%', padding: '25px', textAlign: 'center',
            background: 'white', borderRadius: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ 
              width: '60px', height: '60px', borderRadius: '50%', 
              background: '#FFF1F2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 15px', color: '#F6416C'
            }}>
              {activeCycle ? <Calendar size={30} /> : <Heart size={30} fill="#F6416C" />}
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: '#333' }}>
              {activeCycle ? '¿Terminó tu periodo?' : '¿Empezó tu periodo?'}
            </h3>
            <p style={{ margin: '0 0 25px', fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
              {activeCycle 
                ? 'Nuvia calculará tu duración real para ajustar tus predicciones automáticamente.'
                : 'Registraremos hoy como el primer día de tu nuevo ciclo.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleLogPeriod}
                style={{
                  background: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)',
                  color: 'white', border: 'none', padding: '12px', borderRadius: '15px',
                  fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(246, 65, 108, 0.3)'
                }}
              >
                {activeCycle ? 'Sí, terminó hoy' : 'Sí, empezó hoy'}
              </button>
              <button 
                onClick={() => setShowConfirm(false)}
                style={{
                  background: 'transparent', color: '#999', border: 'none',
                  padding: '10px', fontSize: '14px', cursor: 'pointer'
                }}
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
