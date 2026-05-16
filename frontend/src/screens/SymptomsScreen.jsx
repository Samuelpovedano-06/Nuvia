import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Save, Utensils, Droplets, Heart, FileText, Lightbulb, Sparkles, Egg, Cloud, Shield, ShieldOff } from 'lucide-react';
import { ApiService } from '../api';

// Componente para dibujar las caritas EXACTAS de la imagen usando SVG
const NuviaFace = ({ type, color = '#9b6c98' }) => {
  const faces = {
    'feliz': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="10" r="1" fill={color} />
        <circle cx="16" cy="10" r="1" fill={color} />
        <path d="M7 15c1.5 2 5.5 2 7 0" />
      </svg>
    ),
    'risa': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l3 2-3 2M18 9l-3 2 3 2" />
        <path d="M7 15c1 3 9 3 10 0z" fill={color} opacity="0.3" />
        <path d="M7 15c1 3 9 3 10 0" />
      </svg>
    ),
    'triste': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M8 9c-.5 1-1.5 1-2 0M18 9c-.5 1-1.5 1-2 0" />
        <path d="M8 17c1.5-2 6.5-2 8 0" />
      </svg>
    ),
    'molesta': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
        <path d="M6 10h4M14 10h4" />
        <path d="M8 17c1.5-2 6.5-2 8 0" strokeWidth="2.5" />
      </svg>
    ),
    'enamorada': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill={color} stroke={color} strokeWidth="1">
        <path d="M8 7c-1.5-1.5-4 0-2 2.5 1 1 2 2 2 2s1-1 2-2c2-2.5-.5-4-2-2.5z" />
        <path d="M16 7c-1.5-1.5-4 0-2 2.5 1 1 2 2 2 2s1-1 2-2c2-2.5-.5-4-2-2.5z" />
        <path d="M8 16c1.5 2 6.5 2 8 0" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    'durmiendo': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 10c1 1.5 3 1.5 4 0M14 10c1 1.5 3 1.5 4 0" />
        <path d="M8 16c1.5 1.5 6.5 1.5 8 0" />
      </svg>
    ),
    'despierta': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <circle cx="7" cy="10" r="3" />
        <circle cx="17" cy="10" r="3" />
        <circle cx="7" cy="10" r="1" fill={color} />
        <circle cx="17" cy="10" r="1" fill={color} />
        <path d="M9 17h6" strokeWidth="2.5" />
      </svg>
    ),
    'nauseas': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M8 9c0 1-1 1-1 0M17 9c0 1-1 1-1 0" />
        <path d="M7 16c1-1 2 1 3-1s2 1 3-1 2 1 3-1" />
      </svg>
    ),
    'ansiosa': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 11l2-2 2 2M14 11l2-2 2 2" />
        <path d="M8 16h8l-1 1-1-1-1 1-1-1-1 1-1-1-1 1" />
      </svg>
    ),
    'pena': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M9 10c-.5-1-1.5-1-2 0M17 10c-.5-1-1.5-1-2 0" />
        <path d="M10 17c1-1 3-1 4 0" />
        <circle cx="6" cy="13" r="1" fill={color} opacity="0.4" />
      </svg>
    ),
    'dolor_agudo': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8l3 2-3 2M18 8l-3 2 3 2" />
        <path d="M9 17h6" />
      </svg>
    ),
    'sensible': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="11" r="1" fill={color} />
        <circle cx="16" cy="11" r="1" fill={color} />
        <path d="M10 16c1 1 3 1 4 0" />
        <path d="M16 14v2" strokeWidth="2" opacity="0.6" /> {/* Lagrimita */}
      </svg>
    ),
    'irritable': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 8l3 2M18 8l-3 2" strokeWidth="3" /> {/* Cejas */}
        <circle cx="8" cy="13" r="1" fill={color} />
        <circle cx="16" cy="13" r="1" fill={color} />
        <path d="M9 18h6" />
      </svg>
    ),
    'variable': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="10" r="1.5" fill={color} />
        <path d="M15 10l2 1" strokeWidth="3" /> {/* Ojo picado */}
        <path d="M7 17c2-2 6 2 8 0" />
      </svg>
    )
  };
  return faces[type] || faces['feliz'];
};

