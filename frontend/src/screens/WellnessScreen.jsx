import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Coffee, Utensils, Zap, Moon, Heart, Info, Flower2, LayoutGrid, BookOpen, Activity } from 'lucide-react';
import { ApiService } from '../api';

const ADVICE_DATABASE = {
  menstrual: {
    title: 'Fase Menstrual',
    subtitle: 'Tiempo de renovación',
    color: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)',
    icon: <Moon size={24} />,
    food: 'Alimentos ricos en hierro y magnesio.',
    exercise: 'Yoga suave o caminar tranquilo.',
    care: 'Aplica calor local y descansa extra.',
    mood: 'Introspección y calma profunda.'
  },
  folicular: {
    title: 'Fase Folicular',
    subtitle: 'Energía en ascenso',
    color: 'linear-gradient(135deg, #FFB75E 0%, #ED8F03 100%)',
    icon: <Zap size={24} />,
    food: 'Carbohidratos complejos y fibra.',
    exercise: 'Entrenamiento de fuerza moderado.',
    care: 'Prueba nuevas rutinas de cuidado.',
    mood: 'Creatividad y ganas de socializar.'
  },
  ovulatoria: {
    title: 'Fase Ovulatoria',
    subtitle: 'Pico de vitalidad',
    color: 'linear-gradient(135deg, #BA68C8 0%, #9C27B0 100%)',
    icon: <Sparkles size={24} />,
    food: 'Antioxidantes y mucha hidratación.',
    exercise: 'HIIT o cardio de alta intensidad.',
    care: 'Brilla en tus eventos sociales.',
    mood: 'Máxima confianza y libido alta.'
  },
  lutea: {
    title: 'Fase Lútea',
    subtitle: 'Preparando el descanso',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: <Coffee size={24} />,
    food: 'Grasas saludables y omega-3.',
    exercise: 'Pilates o estiramientos activos.',
    care: 'Baños relajantes y menos cafeína.',
    mood: 'Sensibilidad y autocompasión.'
  }
};

export default function WellnessScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('guide');
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('folicular');
  const [day, setDay] = useState(1);
  const [stats, setStats] = useState({ symptomsCount: 0, notesCount: 0, recent: [] });

  useEffect(() => {
    const fetchWellness = async () => {
      try {
        const [ciclos, config, s7, d7] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig(),
          ApiService.getRegistrosSintomas(), // Get last week
          ApiService.getRegistrosDiarios()   // Get last week
        ]);

        if (ciclos.length > 0) {
          const ultimo = ciclos[0];
          const duracion = config?.duracion_ciclo || 28;
          const duracionP = config?.duracion_periodo || 5;
          const hoy = new Date();
          const inicio = new Date(ultimo.fecha_inicio);
          const diaActual = (Math.floor((hoy - inicio) / 86400000) % duracion) + 1;
          setDay(diaActual);
          
          if (diaActual <= duracionP) setPhase('menstrual');
          else if (diaActual < (duracion - 14) - 3) setPhase('folicular');
          else if (diaActual <= (duracion - 14) + 1) setPhase('ovulatoria');
          else setPhase('lutea');
        }

        setStats({
          symptomsCount: s7?.length || 0,
          notesCount: d7?.filter(d => d.notas)?.length || 0,
          recent: [...(s7 || [])].slice(0, 5)
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWellness();
  }, []);

  if (loading) return <div className="screen-container" style={{ justifyContent: 'center', alignItems: 'center' }}><div className="loader"></div></div>;

  const currentAdvice = ADVICE_DATABASE[phase];

  return (
    <div className="screen-container" style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Atrás</span>
        </button>
      </div>

      <h2 style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: '5px' }}>Bienestar</h2>
      <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '25px' }}>Día {day} • {currentAdvice.title}</p>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.5)', padding: '4px', borderRadius: '15px', marginBottom: '25px', border: '1px solid #f1f5f9' }}>
        <button 
          onClick={() => setActiveTab('guide')}
          style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: activeTab === 'guide' ? 'white' : 'transparent', color: activeTab === 'guide' ? 'var(--primary)' : '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: activeTab === 'guide' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
        >
          <BookOpen size={18} /> Guía
        </button>
        <button 
          onClick={() => setActiveTab('habits')}
          style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: activeTab === 'habits' ? 'white' : 'transparent', color: activeTab === 'habits' ? 'var(--primary)' : '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: activeTab === 'habits' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
        >
          <Activity size={18} /> Mi Actividad
        </button>
      </div>

      {activeTab === 'guide' ? (
        <div style={{ display: 'grid', gap: '15px' }}>
          <div className="card" style={{ background: currentAdvice.color, color: 'white', border: 'none', padding: '25px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.2 }}><Flower2 size={120} /></div>
            <div style={{ fontSize: '12px', fontWeight: '800', opacity: 0.8, textTransform: 'uppercase', marginBottom: '5px' }}>Enfoque de Hoy</div>
            <h3 style={{ fontSize: '24px', margin: 0 }}>{currentAdvice.subtitle}</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="card" style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
              <div style={{ background: '#FFF7ED', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#C2410C' }}><Utensils size={24} /></div>
              <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>Dieta</h4>
              <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>{currentAdvice.food}</p>
            </div>
            <div className="card" style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
              <div style={{ background: '#F0F9FF', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#0369A1' }}><Zap size={24} /></div>
              <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>Deporte</h4>
              <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>{currentAdvice.exercise}</p>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ background: '#FDF2F8', padding: '12px', borderRadius: '12px', color: '#BE185D' }}><Heart size={24} /></div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px' }}>Autocuidado</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{currentAdvice.care}</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <h4 style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', marginBottom: '15px' }}>Resumen Semanal</h4>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.symptomsCount}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Síntomas</div>
              </div>
              <div style={{ width: '1px', background: '#eee' }}></div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.notesCount}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Notas</div>
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '15px', margin: '10px 0 5px 0' }}>Registros Recientes</h4>
          {stats.recent.length > 0 ? stats.recent.map((s, i) => (
            <div key={i} className="card" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{s.nombre_sintoma}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(s.fecha).toLocaleDateString()}</span>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <LayoutGrid size={48} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p>No hay registros esta semana</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
