import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Coffee, Utensils, Zap, Moon, Heart, Info, Flower2, LayoutGrid, BookOpen, Activity, FileText, Cloud, Egg, Droplets, Shield, ShieldOff } from 'lucide-react';
import { ApiService } from '../api';

// Componente para dibujar las caritas EXACTAS (Portado de SymptomsScreen)
const NuviaFace = ({ type, color = 'white' }) => {
  const faces = {
    'feliz': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="10" r="1" fill={color} />
        <circle cx="16" cy="10" r="1" fill={color} />
        <path d="M7 15c1.5 2 5.5 2 7 0" />
      </svg>
    ),
    'risa': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l3 2-3 2M18 9l-3 2 3 2" />
        <path d="M7 15c1 3 9 3 10 0z" fill={color} opacity="0.3" />
        <path d="M7 15c1 3 9 3 10 0" />
      </svg>
    ),
    'triste': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M8 9c-.5 1-1.5 1-2 0M18 9c-.5 1-1.5 1-2 0" />
        <path d="M8 17c1.5-2 6.5-2 8 0" />
      </svg>
    ),
    'molesta': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
        <path d="M6 10h4M14 10h4" />
        <path d="M8 17c1.5-2 6.5-2 8 0" strokeWidth="2.5" />
      </svg>
    ),
    'enamorada': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill={color} stroke={color} strokeWidth="1">
        <path d="M8 7c-1.5-1.5-4 0-2 2.5 1 1 2 2 2 2s1-1 2-2c2-2.5-.5-4-2-2.5z" />
        <path d="M16 7c-1.5-1.5-4 0-2 2.5 1 1 2 2 2 2s1-1 2-2c2-2.5-.5-4-2-2.5z" />
        <path d="M8 16c1.5 2 6.5 2 8 0" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    'durmiendo': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 10c1 1.5 3 1.5 4 0M14 10c1 1.5 3 1.5 4 0" />
        <path d="M8 16c1.5 1.5 6.5 1.5 8 0" />
      </svg>
    ),
    'despierta': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <circle cx="7" cy="10" r="3" />
        <circle cx="17" cy="10" r="3" />
        <circle cx="7" cy="10" r="1" fill={color} />
        <circle cx="17" cy="10" r="1" fill={color} />
        <path d="M9 17h6" strokeWidth="2.5" />
      </svg>
    ),
    'nauseas': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M8 9c0 1-1 1-1 0M17 9c0 1-1 1-1 0" />
        <path d="M7 16c1-1 2 1 3-1s2 1 3-1 2 1 3-1 2 1 3-1" />
      </svg>
    ),
    'ansiosa': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 11l2-2 2 2M14 11l2-2 2 2" />
        <path d="M8 16h8l-1 1-1-1-1 1-1-1-1 1-1-1-1 1" />
      </svg>
    ),
    'pena': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M9 10c-.5-1-1.5-1-2 0M17 10c-.5-1-1.5-1-2 0" />
        <path d="M10 17c1-1 3-1 4 0" />
        <circle cx="6" cy="13" r="1" fill={color} opacity="0.4" />
      </svg>
    ),
    'dolor_agudo': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8l3 2-3 2M18 8l-3 2 3 2" />
        <path d="M9 17h6" />
      </svg>
    ),
    'sensible': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="11" r="1" fill={color} />
        <circle cx="16" cy="11" r="1" fill={color} />
        <path d="M10 16c1 1 3 1 4 0" />
        <path d="M16 14v2" strokeWidth="2" opacity="0.6" />
      </svg>
    ),
    'irritable': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 8l3 2M18 8l-3 2" strokeWidth="3" />
        <circle cx="8" cy="13" r="1" fill={color} />
        <circle cx="16" cy="13" r="1" fill={color} />
        <path d="M9 18h6" />
      </svg>
    ),
    'variable': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="10" r="1.5" fill={color} />
        <path d="M15 10l2 1" strokeWidth="3" />
        <path d="M7 17c2-2 6 2 8 0" />
      </svg>
    )
  };
  return faces[type] || faces['feliz'];
};

const SINTOMA_STYLE = {
  'Dolor Abdominal': { face: 'triste',      color: '#9b6c98' },
  'Dolor de Cabeza': { face: 'triste',      color: '#9b6c98' },
  'Pecho Sensible':  { face: 'molesta',     color: '#9b6c98' },
  'Hinchazón':       { face: 'molesta',     color: '#9b6c98' },
  'Cólicos':         { face: 'dolor_agudo', color: '#9b6c98' },
  'Dolor de Espalda':{ face: 'triste',      color: '#9b6c98' },
  'Antojos':         { icon: <Utensils size={18} />, color: '#9b6c98' },
  'Náuseas':         { face: 'nauseas',     color: '#9b6c98' },
  'Ansiedad':        { face: 'ansiosa',     color: '#9b6c98' },
  'Sensibilidad':    { face: 'sensible',    color: '#9b6c98' },
  'Irritabilidad':   { face: 'irritable',   color: '#9b6c98' },
  'Humor Variable':  { face: 'variable',    color: '#9b6c98' },
  'Euforia':         { face: 'risa',        color: '#9b6c98' },
  'Cansancio':       { face: 'durmiendo',   color: '#9b6c98' },
  'Manchada':        { face: 'pena',        color: '#9b6c98' },
  'Insomnio':        { face: 'despierta',   color: '#9b6c98' },
  'Libido Alta':     { face: 'enamorada',   color: '#9b6c98' },
  'Default':         { face: 'feliz',       color: '#9b6c98' }
};

