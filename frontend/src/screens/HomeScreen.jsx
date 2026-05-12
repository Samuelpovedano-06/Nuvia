import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../api';
import { Sparkles, Heart, Zap, Calendar, Activity, User, Moon, Flower2, Info, Droplets } from 'lucide-react';

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
  const [customAdvice, setCustomAdvice] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const [ciclos, config, sToday, sYesterday, dToday] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig(),
          ApiService.getRegistrosSintomas(today),
          ApiService.getRegistrosSintomas(yesterday),
          ApiService.getRegistroDiario(today)
        ]);

        if (ciclos.length > 0) {
          setRawCiclos(ciclos);
          setUserConfig(config);
          
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

          // Consejos dinámicos (Wellness 2.0)
          const allSymptoms = [...(sToday || []), ...(sYesterday || [])];
          generateDynamicAdvice(allSymptoms, dToday);

          // ... resto de lógica de eventos ...
          const diasParaPeriodo = duracion - diaActual;
          const proximoPeriodo = diasParaPeriodo === 0 ? '¡Hoy!' : `En ${diasParaPeriodo} ${diasParaPeriodo === 1 ? 'día' : 'días'}`;
          let fertileMsg = '—';
          const ovulacion = Math.max(7, duracion - 14);
          const fertInicio = ovulacion - 3;
          const fertFin = ovulacion + 1;
          if (diaActual >= fertInicio && diaActual <= fertFin) fertileMsg = '¡Ahora!';
          else if (diaActual < fertInicio) fertileMsg = `En ${fertInicio - diaActual} d.`;
          else fertileMsg = `En ${(duracion - diaActual) + fertInicio} d.`;

          setNextEvents({
            period: proximoPeriodo,
            fertile: fertileMsg,
            ovulation: diaActual <= ovulacion ? `En ${ovulacion - diaActual} d.` : `En ${(duracion - diaActual) + ovulacion} d.`
          });
          const abierto = ciclos.find(c => !c.fecha_fin);
          setActiveCycle(abierto);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };

    const generateDynamicAdvice = (symptoms, daily) => {
      const names = symptoms.map(s => s.nombre_sintoma || '');
      let advice = null;
      if (names.some(n => n.includes('Dolor') || n.includes('Cólicos'))) {
        advice = { title: 'Foco: Alivio', desc: 'Molestias detectadas. Prioriza el calor local y descanso.', icon: <Zap size={18} color="#F6416C" />, color: '#FFF1F2' };
      } else if (names.some(n => n.includes('Cansancio') || n.includes('Sueño'))) {
        advice = { title: 'Foco: Energía', desc: 'Reportas fatiga. Intenta dormir 1h extra hoy.', icon: <Moon size={18} color="#0369A1" />, color: '#F0F9FF' };
      } else if (names.some(n => n.includes('Ansiedad') || n.includes('Estrés'))) {
        advice = { title: 'Foco: Calma', desc: 'Día para meditar o escribir. Respira hondo.', icon: <Flower2 size={18} color="#7C3AED" />, color: '#F5F3FF' };
      }
      setCustomAdvice(advice);
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

      {/* Hero Card de Fase (Estilo Premium Flo) */}
      <div className="card" style={{ 
        background: cycleStatus.color, color: 'white', padding: '25px', 
        border: 'none', marginBottom: '20px', position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
      }}>
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.15 }}>
          <Sparkles size={160} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Calendar size={16} />
          <span style={{ fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', fontSize: '11px' }}>Día {cycleStatus.day || '—'} de tu ciclo</span>
        </div>
        <h3 style={{ fontSize: '26px', margin: '0 0 5px 0', color: 'white' }}>{cycleStatus.phase}</h3>
        <p style={{ margin: 0, opacity: 0.95, fontSize: '15px', fontWeight: '500' }}>{cycleStatus.desc}</p>
      </div>

      {/* Escáner de Bienestar Inteligente */}
      {customAdvice && (
        <div className="card" style={{ 
          background: customAdvice.color, border: `1px solid ${customAdvice.color}`, 
          padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center',
          animation: 'scaleIn 0.3s ease', margin: '0 0 20px 0'
        }}>
          <div style={{ background: 'white', padding: '8px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            {customAdvice.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '1px', color: '#333' }}>{customAdvice.title}</div>
            <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.3' }}>{customAdvice.desc}</div>
          </div>
        </div>
      )}

      {/* Caja de Indicadores Rápidos */}
      <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.5)', border: '1px solid #f1f5f9', margin: '0 0 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          
          {/* Días Fértiles */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9C27B0', marginBottom: '4px' }}><Sparkles size={18} style={{ margin: '0 auto' }} /></div>
            <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase' }}>Fértil</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{nextEvents.fertile}</div>
          </div>

          {/* Próximo Periodo */}
          <div style={{ textAlign: 'center', borderLeft: '1px solid #eee', borderRight: '1px solid #eee' }}>
            <div style={{ color: '#F6416C', marginBottom: '4px' }}><Heart size={18} fill="#F6416C" style={{ margin: '0 auto' }} /></div>
            <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase' }}>Periodo</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{nextEvents.period}</div>
          </div>

          {/* Ovulación */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#7C3AED', marginBottom: '4px' }}><Zap size={18} fill="#7C3AED" style={{ margin: '0 auto' }} /></div>
            <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase' }}>Ovulac.</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{nextEvents.ovulation}</div>
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
          <div style={{ color: 'var(--primary)', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
            <Calendar size={32} />
          </div>
          <h4 style={{ margin: 0 }}>Calendario y Ciclo</h4>
        </div>
        <div className="card" onClick={() => navigate('/wellness')} style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ color: 'var(--primary)', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
            <Sparkles size={32} />
          </div>
          <h4 style={{ margin: 0 }}>Mi Bienestar</h4>
        </div>
        <div className="card" onClick={() => navigate('/profile')} style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          <div style={{ color: 'var(--primary)', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
            <User size={32} />
          </div>
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