const SINTOMA_STYLE = {
  'Dolor Abdominal': { face: 'triste',      color: '#9b6c98', tip: 'Un té de jengibre puede calmar los espasmos abdominales.' },
  'Dolor de Cabeza': { face: 'triste',      color: '#9b6c98', tip: 'Apaga las luces fuertes y mantente hidratada.' },
  'Pecho Sensible':  { face: 'molesta',     color: '#9b6c98', tip: 'Usa un sujetador más cómodo y evita la cafeína hoy.' },
  'Hinchazón':       { face: 'molesta',     color: '#9b6c98', tip: 'Reduce la sal y bebe agua con limón para deshincharte.' },
  'Cólicos':         { face: 'dolor_agudo', color: '#9b6c98', tip: 'El calor local es tu mejor aliado. ¡Manta eléctrica!' },
  'Dolor de Espalda':{ face: 'triste',      color: '#9b6c98', tip: 'Estira suavemente la zona lumbar antes de dormir.' },
  'Antojos':         { icon: <Utensils size={24} />, color: '#9b6c98', tip: 'Si buscas dulce, el chocolate negro >70% tiene magnesio clave.' },
  'Náuseas':         { face: 'nauseas',     color: '#9b6c98', tip: 'Come algo seco como galletas saladas en pequeñas porciones.' },
  'Ansiedad':        { face: 'ansiosa',     color: '#9b6c98', tip: 'Prueba la respiración 4-7-8 durante dos minutos.' },
  'Sensibilidad':    { face: 'sensible',    color: '#9b6c98', tip: 'Sé amable contigo misma hoy, es normal sentirse así.' },
  'Irritabilidad':   { face: 'irritable',   color: '#9b6c98', tip: 'Respira hondo antes de reaccionar. Tu cuerpo está bajo presión.' },
  'Humor Variable':  { face: 'variable',    color: '#9b6c98', tip: 'Es normal que tus hormonas causen estos altibajos hoy.' },
  'Euforia':         { face: 'risa',        color: '#9b6c98', tip: '¡Aprovecha esta energía para terminar tus pendientes!' },
  'Cansancio':       { face: 'durmiendo',   color: '#9b6c98', tip: 'Escucha a tu cuerpo. Una siesta de 20 min hará maravillas.' },
  'Manchada':        { face: 'pena',        color: '#9b6c98', tip: 'Lleva contigo lo necesario, ¡que nada te pille por sorpresa!' },
  'Insomnio':        { face: 'despierta',   color: '#9b6c98', tip: 'Evita las pantallas 1h antes de dormir y lee un libro.' },
  'Libido Alta':     { face: 'enamorada',   color: '#9b6c98', tip: '¡Disfruta de este pico de vitalidad y conexión!' },
  'Default':         { face: 'feliz',       color: '#9b6c98', tip: 'Recuerda que cada ciclo es único. ¡Vas muy bien!' }
};

const DISCHARGE_CARDS = [
  { 
    id: 'seco', 
    label: 'Seco', 
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 0 0 7 7z" />
        <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" />
      </svg>
    ), 
    tip: 'El flujo seco es normal al principio del ciclo.' 
  },
  { id: 'cremoso', label: 'Cremoso', icon: <Cloud size={24} />, tip: 'Indica que tu cuerpo se prepara para la fase fértil.' },
  { id: 'clara_huevo', label: 'Clara Huevo', icon: <Egg size={24} />, tip: '¡Pico de fertilidad! El flujo elástico facilita la concepción.' },
  { id: 'acuoso', label: 'Acuoso', icon: <Droplets size={24} fill="currentColor" />, tip: 'Muy fértil. Tu cuerpo está en su momento óptimo.' }
];