const BODY_STATE_STYLE = {
  'seco': { label: 'Flujo Seco', icon: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 0 0 7 7z" />
      <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" />
    </svg>
  )},
  'cremoso': { label: 'Flujo Cremoso', icon: <Cloud size={18} /> },
  'clara_huevo': { label: 'Flujo Clara Huevo', icon: <Egg size={18} /> },
  'acuoso': { label: 'Flujo Acuoso', icon: <Droplets size={18} /> },
  'rel_con': { label: 'Relaciones (Con)', icon: <Shield size={18} /> },
  'rel_sin': { label: 'Relaciones (Sin)', icon: <ShieldOff size={18} /> }
};
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
  const isPareja = localStorage.getItem('plataforma') === 'pareja';
  const targetId = isPareja ? localStorage.getItem('selectedPartnerId') : null;
  const partnerName = isPareja ? (localStorage.getItem('selectedPartnerName') || 'tu pareja') : null;

  const [activeTab, setActiveTab] = useState('guide');
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('folicular');
  const [day, setDay] = useState(1);
  const [stats, setStats] = useState({ symptomsCount: 0, notesCount: 0, recent: [] });

  useEffect(() => {
    const fetchWellness = async () => {
      try {
        const [ciclos, config, s7, d7, sintomas] = await Promise.all([
          ApiService.getCiclos(targetId),
          ApiService.getConfig(targetId),
          ApiService.getRegistrosSintomas(null, targetId),
          ApiService.getRegistrosDiarios(targetId),
          ApiService.getSintomas()
        ]);

        const sintomaMap = {};
        sintomas?.forEach(s => { sintomaMap[s.id_sintoma] = s.nombre_sintoma; });

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

        const merged = [];
        
        // Síntomas
        s7?.forEach(s => {
          merged.push({ ...s, type: 'symptom', label: sintomaMap[s.id_sintoma] || 'Síntoma' });
        });

        // Datos Diarios (Notas, Flujo, Relaciones)
        d7?.forEach(d => {
          if (d.notas) merged.push({ ...d, type: 'note', label: d.notas });
          if (d.flujo) merged.push({ ...d, type: 'body', label: BODY_STATE_STYLE[d.flujo]?.label || 'Flujo', subtype: d.flujo });
          if (d.relaciones === 1) merged.push({ ...d, type: 'body', label: 'Relaciones (Con)', subtype: 'rel_con' });
          if (d.relaciones === 2) merged.push({ ...d, type: 'body', label: 'Relaciones (Sin)', subtype: 'rel_sin' });
        });

        merged.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        setStats({
          symptomsCount: s7?.length || 0,
          notesCount: d7?.filter(d => d.notas || d.flujo || d.relaciones > 0)?.length || 0,
          recent: merged.slice(0, 15) // Show up to 15 recent items
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
      <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: isPareja ? '12px' : '25px' }}>Día {day} • {currentAdvice.title}</p>

      {isPareja && (
        <div style={{ background: 'rgba(176,91,181,0.08)', border: '1px solid rgba(176,91,181,0.2)', borderRadius: '14px', padding: '10px 16px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={15} color="var(--primary)" />
          <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
            Viendo el bienestar de {partnerName} — solo lectura
          </span>
        </div>
      )}

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
            <h4 style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', marginBottom: '15px' }}>Resumen Reciente</h4>
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

          <h4 style={{ fontSize: '15px', margin: '10px 0 5px 0' }}>Línea de Vida</h4>
          {stats.recent.length > 0 ? stats.recent.map((item, i) => (
            <div key={i} className="card" style={{ 
              padding: '15px', display: 'flex', gap: '15px', alignItems: 'flex-start', margin: 0,
              background: item.type === 'note' ? '#FDF4FF' : 'white',
              border: item.type === 'note' ? '1px solid #F5D0FE' : '1px solid #f1f5f9'
            }}>
              <div style={{ width: '40px', height: '40px', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.type === 'note' ? (
                  <div style={{ background: '#E879F9', padding: '8px', borderRadius: '10px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} />
                  </div>
                ) : item.type === 'body' ? (
                  <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '10px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {BODY_STATE_STYLE[item.subtype]?.icon || <Activity size={18} />}
                  </div>
                ) : (() => {
                  const s = SINTOMA_STYLE[item.label] || SINTOMA_STYLE['Default'];
                  return (
                    <div className="nuvia-sun-container" style={{ margin: 0, transform: 'scale(0.57)', color: s.color }}>
                      <div className="nuvia-sun-rays"></div>
                      <div className="nuvia-sun-bg">
                        {s.face ? <NuviaFace type={s.face} color={s.color} /> : s.icon}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>
                    {new Date(item.fecha).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                  <span style={{ fontSize: '10px', color: '#cbd5e1' }}>{item.type === 'note' ? 'NOTA' : 'SÍNTOMA'}</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155', fontWeight: item.type === 'note' ? '500' : '400', lineHeight: '1.4' }}>
                  {item.label}
                </p>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <LayoutGrid size={48} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p>No hay actividad registrada</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
