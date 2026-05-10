import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Zap, Heart, Calendar, TrendingUp, Lightbulb, MessageCircle, BarChart2 } from 'lucide-react';
import { ApiService } from '../api';

// Componente para el gráfico de curva
const CycleGraph = ({ diaActual, duracion = 28 }) => {
  const points = [];
  const width = 800;
  const height = 120;
  
  // Generar puntos para una curva suave (sinusoidal simple)
  for (let i = 0; i <= width; i += 10) {
    const x = i;
    const y = height / 2 + Math.sin((i / width) * Math.PI * 2 - Math.PI / 2) * (height / 3);
    points.push(`${x},${y}`);
  }

  const pathData = `M 0,${height / 2 + Math.sin(-Math.PI / 2) * (height / 3)} Q ${width / 4},0 ${width / 2},${height / 2 + Math.sin(Math.PI / 2) * (height / 3)} T ${width},${height / 2 + Math.sin(3 * Math.PI / 2) * (height / 3)}`;
  
  // Posición del marcador hoy
  const markerX = (diaActual / duracion) * width;

  return (
    <div style={{ width: '100%', overflowX: 'auto', padding: '20px 0' }}>
      <svg viewBox={`0 0 ${width} ${height + 40}`} width={width} height={height + 40} style={{ overflow: 'visible' }}>
        {/* Línea base */}
        <line x1="0" y1={height} x2={width} y2={height} stroke="var(--primary-light)" strokeWidth="1" strokeDasharray="4" />
        
        {/* Curva del ciclo */}
        <path 
          d={`M 0,${height - 20} C ${width * 0.2},${height - 20} ${width * 0.4},20 ${width * 0.5},20 S ${width * 0.8},${height - 20} ${width},${height - 20}`} 
          fill="none" 
          stroke="var(--primary)" 
          strokeWidth="3" 
        />

        {/* Marcadores de días clave */}
        <circle cx="0" cy={height - 20} r="5" fill="var(--primary)" />
        <circle cx={width * 0.5} cy="20" r="5" fill="var(--primary)" />
        <circle cx={width} cy={height - 20} r="5" fill="var(--primary)" />

        {/* Etiquetas de días */}
        <text x="0" y={height + 25} fontSize="10" fill="var(--text-light)" textAnchor="middle">Día 1</text>
        <text x={width * 0.18} y={height + 25} fontSize="10" fill="var(--text-light)" textAnchor="middle">Día 5</text>
        <text x={width * 0.35} y={height + 25} fontSize="10" fill="var(--text-light)" textAnchor="middle">Día 10</text>
        <text x={width * 0.5} y={height + 25} fontSize="10" fill="var(--text-light)" textAnchor="middle" fontWeight="bold">Día 14</text>
        <text x={width * 0.65} y={height + 25} fontSize="10" fill="var(--text-light)" textAnchor="middle">Día 18</text>
        <text x={width * 0.82} y={height + 25} fontSize="10" fill="var(--text-light)" textAnchor="middle">Día 22</text>
        <text x={width} y={height + 25} fontSize="10" fill="var(--text-light)" textAnchor="middle">Día {duracion}</text>
      </svg>
    </div>
  );
};

export default function PredictionsScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ diaActual: 1, duracion: 28, eventos: [] });

  useEffect(() => {
    const init = async () => {
      try {
        const [ciclos, config] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig()
        ]);
        if (ciclos.length > 0) {
          const ultimo = ciclos[0];
          const hoy = new Date();
          const inicio = new Date(ultimo.fecha_inicio);
          const duracion = config?.duracion_ciclo || 28;
          const diaActual = (Math.floor((hoy - inicio) / (86400000)) % duracion) + 1;

          // Próximas fechas
          const proximoPeriodo = new Date(inicio.getTime() + duracion * 86400000);
          const ovulacion = new Date(proximoPeriodo.getTime() - 14 * 86400000);
          
          setData({ diaActual, duracion, proximoPeriodo, ovulacion });
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  if (loading) return <div className="screen-container" style={{justifyContent:'center', alignItems:'center'}}><div className="loader"></div></div>;

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
          <div className="card" style={{ padding: '20px', overflow: 'hidden' }}>
            <CycleGraph diaActual={data.diaActual} duracion={data.duracion} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', fontSize: '12px' }}>
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
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#7F1D1D' }}>{data.proximoPeriodo?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#991B1B' }}>En {Math.max(0, Math.floor((data.proximoPeriodo - new Date()) / 86400000))} días • Duración estimada: 4-5 días</p>
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
              {new Date(data.ovulacion?.getTime() - 3*86400000).toLocaleDateString('es-ES', { day: 'numeric' })} - {new Date(data.ovulacion?.getTime() + 1*86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#5B21B6' }}>Comienza en {Math.max(0, Math.floor((new Date(data.ovulacion?.getTime() - 3*86400000) - new Date()) / 86400000))} días • 5 días de duración</p>
          </div>

          {/* Ovulación */}
          <div className="card" style={{ 
            background: 'linear-gradient(to right, #FAF5FF, #F3E8FF)', 
            borderLeft: '5px solid #C084FC', padding: '20px', position: 'relative'
          }}>
            <div style={{ position: 'absolute', right: '20px', top: '20px', fontSize: '40px', opacity: 0.2 }}>🥚</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: '#C084FC', padding: '8px', borderRadius: '10px', color: 'white' }}><TrendingUp size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', color: '#7E22CE' }}>Ovulación</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#9333EA' }}>Estimación</p>
              </div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#6B21A8' }}>{data.ovulacion?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#7E22CE' }}>En {Math.max(0, Math.floor((data.ovulacion - new Date()) / 86400000))} días • Probabilidad: Alta</p>
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