export default function SymptomsScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPareja = localStorage.getItem('plataforma') === 'pareja';
  const targetId = isPareja ? localStorage.getItem('selectedPartnerId') : null;
  const partnerName = isPareja ? (localStorage.getItem('selectedPartnerName') || 'tu pareja') : null;

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // Si viene ?fecha=YYYY-MM-DD desde el calendario, usar esa; si no, hoy
  const fechaParam = searchParams.get('fecha');
  const today = (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) ? fechaParam : todayStr;
  const esHoy = today === todayStr;

  // Etiqueta legible de la fecha que se está editando (ej. "vie 16 may")
  const fechaLabel = (() => {
    try {
      const d = new Date(today + 'T12:00:00');
      return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch { return today; }
  })();

  const [sintomasCatalogo, setSintomasCatalogo] = useState([]);
  const [selected, setSelected] = useState([]);
  const [intensities, setIntensities] = useState({});
  const [notas, setNotas] = useState('');
  const [flujo, setFlujo] = useState('');
  const [relaciones, setRelaciones] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const [catalogo, diario, registros] = await Promise.all([
          ApiService.getSintomas(),
          ApiService.getRegistroDiario(today, targetId),
          ApiService.getRegistrosSintomas(today, targetId)
        ]);
        setSintomasCatalogo(catalogo);
        // Resetear estado antes de cargar (importante al cambiar de fecha)
        setSelected([]);
        setIntensities({});
        setNotas('');
        setFlujo('');
        setRelaciones(0);
        if (diario) {
          setNotas(diario.notas || '');
          setFlujo(diario.flujo || '');
          setRelaciones(diario.relaciones || 0);
        }
        if (registros && registros.length > 0) {
          const ids = registros.map(r => r.id_sintoma);
          const intMap = {};
          registros.forEach(r => { intMap[r.id_sintoma] = r.intensidad; });
          setSelected(ids);
          setIntensities(intMap);
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, [today]);

  const toggleSintoma = (id) => {
    if (selected.includes(id)) {
      setSelected(prev => prev.filter(i => i !== id));
      const newInt = { ...intensities };
      delete newInt[id];
      setIntensities(newInt);
    } else {
      setSelected(prev => [...prev, id]);
      setIntensities(prev => ({ ...prev, [id]: 3 }));
    }
  };

  const updateIntensity = (id, val) => {
    setIntensities(prev => ({ ...prev, [id]: val }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (selected.length > 0) {
        await Promise.all(selected.map(id => 
          ApiService.registrarSintoma({ id_sintoma: id, fecha: today, intensidad: intensities[id] || 3 })
        ));
      }
      
      await ApiService.registrarDatoDiario({
        fecha: today,
        notas,
        flujo,
        relaciones
      });

      setMessage('¡Registros guardados con éxito!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActiveTip = () => {
    if (flujo) {
      const f = DISCHARGE_CARDS.find(d => d.id === flujo);
      if (f) return f.tip;
    }
    if (selected.length > 0) {
      const lastId = selected[selected.length - 1];
      const sintoma = sintomasCatalogo.find(s => s.id_sintoma === lastId);
      return SINTOMA_STYLE[sintoma?.nombre_sintoma]?.tip || SINTOMA_STYLE['Default'].tip;
    }
    return SINTOMA_STYLE['Default'].tip;
  };

  const categorias = {
    'Fisico': sintomasCatalogo.filter(s => s.categoria === 'Fisico'),
    'Emocional': sintomasCatalogo.filter(s => s.categoria === 'Emocional'),
    'Otros': sintomasCatalogo.filter(s => s.categoria === 'Otros' || !s.categoria)
  };

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', width: '100%', maxWidth: '800px', margin: '0 auto 20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2>Diario de Nuvia</h2>
        <p className="subtitle">{isPareja ? `Registro de ${partnerName}` : 'Tu salud, bajo control y con estilo'}</p>
      </div>

      {/* Banner: fecha que se está editando */}
      <div style={{
        background: esHoy ? 'rgba(176,91,181,0.08)' : 'rgba(245,158,11,0.12)',
        border: `1.5px solid ${esHoy ? 'rgba(176,91,181,0.25)' : '#FCD34D'}`,
        borderRadius: '14px', padding: '10px 14px', marginBottom: '20px',
        maxWidth: '800px', width: '100%', margin: '0 auto 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'
      }}>
        <span style={{ fontSize: '13px', color: esHoy ? 'var(--primary)' : '#92400E', fontWeight: '700' }}>
          {esHoy ? 'Hoy' : 'Editando'} · {fechaLabel}
        </span>
        {!esHoy && (
          <button
            onClick={() => navigate('/sintomas')}
            style={{
              background: 'white', border: '1.5px solid #FCD34D',
              color: '#92400E', borderRadius: '10px', padding: '4px 10px',
              fontSize: '11px', fontWeight: '700', cursor: 'pointer'
            }}
          >Ir a hoy</button>
        )}
      </div>

      {isPareja && (
        <div style={{ background: 'rgba(176,91,181,0.08)', border: '1px solid rgba(176,91,181,0.2)', borderRadius: '14px', padding: '10px 16px', marginBottom: '20px', maxWidth: '800px', width: '100%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={15} color="var(--primary)" />
          <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
            Viendo los síntomas de {partnerName}
          </span>
        </div>
      )}

      {message && (
        <div style={{ 
          textAlign: 'center', padding: '14px', background: 'var(--white)', color: 'var(--primary)',
          borderRadius: '16px', marginBottom: '20px', maxWidth: '800px', width: '100%', margin: '0 auto 20px',
          fontWeight: '600', boxShadow: '0 4px 12px rgba(155, 108, 152, 0.12)', border: '1px solid rgba(155, 108, 152, 0.2)'
        }}>
          {message}
        </div>
      )}

      {/* Nuvia Tip */}
      <div style={{ 
        maxWidth: '800px', width: '100%', margin: '0 auto 30px', background: 'var(--white)', 
        padding: '16px', borderRadius: '16px', display: 'flex', gap: '12px', alignItems: 'center',
        border: '1px solid rgba(155, 108, 152, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '12px', color: 'white' }}>
          <Lightbulb size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block', fontSize: '12px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nuvia Tip</strong>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-dark)', fontWeight: '500' }}>{getActiveTip()}</p>
        </div>
      </div>

      <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '35px' }}>
        
        {/* SECCIÓN ESTADO (FLUJO Y RELACIONES) */}
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>Estado Corporal</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            
            {/* Tarjeta Relaciones */}
            <div
              className="card"
              style={{
                margin: 0, padding: '16px 12px', minHeight: relaciones > 0 ? '160px' : '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: relaciones > 0 ? '2px solid var(--primary)' : '2px solid transparent',
                background: relaciones > 0 ? 'var(--primary-light)' : 'var(--white)',
                transition: '0.3s', cursor: isPareja ? 'default' : 'pointer'
              }}
              onClick={() => !isPareja && setRelaciones(relaciones > 0 ? 0 : 1)}
            >
              <div className="nuvia-sun-container" style={{ color: 'var(--primary)', marginBottom: '8px' }}>
                <div className="nuvia-sun-rays"></div>
                <div className="nuvia-sun-bg">
                  <Heart size={24} fill={relaciones > 0 ? 'currentColor' : 'none'} />
                </div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>Relaciones</span>
              
              {relaciones > 0 && (
                <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button 
                    onClick={() => setRelaciones(1)}
                    style={{
                      flex: 1, padding: '6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold',
                      background: relaciones === 1 ? 'var(--primary)' : 'white',
                      color: relaciones === 1 ? 'white' : 'var(--primary)',
                      border: '1px solid var(--primary)', cursor: 'pointer'
                    }}
                  >
                    <Shield size={12} style={{marginBottom: '2px'}} /> <br/> CON
                  </button>
                  <button 
                    onClick={() => setRelaciones(2)}
                    style={{
                      flex: 1, padding: '6px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold',
                      background: relaciones === 2 ? 'var(--primary)' : 'white',
                      color: relaciones === 2 ? 'white' : 'var(--primary)',
                      border: '1px solid var(--primary)', cursor: 'pointer'
                    }}
                  >
                    <ShieldOff size={12} style={{marginBottom: '2px'}} /> <br/> SIN
                  </button>
                </div>
              )}
            </div>

            {/* Tarjetas de Flujo */}
            {DISCHARGE_CARDS.map(type => (
              <div 
                key={type.id}
                className="card"
                style={{
                  margin: 0, padding: '16px 12px', minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: flujo === type.id ? '2px solid var(--primary)' : '2px solid transparent',
                  background: flujo === type.id ? 'var(--primary-light)' : 'var(--white)',
                  transition: '0.3s', cursor: isPareja ? 'default' : 'pointer'
                }}
                onClick={() => !isPareja && setFlujo(flujo === type.id ? '' : type.id)}
              >
                <div className="nuvia-sun-container" style={{ color: 'var(--primary)', marginBottom: '8px' }}>
                  <div className="nuvia-sun-rays"></div>
                  <div className="nuvia-sun-bg">
                    {type.icon}
                  </div>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>{type.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Síntomas */}
        {Object.entries(categorias).map(([nombreCat, sintomas]) => (
          sintomas.length > 0 && (
            <div key={nombreCat}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>
                {nombreCat === 'Fisico' ? 'Físicos' : nombreCat}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {sintomas.map(s => {
                  const style = SINTOMA_STYLE[s.nombre_sintoma] || SINTOMA_STYLE['Default'];
                  const isSelected = selected.includes(s.id_sintoma);
                  return (
                    <div 
                      key={s.id_sintoma} className="card" 
                      style={{ 
                        margin: 0, padding: '16px 12px', minHeight: isSelected ? '160px' : '120px',
                        border: isSelected ? `2px solid var(--primary)` : '2px solid transparent',
                        background: isSelected ? 'var(--primary-light)' : 'var(--white)',
                        transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'center'
                      }}
                      onClick={() => !isPareja && toggleSintoma(s.id_sintoma)}
                    >
                      <div className="nuvia-sun-container" style={{ color: style.color, marginBottom: '8px' }}>
                        <div className="nuvia-sun-rays"></div>
                        <div className="nuvia-sun-bg">
                          {style.face ? <NuviaFace type={style.face} color={style.color} /> : style.icon}
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>{s.nombre_sintoma}</span>
                      {isSelected && (
                        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', paddingTop: '8px', borderTop: '1px dashed rgba(155, 108, 152, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            {[1, 2, 3, 4, 5].map(v => (
                              <button key={v} onClick={() => !isPareja && updateIntensity(s.id_sintoma, v)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: intensities[s.id_sintoma] === v ? 'var(--primary)' : 'rgba(155, 108, 152, 0.1)', color: intensities[s.id_sintoma] === v ? 'white' : 'var(--primary)', cursor: isPareja ? 'default' : 'pointer', fontWeight: 'bold', fontSize: '11px' }}>{v}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}

        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
            <FileText size={20} color="var(--primary)" /> Notas personales
          </h4>
          <textarea
            value={notas}
            onChange={(e) => !isPareja && setNotas(e.target.value)}
            readOnly={isPareja}
            placeholder={isPareja ? (notas ? '' : 'Sin notas hoy') : 'Escribe algo importante de hoy...'}
            style={{
              width: '100%', height: '100px', border: '1px solid #eee', borderRadius: '12px', padding: '12px',
              fontSize: '14px', fontFamily: 'inherit', resize: 'none', background: isPareja ? '#fafafa' : 'var(--white)', color: 'var(--text-dark)', outline: 'none',
              cursor: isPareja ? 'default' : 'text'
            }}
          />
        </div>
      </div>

      {!isPareja && (
        <div style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '40px' }}>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '200px', margin: '0 auto' }}
          >
            {loading ? 'Guardando...' : <><Save size={20} /> Guardar Todo</>}
          </button>
        </div>
      )}
    </div>
  );
}
