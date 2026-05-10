import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Zap, Heart, Calendar, ArrowRight } from 'lucide-react';
import { ApiService } from '../api';

const FASES_INFO = {
  'Menstrual': { color: '#FF4D4D', icon: <Droplets />, advice: 'Momento de descanso y mimos. Prioriza el sueño y el calor local.' },
  'Folicular': { color: '#FFB74D', icon: <Zap />, advice: 'Tu energía empieza a subir. ¡Buen momento para nuevos proyectos!' },
  'Ovulatoria': { color: '#BA68C8', icon: <Sparkles />, advice: 'Pico de vitalidad y fertilidad. ¡Te sientes radiante!' },
  'Lútea': { color: '#64B5F6', icon: <Heart />, advice: 'Baja el ritmo gradualmente. Escucha a tu cuerpo y mantente hidratada.' }
};

// Helper para Droplets (no importado de lucide-react para evitar errores si falta)
const Droplets = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 0 0 7 7z" />
  </svg>
);

export default function PredictionsScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [proximosEventos, setProximosEventos] = useState([]);
  const [faseActual, setFaseActual] = useState(null);

  useEffect(() => {
    const calcularPredicciones = async () => {
      try {
        const [ciclos, config] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig()
        ]);

        if (ciclos.length > 0 && config) {
          const ultimoCiclo = ciclos[0]; // El más reciente
          const fechaInicio = new Date(ultimoCiclo.fecha_inicio);
          const duracion = config.duracion_ciclo || 28;
          const hoy = new Date();

          const predicciones = [];
          for (let i = 1; i <= 6; i++) {
            const fechaEstimada = new Date(fechaInicio.getTime() + (duracion * i) * 24 * 60 * 60 * 1000);
            const ovulacion = new Date(fechaEstimada.getTime() - 14 * 24 * 60 * 60 * 1000);
            
            predicciones.push({
              id: i,
              fechaPeriodo: fechaEstimada,
              fechaOvulacion: ovulacion,
              mes: fechaEstimada.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            });
          }
          setProximosEventos(predicciones);

          // Calcular fase actual simplificada
          const diasDesdeInicio = Math.floor((hoy - fechaInicio) / (24 * 60 * 60 * 1000));
          const diaCiclo = (diasDesdeInicio % duracion) + 1;

          if (diaCiclo <= 5) setFaseActual('Menstrual');
          else if (diaCiclo <= 12) setFaseActual('Folicular');
          else if (diaCiclo <= 16) setFaseActual('Ovulatoria');
          else setFaseActual('Lútea');
        }
      } catch (err) {
        console.error("Error calculando predicciones:", err);
      } finally {
        setLoading(false);
      }
    };

    calcularPredicciones();
  }, []);

  if (loading) {
    return (
      <div className="screen-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', width: '100%', maxWidth: '800px', margin: '0 auto 20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '28px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Sparkles size={28} /> Tu Futuro Nuvia
        </h2>
        <p className="subtitle">Predicciones inteligentes para tu bienestar</p>
      </div>

      {faseActual && (
        <div className="card" style={{ 
          background: `linear-gradient(135deg, ${FASES_INFO[faseActual].color} 0%, var(--primary) 100%)`, 
          color: 'white', padding: '24px', border: 'none', marginBottom: '30px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ color: 'white', margin: 0, fontSize: '22px' }}>Fase {faseActual}</h3>
              <p style={{ opacity: 0.9, marginTop: '4px' }}>Día actual del ciclo</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
              {FASES_INFO[faseActual].icon}
            </div>
          </div>
          <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.15)', padding: '16px', borderRadius: '16px', fontSize: '14px', lineHeight: '1.5' }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Consejo Nuvia:</strong>
            {FASES_INFO[faseActual].advice}
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '18px', marginBottom: '16px', borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>
        Próximos 6 meses
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {proximosEventos.map(ev => (
          <div key={ev.id} className="card" style={{ padding: '16px', margin: 0 }}>
            <h4 style={{ margin: '0 0 12px 0', textTransform: 'capitalize', color: 'var(--primary)', fontSize: '14px' }}>{ev.mes}</h4>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase' }}>Periodo Estimado</div>
                <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="#FF4D4D" /> {ev.fechaPeriodo.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div style={{ width: '1px', background: 'rgba(0,0,0,0.05)' }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase' }}>Ovulación</div>
                <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="#BA68C8" /> {ev.fechaOvulacion.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center', color: 'var(--text-light)', fontSize: '12px', padding: '0 20px' }}>
        <p>⚠️ Las predicciones son estimaciones basadas en tus datos históricos y no deben usarse como método anticonceptivo.</p>
      </div>
    </div>
  );
}
