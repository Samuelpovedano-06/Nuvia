import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../api';
import { Sparkles, Heart, Zap, Calendar, Activity, User, Moon, Flower2, Info, Droplets, ChevronLeft, ChevronRight, MessageSquare, Users } from 'lucide-react';

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
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const isUnlinkedPareja = user?.rol === 'pareja' && !user?.codigo_pareja;

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
        } else {
          setCycleStatus({
            day: 0,
            phase: '¡Bienvenida!',
            desc: 'Introduce tu primer ciclo para ayudarte a predecir tu ritmo.',
            color: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)',
            progress: 0
          });
          setNextEvents({
            period: 'Pendiente',
            fertile: 'Pendiente'
          });
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
      const hoy = logDate;

      if (activeCycle) {
        await ApiService.actualizarCiclo(activeCycle.id, { fecha_fin: hoy });
        const todosLosCiclos = await ApiService.getCiclos();
        const completados = todosLosCiclos.filter(c => c.fecha_inicio && c.fecha_fin);
        if (completados.length > 0) {
          const updates = {};
          let totalPeriodo = 0;
          completados.forEach(c => {
            const diff = (new Date(c.fecha_fin) - new Date(c.fecha_inicio)) / (86400000);
            totalPeriodo += Math.floor(diff) + 1;
          });
          const nuevaDuracionP = Math.round(totalPeriodo / completados.length);
          if (nuevaDuracionP !== userConfig.duracion_periodo) updates.duracion_periodo = nuevaDuracionP;

          if (todosLosCiclos.length >= 2) {
            let totalCiclo = 0;
            let count = 0;
            for (let i = 0; i < Math.min(3, todosLosCiclos.length - 1); i++) {
              const diff = Math.abs(new Date(todosLosCiclos[i].fecha_inicio) - new Date(todosLosCiclos[i + 1].fecha_inicio)) / 86400000;
              totalCiclo += Math.floor(diff);
              count++;
            }
            const nuevaFrecuencia = Math.round(totalCiclo / count);
            if (nuevaFrecuencia !== userConfig.duracion_ciclo) updates.duracion_ciclo = nuevaFrecuencia;
          }
          if (Object.keys(updates).length > 0) await ApiService.updateConfig(updates);
        }
      } else {
        await ApiService.crearCiclo({ fecha_inicio: hoy });
      }
      window.location.reload();
    } catch (err) {
      alert('Error al procesar el registro: ' + err.message);
      setLoadingData(false);
    }
  };

  const displayAsEmpty = (rawCiclos.length === 0 || isUnlinkedPareja);

  const statusToDisplay = displayAsEmpty ? {
    day: 0,
    phase: '¡Bienvenida!',
    desc: isUnlinkedPareja ? 'Vincula tu cuenta con tu pareja desde el perfil para empezar.' : 'Introduce tu primer ciclo para ayudarte a predecir tu ritmo.',
    color: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)',
    progress: 0
  } : cycleStatus;

  const eventsToDisplay = displayAsEmpty ? {
    period: 'Pendiente',
    fertile: 'Pendiente',
    ovulation: '—'
  } : nextEvents;

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Hola, {user?.nombre || 'Usuaria'}</h2>
          <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '13px' }}>¿Cómo te sientes hoy?</p>
        </div>
        <button onClick={logout} style={{ background: 'transparent', border: '1.5px solid var(--primary-light)', padding: '6px 14px', borderRadius: '14px', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
          Salir
        </button>
      </div>

      <div className="card" style={{
        background: statusToDisplay.color, color: 'white', padding: '16px',
        border: 'none', marginBottom: '12px', position: 'relative', overflow: 'hidden',
        minHeight: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
      }}>
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.15 }}>
          <Sparkles size={160} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <Calendar size={14} />
          <span style={{ fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '10px' }}>
            {statusToDisplay.day > 0 ? `Día ${statusToDisplay.day} de tu ciclo` : 'Nuvia te acompaña'}
          </span>
        </div>
        <h3 style={{ fontSize: '20px', margin: '0 0 2px 0', color: 'white' }}>{statusToDisplay.phase}</h3>
        <p style={{ margin: 0, opacity: 0.95, fontSize: '13px', fontWeight: '500' }}>{statusToDisplay.desc}</p>
      </div>

      {customAdvice && !isUnlinkedPareja && (
        <div className="card" style={{
          background: customAdvice.color, border: `1px solid ${customAdvice.color}`,
          padding: '10px 14px', marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center',
          animation: 'scaleIn 0.3s ease'
        }}>
          <div style={{ background: 'white', padding: '6px', borderRadius: '8px' }}>
            {customAdvice.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', fontSize: '12px', marginBottom: '0', color: '#333' }}>{customAdvice.title}</div>
            <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.2' }}>{customAdvice.desc}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '12px', background: 'rgba(255,255,255,0.5)', border: '1px solid #f1f5f9', margin: '0 0 12px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9C27B0', marginBottom: '2px' }}><Sparkles size={16} style={{ margin: '0 auto' }} /></div>
            <div style={{ fontSize: '8px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase' }}>Fértil</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{eventsToDisplay.fertile}</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid #eee', borderRight: '1px solid #eee' }}>
            <div style={{ color: '#F6416C', marginBottom: '2px' }}><Heart size={16} fill="#F6416C" style={{ margin: '0 auto' }} /></div>
            <div style={{ fontSize: '8px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase' }}>Periodo</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{eventsToDisplay.period}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#7C3AED', marginBottom: '2px' }}><Zap size={16} fill="#7C3AED" style={{ margin: '0 auto' }} /></div>
            <div style={{ fontSize: '8px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase' }}>Ovulac.</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{eventsToDisplay.ovulation || nextEvents.ovulation || '—'}</div>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          alignItems: 'center', 
          marginTop: '12px', 
          pointerEvents: isUnlinkedPareja ? 'none' : 'auto',
          filter: isUnlinkedPareja ? 'grayscale(0.8)' : 'none',
          opacity: isUnlinkedPareja ? 0.6 : 1
        }}>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={loadingData}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 8px',
              borderRadius: '14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '42px'
            }}
          >
            {activeCycle ? <Calendar size={14} /> : <Heart size={14} fill="white" />}
            <span>{activeCycle ? 'Terminó' : 'Empezó'}</span>
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={14} style={{ position: 'absolute', left: '12px', color: 'var(--primary)', opacity: 0.7 }} />
              <div
                onClick={() => setShowDatePicker(true)}
                style={{
                  width: '100%',
                  padding: '12px 8px 12px 34px',
                  borderRadius: '14px',
                  border: '1.5px solid rgba(176, 91, 181, 0.15)',
                  background: 'white',
                  fontSize: '12px',
                  color: 'var(--text-dark)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  height: '42px'
                }}
              >
                {new Date(logDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div 
          className="card" 
          onClick={() => !isUnlinkedPareja && navigate('/chats')} 
          style={{ 
            textAlign: 'center', 
            cursor: isUnlinkedPareja ? 'not-allowed' : 'pointer', 
            margin: 0, 
            pointerEvents: isUnlinkedPareja ? 'none' : 'auto',
            filter: isUnlinkedPareja ? 'grayscale(0.8)' : 'none',
            opacity: isUnlinkedPareja ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100px',
            padding: '14px'
          }}
        >
          <div style={{ color: 'var(--primary)', marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
            <MessageSquare size={30} />
          </div>
          <h4 style={{ margin: 0, fontSize: '14px' }}>Chats Secretos</h4>
        </div>

        <div 
          className="card" 
          onClick={() => !isUnlinkedPareja && navigate('/pareja')} 
          style={{ 
            textAlign: 'center', 
            cursor: isUnlinkedPareja ? 'not-allowed' : 'pointer', 
            margin: 0, 
            pointerEvents: isUnlinkedPareja ? 'none' : 'auto',
            filter: isUnlinkedPareja ? 'grayscale(0.8)' : 'none',
            opacity: isUnlinkedPareja ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100px',
            padding: '14px'
          }}
        >
          <div style={{ color: 'var(--primary)', marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
            <Users size={30} />
          </div>
          <h4 style={{ margin: 0, fontSize: '14px' }}>Mi pareja</h4>
        </div>

        <div 
          className="card" 
          onClick={() => !isUnlinkedPareja && navigate('/wellness')} 
          style={{ 
            textAlign: 'center', 
            cursor: isUnlinkedPareja ? 'not-allowed' : 'pointer', 
            margin: 0, 
            pointerEvents: isUnlinkedPareja ? 'none' : 'auto',
            filter: isUnlinkedPareja ? 'grayscale(0.8)' : 'none',
            opacity: isUnlinkedPareja ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100px',
            padding: '14px'
          }}
        >
          <div style={{ color: 'var(--primary)', marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
            <Sparkles size={30} />
          </div>
          <h4 style={{ margin: 0, fontSize: '14px' }}>Mi Bienestar</h4>
        </div>
      </div>

      {showDatePicker && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '350px', width: '100%', padding: '20px', background: 'white', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <button onClick={() => { if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(pickerYear - 1); } else setPickerMonth(pickerMonth - 1); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                <ChevronLeft size={20} />
              </button>
              <span style={{ fontWeight: '700', color: 'var(--primary)', textTransform: 'capitalize' }}>
                {new Date(pickerYear, pickerMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => { if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(pickerYear + 1); } else setPickerMonth(pickerMonth + 1); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d} style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array.from({ length: (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7 }).map((_, i) => <div key={`e-${i}`}></div>)}
              {Array.from({ length: new Date(pickerYear, pickerMonth + 1, 0).getDate() }).map((_, i) => {
                const d = i + 1;
                const dateStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isSelected = logDate === dateStr;
                const isFuture = new Date(pickerYear, pickerMonth, d) > new Date();
                return (
                  <div key={d} onClick={() => { if (!isFuture) { setLogDate(dateStr); setShowDatePicker(false); } }}
                    style={{
                      aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: isSelected ? '700' : '500', borderRadius: '12px',
                      cursor: isFuture ? 'default' : 'pointer',
                      background: isSelected ? 'var(--primary)' : 'transparent',
                      color: isSelected ? 'white' : (isFuture ? '#e2e8f0' : 'var(--text-dark)'),
                      transition: 'all 0.2s'
                    }}>
                    {d}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowDatePicker(false)} style={{ width: '100%', marginTop: '20px', padding: '10px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '320px', width: '100%', padding: '25px', textAlign: 'center', background: 'white', borderRadius: '25px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: '#F6416C' }}>
              {activeCycle ? <Calendar size={30} /> : <Heart size={30} fill="#F6416C" />}
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: '#333' }}>{activeCycle ? '¿Terminó tu periodo?' : '¿Empezó tu periodo?'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={handleLogPeriod} style={{ background: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)', color: 'white', border: 'none', padding: '12px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar</button>
              <button onClick={() => setShowConfirm(false)} style={{ background: 'transparent', color: '#999', border: 'none', padding: '10px', cursor: 'pointer' }}>Cancelar</button>
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
