import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Thermometer, Utensils } from 'lucide-react';
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
    'nauseas': ( // Nueva cara: de asco / voy a potar
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M8 9c0 1-1 1-1 0M17 9c0 1-1 1-1 0" />
        <path d="M7 16c1-1 2 1 3-1s2 1 3-1 2 1 3-1" />
      </svg>
    ),
    'ansiosa': ( // Nueva cara: nerviosa / ansiedad
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
    'dolor_agudo': ( // Nueva cara: ojos cerrados fuerte (Cólicos)
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8l3 2-3 2M18 8l-3 2 3 2" />
        <path d="M9 17h6" />
      </svg>
    ),
    'sensible': (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="11" r="1" fill={color} />
        <circle cx="16" cy="11" r="1" fill={color} />
        <path d="M9 16c1 1 5 1 6 0" />
      </svg>
    ),
    'variable': ( // Nueva cara: humor cambiante
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="9" r="1.5" fill={color} />
        <path d="M15 10c1 1.5 3 1.5 4 0" />
        <path d="M7 16c1 1 3-1 5 0s3 1 5-1" />
      </svg>
    )
  };
  return faces[type] || faces['feliz'];
};

// Mapeo extendido para todos los sintomas
const SINTOMA_STYLE = {
  // Fisicos
  'Dolor Abdominal': { face: 'triste', color: '#9b6c98' },
  'Dolor de Cabeza': { face: 'triste', color: '#9b6c98' },
  'Pecho Sensible': { face: 'molesta', color: '#9b6c98' },
  'Hinchazón': { face: 'molesta', color: '#9b6c98' },
  'Cólicos': { face: 'dolor_agudo', color: '#9b6c98' },
  'Dolor de Espalda': { face: 'triste', color: '#9b6c98' },
  'Antojos': { icon: <Utensils size={24} />, color: '#9b6c98' },
  'Náuseas': { face: 'nauseas', color: '#9b6c98' },
  'Temperatura Alta': { icon: <Thermometer size={24} />, color: '#9b6c98' },
  // Emocionales
  'Humor Variable': { face: 'variable', color: '#9b6c98' },
  'Ansiedad': { face: 'ansiosa', color: '#9b6c98' },
  'Irritabilidad': { face: 'molesta', color: '#9b6c98' },
  'Sensibilidad': { face: 'sensible', color: '#9b6c98' },
  'Euforia': { face: 'risa', color: '#9b6c98' },
  'Acné': { face: 'molesta', color: '#9b6c98' },
  // Otros
  'Cansancio': { face: 'durmiendo', color: '#9b6c98' },
  'Manchada': { face: 'pena', color: '#9b6c98' },
  'Insomnio': { face: 'despierta', color: '#9b6c98' },
  'Libido Alta': { face: 'enamorada', color: '#9b6c98' },
  'Default': { face: 'feliz', color: '#9b6c98' }
};

export default function SymptomsScreen() {
  const navigate = useNavigate();
  const [sintomasCatalogo, setSintomasCatalogo] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSintomas = async () => {
      try {
        const data = await ApiService.getSintomas();
        setSintomasCatalogo(data);
      } catch (err) {
        setMessage('Error al cargar catálogo: ' + err.message);
      }
    };
    fetchSintomas();
  }, []);

  const toggleSintoma = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await Promise.all(selected.map(id =>
        ApiService.registrarSintoma({
          id_sintoma: id,
          fecha: today,
          intensidad: 3
        })
      ));
      setMessage('Síntomas guardados correctamente');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setMessage('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar síntomas por categoría
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
        <h2>¿Cómo te sientes?</h2>
        <p className="subtitle">Selecciona los síntomas de hoy</p>
      </div>

      {message && (
        <div style={{ textAlign: 'center', padding: '12px', background: message.startsWith('✅') ? '#e8f5e9' : '#ffebee', borderRadius: '12px', marginBottom: '20px', maxWidth: '800px', width: '100%', margin: '0 auto 20px' }}>
          {message}
        </div>
      )}

      <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {Object.entries(categorias).map(([nombreCat, sintomas]) => (
          sintomas.length > 0 && (
            <div key={nombreCat}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>
                {nombreCat === 'Fisico' ? 'Físicos' : nombreCat}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {sintomas.map(s => {
                  const style = SINTOMA_STYLE[s.nombre_sintoma] || SINTOMA_STYLE['Default'];
                  return (
                    <div
                      key={s.id_sintoma}
                      onClick={() => toggleSintoma(s.id_sintoma)}
                      className="card"
                      style={{
                        margin: 0,
                        textAlign: 'center',
                        cursor: 'pointer',
                        padding: '16px',
                        border: selected.includes(s.id_sintoma) ? `2px solid var(--primary)` : '2px solid transparent',
                        background: selected.includes(s.id_sintoma) ? 'var(--primary-light)' : 'white',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div className="nuvia-sun-container" style={{ color: style.color }}>
                        <div className="nuvia-sun-rays"></div>
                        <div className="nuvia-sun-bg">
                          {style.face ? (
                            <NuviaFace type={style.face} color={style.color} />
                          ) : (
                            style.icon
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>{s.nombre_sintoma}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '40px' }}>
        <button
          onClick={handleSave}
          disabled={loading || selected.length === 0}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Save size={20} />
          {loading ? 'Guardando...' : 'Guardar Registro'}
        </button>
      </div>
    </div>
  );
}
