import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Coffee, Utensils, Zap, Moon, Heart, Info, Flower2 } from 'lucide-react';
import { ApiService } from '../api';

const ADVICE_DATABASE = {
  menstrual: {
    title: 'Fase Menstrual',
    subtitle: 'Tiempo de renovación y descanso',
    color: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)',
    bgLight: '#FFF1F2',
    icon: <Moon size={24} />,
    food: 'Alimentos ricos en hierro (espinacas, lentejas) y magnesio para los calambres.',
    exercise: 'Yoga suave, estiramientos o caminar tranquilo. Tu cuerpo necesita recuperar energía.',
    care: 'Aplica calor en el abdomen y prioriza el sueño. Es un buen momento para meditar.',
    mood: 'Puedes sentirte más introspectiva y con ganas de estar tranquila. Escucha a tu cuerpo.'
  },
  folicular: {
    title: 'Fase Folicular',
    subtitle: 'Tu energía empieza a despegar',
    color: 'linear-gradient(135deg, #FFB75E 0%, #ED8F03 100%)',
    bgLight: '#FFFBEB',
    icon: <Zap size={24} />,
    food: 'Carbohidratos complejos y alimentos probióticos. Tu metabolismo es más eficiente ahora.',
    exercise: 'Entrenamientos de fuerza o cardio moderado. Te sentirás con más potencia.',
    care: 'Momento ideal para probar rutinas nuevas de skin-care. Tu piel está más receptiva.',
    mood: 'Aumenta la creatividad y las ganas de socializar. Aprovecha para planificar proyectos.'
  },
  ovulatoria: {
    title: 'Fase Ovulatoria',
    subtitle: 'Tu pico máximo de vitalidad',
    color: 'linear-gradient(135deg, #BA68C8 0%, #9C27B0 100%)',
    bgLight: '#FAF5FF',
    icon: <Sparkles size={24} />,
    food: 'Alimentos antioxidantes y mucha hidratación. Evita el exceso de sal.',
    exercise: 'HIIT, running o actividades de alta intensidad. Estás en tu punto más fuerte.',
    care: 'Te sientes radiante. Es el mejor momento para eventos sociales o presentaciones importantes.',
    mood: 'Máxima confianza en ti misma y libido alta. Te sientes más comunicativa que nunca.'
  },
  lutea: {
    title: 'Fase Lútea',
    subtitle: 'Preparando el aterrizaje',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    bgLight: '#F0F9FF',
    icon: <Coffee size={24} />,
    food: 'Grasas saludables (aguacate, nueces) para estabilizar el azúcar y evitar antojos.',
    exercise: 'Pilates o cardio suave. No te exijas demasiado si sientes pesadez.',
    care: 'Baños relajantes y evitar el exceso de cafeína para reducir la ansiedad premenstrual.',
    mood: 'Puedes estar más sensible o irritable. Practica la autocompasión y descansa extra.'
  }
};

export default function WellnessScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('folicular');
  const [day, setDay] = useState(1);

  useEffect(() => {
    const fetchPhase = async () => {
      try {
        const [ciclos, config] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig()
        ]);

        if (ciclos.length > 0) {
          const ultimo = ciclos[0];
          const duracion = config?.duracion_ciclo || 28;
          const duracionP = config?.duracion_periodo || 5;
          const hoy = new Date();
          const inicio = new Date(ultimo.fecha_inicio);
          const diaActual = (Math.floor((hoy - inicio) / 86400000) % duracion) + 1;
          
          setDay(diaActual);
          
          // Lógica de fases para consejos
          if (diaActual <= duracionP) setPhase('menstrual');
          else if (diaActual < (duracion - 14) - 3) setPhase('folicular');
          else if (diaActual <= (duracion - 14) + 1) setPhase('ovulatoria');
          else setPhase('lutea');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPhase();
  }, []);

  if (loading) return <div className="screen-container" style={{ justifyContent: 'center', alignItems: 'center' }}><div className="loader"></div></div>;

  const currentAdvice = ADVICE_DATABASE[phase];

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '28px', color: 'var(--primary)', margin: '0 0 5px 0' }}>Nuvia Bienestar</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>Consejos personalizados para tu día {day}</p>
      </div>

      {/* Hero Card de Fase */}
      <div className="card" style={{ 
        background: currentAdvice.color, color: 'white', padding: '25px', 
        border: 'none', marginBottom: '25px', position: 'relative', overflow: 'hidden' 
      }}>
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.2 }}>
          <Flower2 size={150} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          {currentAdvice.icon}
          <span style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>Fase Actual</span>
        </div>
        <h3 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>{currentAdvice.title}</h3>
        <p style={{ margin: 0, opacity: 0.9 }}>{currentAdvice.subtitle}</p>
      </div>

      <div style={{ display: 'grid', gap: '15px', paddingBottom: '40px' }}>
        
        {/* Alimentación */}
        <div className="card" style={{ margin: 0, padding: '20px', background: 'white', display: 'flex', gap: '15px' }}>
          <div style={{ background: '#FFF7ED', padding: '12px', borderRadius: '15px', color: '#C2410C', height: 'fit-content' }}>
            <Utensils size={24} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#C2410C' }}>Alimentación</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#444', lineHeight: '1.5' }}>{currentAdvice.food}</p>
          </div>
        </div>

        {/* Ejercicio */}
        <div className="card" style={{ margin: 0, padding: '20px', background: 'white', display: 'flex', gap: '15px' }}>
          <div style={{ background: '#F0F9FF', padding: '12px', borderRadius: '15px', color: '#0369A1', height: 'fit-content' }}>
            <Zap size={24} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#0369A1' }}>Actividad Física</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#444', lineHeight: '1.5' }}>{currentAdvice.exercise}</p>
          </div>
        </div>

        {/* Autocuidado */}
        <div className="card" style={{ margin: 0, padding: '20px', background: 'white', display: 'flex', gap: '15px' }}>
          <div style={{ background: '#FDF2F8', padding: '12px', borderRadius: '15px', color: '#BE185D', height: 'fit-content' }}>
            <Heart size={24} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#BE185D' }}>Autocuidado</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#444', lineHeight: '1.5' }}>{currentAdvice.care}</p>
          </div>
        </div>

        {/* Estado de Ánimo */}
        <div className="card" style={{ margin: 0, padding: '20px', background: 'white', display: 'flex', gap: '15px' }}>
          <div style={{ background: '#F5F3FF', padding: '12px', borderRadius: '15px', color: '#6D28D9', height: 'fit-content' }}>
            <Info size={24} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#6D28D9' }}>Tu Energía</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#444', lineHeight: '1.5' }}>{currentAdvice.mood}</p>
          </div>
        </div>

      </div>

      <style>{`
        body.dark-mode .card:not([style*="background: linear-gradient"]) {
          background: #1f1f1f !important;
          border: 1px solid #333 !important;
        }
        body.dark-mode .card p {
          color: #ccc !important;
        }
      `}</style>
    </div>
  );
}
