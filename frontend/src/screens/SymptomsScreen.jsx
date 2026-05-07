import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Heart, Cloud, Zap, Moon, Sun, Thermometer } from 'lucide-react';
import { ApiService } from '../api';

// Mapeo de iconos y colores por nombre de síntoma para mantener la estética
const SINTOMA_STYLE = {
  'Dolor Abdominal': { icon: <Zap size={24} />, color: '#FF8A80' },
  'Pecho Sensible':  { icon: <Heart size={24} />, color: '#F48FB1' },
  'Cansancio':       { icon: <Moon size={24} />, color: '#90CAF9' },
  'Humor Variable':  { icon: <Cloud size={24} />, color: '#B39DDB' },
  'Acné':            { icon: <Sun size={24} />, color: '#FFF59D' },
  'Dolor de Cabeza': { icon: <Zap size={24} />, color: '#CFD8DC' },
  'Hinchazón':       { icon: <Cloud size={24} />, color: '#A5D6A7' },
  'Temperatura Alta':{ icon: <Thermometer size={24} />, color: '#FFCC80' },
  'Default':         { icon: <Zap size={24} />, color: '#CFD8DC' }
};

export default function SymptomsScreen() {
  const navigate = useNavigate();
  const [sintomasCatalogo, setSintomasCatalogo] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Cargar síntomas reales del backend al entrar
  useEffect(() => {
    const fetchSintomas = async () => {
      try {
        const data = await ApiService.getSintomas();
        setSintomasCatalogo(data);
      } catch (err) {
        setMessage('❌ Error al cargar catálogo: ' + err.message);
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
      // Registramos cada síntoma seleccionado individualmente usando su UUID
      await Promise.all(selected.map(id => 
        ApiService.registrarSintoma({
          id_sintoma: id, // El ID ya es un UUID (string)
          fecha: today,
          intensidad: 3
        })
      ));
      setMessage('✅ Síntomas guardados correctamente');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setMessage('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', width: '100%', maxWidth: '800px', margin: '0 auto 30px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2>Registrar Síntomas</h2>
        <p className="subtitle">¿Cómo te sientes en este momento?</p>
      </div>

      {message && (
        <div style={{ textAlign: 'center', padding: '12px', background: message.startsWith('✅') ? '#e8f5e9' : '#ffebee', borderRadius: '12px', marginBottom: '20px', maxWidth: '800px', width: '100%', margin: '0 auto 20px' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '800px', width: '100%', margin: '0 auto' }}>
        {sintomasCatalogo.map(s => {
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
                border: selected.includes(s.id_sintoma) ? `2px solid var(--primary)` : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ color: style.color, marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                {style.icon}
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>{s.nombre_sintoma}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
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
