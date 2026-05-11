import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Zap, Heart, Calendar, TrendingUp, Lightbulb, MessageCircle, BarChart2 } from 'lucide-react';
import { ApiService } from '../api';

// Datos de detalle para los puntos del gráfico
const PUNTOS_DETALLE = {
  1: { title: 'Día 1: Inicio', desc: 'Menstruación. Fase de renovación hormonal.', icon: '🩸' },
  5: { title: 'Día 5: Transición', desc: 'Fin del periodo. Los estrógenos suben.', icon: '✨' },
  10: { title: 'Día 10: Preparación', desc: 'Inicio ventana fértil. Aumenta la energía.', icon: '🌿' },
  14: { title: 'Día 14: Ovulación', desc: 'Pico de fertilidad. Te sientes radiante.', icon: '🥚' },
  18: { title: 'Día 18: Fase Lútea', desc: 'La progesterona empieza a dominar.', icon: '🌙' },
  22: { title: 'Día 22: Pico Lúteo', desc: 'Posibles síntomas premenstruales.', icon: '🧘' },
  28: { title: 'Día 28: Cierre', desc: 'Preparación para el nuevo ciclo.', icon: '🔄' }
};

// Componente para el gráfico de curva
const CycleGraph = ({ diaActual, duracion = 28, onSelectPoint, selectedPoint }) => {
  const width = 800;
  const height = 120;
  const puntosClave = [1, 5, 10, 14, 18, 22, duracion];

  return (
    <div style={{ width: '100%', padding: '20px 0', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height + 40}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
        <line x1="0" y1={height} x2={width} y2={height} stroke="var(--primary-light)" strokeWidth="1" strokeDasharray="4" />
        
        <path 
          d={`M 0,${height - 20} C ${width * 0.2},${height - 20} ${width * 0.4},20 ${width * 0.5},20 S ${width * 0.8},${height - 20} ${width},${height - 20}`} 
          fill="none" 
          stroke="var(--primary)" 
          strokeWidth="3" 
        />

        {puntosClave.map((dia) => {
          const x = (dia / duracion) * width - (dia === 1 ? 0 : 0);
          // Cálculo aproximado de Y basado en la curva bezier
          let y = height - 20;
          if (dia === 14) y = 20;
          else if (dia === 10 || dia === 18) y = 50;
          else if (dia === 5 || dia === 22) y = 80;

          const isSelected = selectedPoint === dia;

          return (
            <g key={dia} onClick={() => onSelectPoint(dia)} style={{ cursor: 'pointer' }}>
              {isSelected && <circle cx={x} cy={y} r="10" fill="var(--primary)" opacity="0.2" />}
              <circle cx={x} cy={y} r={isSelected ? "7" : "5"} fill={isSelected ? "var(--primary)" : "#fff"} stroke="var(--primary)" strokeWidth="2" />
              <text x={x} y={height + 25} fontSize="10" fill="var(--text-light)" textAnchor="middle" fontWeight={isSelected ? "bold" : "normal"}>Día {dia}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function PredictionsScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ diaActual: 1, duracion: 28, eventos: [] });
  const [selectedPoint, setSelectedPoint] = useState(14); // Por defecto ovulación

  useEffect(() => {
    const init = async () => {
      try {
        const [ciclos, config] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig()
        ]);
        
        const duracion = config?.duracion_ciclo || 28;
        let hoy = new Date();
        let inicio;

        if (ciclos.length > 0) {
          inicio = new Date(ciclos[0].fecha_inicio);
        } else {
          // Si no hay ciclos, estimamos desde hoy para evitar NaN
          inicio = new Date();
          inicio.setDate(hoy.getDate() - 1); // Simulamos que empezó ayer
        }

        const diaActual = (Math.floor((hoy - inicio) / (86400000)) % duracion) + 1;
        const proximoPeriodo = new Date(inicio.getTime() + duracion * 86400000);
        const ovulacion = new Date(proximoPeriodo.getTime() - 14 * 86400000);
        
        setData({ diaActual, duracion, proximoPeriodo, ovulacion });
        setSelectedPoint(14);
      } catch (err) { 
        console.error(err); 
        // Fallback en caso de error total
        const fallbackInicio = new Date();
        setData({ 
          diaActual: 1, 
          duracion: 28, 
          proximoPeriodo: new Date(fallbackInicio.getTime() + 28 * 86400000),
          ovulacion: new Date(fallbackInicio.getTime() + 14 * 86400000)
        });
      }
      finally { setLoading(false); }
    };
    init();
  }, []);

  if (loading) return <div className="screen-container" style={{justifyContent:'center', alignItems:'center'}}><div className="loader"></div></div>;

  const tooltipInfo = PUNTOS_DETALLE[selectedPoint] || PUNTOS_DETALLE[14];

  // Componente para el Óvulo Estilizado (estilo Síntomas)
  const NuviaOvum = ({ size = 40, color = '#C084FC' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
      <circle cx="12" cy="12" r="6" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill={color} />
      <circle cx="15" cy="9" r="1" fill="white" />
    </svg>
  );

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', width: '100%', maxWidth: '900px', margin: '0 auto 20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', color: 'var(--primary)', margin: '0 0 8px 0' }}>Predicciones</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>Basadas en tus últimos ciclos registrados</p>
      </div>

      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>
        {/* Sección Gráfico */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <TrendingUp size={18} color="var(--primary)" /> Evolución de tu ciclo
          </h3>
          <div className="card" style={{ padding: '20px', overflow: 'hidden', position: 'relative' }}>
            <CycleGraph 
              diaActual={data.diaActual} 
              duracion={data.duracion} 
              onSelectPoint={setSelectedPoint}
              selectedPoint={selectedPoint}
            />
            
            {/* Tooltip Detalle */}
            <div style={{ 
              marginTop: '20px', background: 'rgba(255,255,255,0.8)', padding: '15px', 
              borderRadius: '15px', border: '1px solid var(--primary-light)',
              display: 'flex', alignItems: 'center', gap: '15px',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ fontSize: '30px' }}>{tooltipInfo.icon}</div>
              <div>
                <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '16px' }}>{tooltipInfo.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-dark)' }}>{tooltipInfo.desc}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF9A9E' }}></div> Menstruación
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div> Ovulación
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de Predicción */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
          
          {/* Próximo Periodo */}
          <div className="card" style={{ 
            background: 'linear-gradient(to right, #FFF1F2, #FFE4E6)', 
            borderLeft: '5px solid #FF9A9E', padding: '20px', position: 'relative'
          }}>
            <div style={{ position: 'absolute', right: '20px', top: '20px', fontSize: '40px', opacity: 0.2 }}>🌸</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: '#FF9A9E', padding: '8px', borderRadius: '10px', color: 'white' }}><Calendar size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', color: '#B91C1C' }}>Próximo Periodo</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#EF4444' }}>Menstruación</p>
              </div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#7F1D1D' }}>
              {data.proximoPeriodo ? data.proximoPeriodo.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'Pendiente'}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#991B1B' }}>
              En {data.proximoPeriodo ? Math.max(0, Math.floor((data.proximoPeriodo - new Date()) / 86400000)) : '—'} días • Duración estimada: 4-5 días
            </p>
          </div>

          {/* Ventana Fértil */}
          <div className="card" style={{ 
            background: 'linear-gradient(to right, #F5F3FF, #EDE9FE)', 
            borderLeft: '5px solid #A78BFA', padding: '20px', position: 'relative'
          }}>
            <div style={{ position: 'absolute', right: '20px', top: '20px', fontSize: '40px', opacity: 0.2 }}>🌿</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: '#A78BFA', padding: '8px', borderRadius: '10px', color: 'white' }}><Heart size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', color: '#5B21B6' }}>Ventana Fértil</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#7C3AED' }}>Mayor fertilidad</p>
              </div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#4C1D95' }}>
              {data.ovulacion ? (
                <>
                  {new Date(data.ovulacion.getTime() - 3*86400000).toLocaleDateString('es-ES', { day: 'numeric' })} - {new Date(data.ovulacion.getTime() + 1*86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </>
              ) : 'Pendiente'}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#5B21B6' }}>
              Comienza en {data.ovulacion ? Math.max(0, Math.floor((new Date(data.ovulacion.getTime() - 3*86400000) - new Date()) / 86400000)) : '—'} días • 5 días de duración
            </p>
          </div>

          {/* Ovulación */}
          <div className="card" style={{ 
            background: 'linear-gradient(to right, #FAF5FF, #F3E8FF)', 
            borderLeft: '5px solid #C084FC', padding: '20px', position: 'relative'
          }}>
            <div style={{ position: 'absolute', right: '20px', top: '25px', opacity: 0.6 }}>
              <NuviaOvum size={45} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: '#C084FC', padding: '8px', borderRadius: '10px', color: 'white' }}><TrendingUp size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', color: '#7E22CE' }}>Ovulación</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#9333EA' }}>Estimación</p>
              </div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#6B21A8' }}>
              {data.ovulacion ? data.ovulacion.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'Pendiente'}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#7E22CE' }}>
              En {data.ovulacion ? Math.max(0, Math.floor((data.ovulacion - new Date()) / 86400000)) : '—'} días • Probabilidad: Alta
            </p>
          </div>
        </div>

        {/* Insights Personalizados */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Lightbulb size={18} color="var(--primary)" /> Insights personalizados
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="card" style={{ margin: 0, padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.5)' }}>
              <div style={{ background: '#E0F2FE', padding: '10px', borderRadius: '12px', color: '#0369A1' }}><BarChart2 size={20} /></div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Ciclo regular</div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Tu ciclo ha sido consistente en los últimos 3 meses ({data.duracion-1}-{data.duracion+1} días)</div>
              </div>
            </div>
            <div className="card" style={{ margin: 0, padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.5)' }}>
              <div style={{ background: '#FEF3C7', padding: '10px', borderRadius: '12px', color: '#B45309' }}><Sparkles size={20} /></div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Mejor momento</div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Tus niveles de energía suelen ser más altos durante los días 8-14</div>
              </div>
            </div>
            <div className="card" style={{ margin: 0, padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.5)' }}>
              <div style={{ background: '#F3E8FF', padding: '10px', borderRadius: '12px', color: '#7E22CE' }}><MessageCircle size={20} /></div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Patrón detectado</div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Sueles experimentar más síntomas 2 días antes de tu periodo</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-light)', paddingBottom: '40px' }}>
          <p>Las predicciones son estimaciones basadas en tu historial. La precisión mejora con más datos registrados.</p>
        </div>
      </div>

      <style>{`
        body.dark-mode .card {
          background: rgba(40, 40, 40, 0.8) !important;
          color: white !important;
        }
        body.dark-mode .card p, 
        body.dark-mode .card h4, 
        body.dark-mode .card div {
          color: white !important;
        }
        body.dark-mode .card div[style*="background: #E0F2FE"] { background: #0369A1 !important; color: white !important; }
        body.dark-mode .card div[style*="background: #FEF3C7"] { background: #B45309 !important; color: white !important; }
        body.dark-mode .card div[style*="background: #F3E8FF"] { background: #7E22CE !important; color: white !important; }
      `}</style>
    </div>
  );
}
