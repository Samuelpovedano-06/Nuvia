import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Zap, Heart, Calendar, TrendingUp, Lightbulb, MessageCircle, BarChart2, Droplets, Moon, Coffee, RefreshCw } from 'lucide-react';

const OvuloIcon = ({ size = 40, color = '#C084FC', opacity = 1 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ opacity }}>
    {/* Halo exterior (Zona Pelúcida) */}
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="0.5" strokeDasharray="2 1" opacity="0.5" />
    <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.2" opacity="0.8" />

    {/* Cuerpo del óvulo (Citoplasma) */}
    <circle cx="12" cy="12" r="6" fill={color} opacity="0.15" />

    {/* Núcleo con brillo */}
    <circle cx="12" cy="12" r="2.5" fill={color} opacity="0.4" stroke={color} strokeWidth="1" />
    <circle cx="11.2" cy="11.2" r="0.8" fill="white" opacity="0.9" />

    {/* Pequeños destellos de vitalidad */}
    <circle cx="17" cy="8" r="0.5" fill={color} />
    <circle cx="18.5" cy="12" r="0.7" fill={color} opacity="0.6" />
    <circle cx="7" cy="15" r="0.6" fill={color} opacity="0.8" />
  </svg>
);
import { ApiService } from '../api';

const calcPuntosClave = (duracion) => {
  const ov = Math.max(7, duracion - 14);
  const p2 = Math.round(duracion * 0.18);
  const p3 = Math.round((p2 + ov) / 2);
  const p5 = ov + Math.round((duracion - ov) * 0.35);
  const p6 = ov + Math.round((duracion - ov) * 0.72);
  return [...new Set([1, p2, p3, ov, p5, p6, duracion])]
    .filter(d => d >= 1 && d <= duracion)
    .sort((a, b) => a - b);
};

const getPuntosDetalle = (puntosClave) => {
  const [d1, d2, d3, d4, d5, d6, d7] = puntosClave;
  const r = {};
  if (d1) r[d1] = { title: `Día ${d1}: Inicio`,        desc: 'Menstruación. Fase de renovación hormonal.' };
  if (d2) r[d2] = { title: `Día ${d2}: Transición`,     desc: 'Fin del periodo. Los estrógenos suben.' };
  if (d3) r[d3] = { title: `Día ${d3}: Ventana Fértil`, desc: 'Inicio ventana fértil. Aumenta la energía.' };
  if (d4) r[d4] = { title: `Día ${d4}: Ovulación`,      desc: 'Pico de fertilidad. Te sientes radiante.',
    icon: <div style={{ background: '#FAF5FF', padding: '10px', borderRadius: '50%' }}><OvuloIcon size={32} /></div> };
  if (d5) r[d5] = { title: `Día ${d5}: Fase Lútea`,     desc: 'La progesterona empieza a dominar.' };
  if (d6) r[d6] = { title: `Día ${d6}: Pico Lúteo`,     desc: 'Posibles síntomas premenstruales.' };
  if (d7) r[d7] = { title: `Día ${d7}: Cierre`,         desc: 'Preparación para el nuevo ciclo.' };
  return r;
};

const getYOnCurve = (x, ovulacionX, width, height) => {
  const y0 = height - 20;
  const yPeak = 20;
  const bezierY = (t, p0, p1, p2, p3) =>
    (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3;
  const bezierX = (t, p0, p1, p2, p3) =>
    (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3;

  const findT = (targetX, x0, x1, x2, x3) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      bezierX(mid, x0, x1, x2, x3) < targetX ? (lo = mid) : (hi = mid);
    }
    return (lo + hi) / 2;
  };

  if (x <= ovulacionX) {
    const t = findT(x, 0, ovulacionX * 0.4, ovulacionX * 0.8, ovulacionX);
    return bezierY(t, y0, y0, yPeak, yPeak);
  } else {
    const t = findT(x, ovulacionX, ovulacionX * 1.2, width, width);
    return bezierY(t, yPeak, yPeak, y0, y0);
  }
};

const CycleGraph = ({ diaActual, duracion = 28, onSelectPoint, selectedPoint }) => {
  const width = 800;
  const height = 120;
  const puntosClave = calcPuntosClave(duracion);
  const ovulacion = Math.max(7, duracion - 14);
  const ovulacionX = (ovulacion / duracion) * width;
  const getX = (dia) => (dia / duracion) * width;

  const pathData = `
    M 0,${height - 20}
    C ${ovulacionX * 0.4},${height - 20} ${ovulacionX * 0.8},20 ${ovulacionX},20
    S ${width},${height - 20} ${width},${height - 20}
  `;

  return (
    <div style={{ width: '100%', padding: '20px 0', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height + 40}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
        <line x1="0" y1={height} x2={width} y2={height} stroke="var(--primary-light)" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
        <path d={pathData} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />

        {puntosClave.map((dia) => {
          const x = getX(dia);
          const y = getYOnCurve(x, ovulacionX, width, height);
          const isSelected = selectedPoint === dia;
          return (
            <g key={dia} onClick={() => onSelectPoint(dia)} style={{ cursor: 'pointer' }}>
              {isSelected && <circle cx={x} cy={y} r="10" fill="var(--primary)" opacity="0.2" />}
              <circle cx={x} cy={y} r={isSelected ? "7" : "5"} fill={isSelected ? "var(--primary)" : "#fff"} stroke="var(--primary)" strokeWidth="2.5" />
              <text x={x} y={height + 25} fontSize="11" fill="var(--text-light)" textAnchor="middle" fontWeight={isSelected ? "bold" : "normal"}>Día {dia}</text>
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
  const [data, setData] = useState({ diaActual: 1, duracion: 28 });
  const [selectedPoint, setSelectedPoint] = useState(14);

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
          inicio = new Date();
          inicio.setDate(hoy.getDate() - 1);
        }

        const diaActual = (Math.floor((hoy - inicio) / (86400000)) % duracion) + 1;
        const proximoPeriodo = new Date(inicio.getTime() + duracion * 86400000);
        const ovulacion = new Date(proximoPeriodo.getTime() - 14 * 86400000);

        setData({ diaActual, duracion, proximoPeriodo, ovulacion });
        setSelectedPoint(Math.max(7, duracion - 14));
      } catch (err) {
        console.error(err);
      }
      finally { setLoading(false); }
    };
    init();
  }, []);

  if (loading) return <div className="screen-container" style={{ justifyContent: 'center', alignItems: 'center' }}><div className="loader"></div></div>;

  const puntosClave = calcPuntosClave(data.duracion);
  const puntosDetalle = getPuntosDetalle(puntosClave);
  const ovulacionDia = Math.max(7, data.duracion - 14);
  const tooltipInfo = puntosDetalle[selectedPoint] || puntosDetalle[ovulacionDia];

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
                  {new Date(data.ovulacion.getTime() - 3 * 86400000).toLocaleDateString('es-ES', { day: 'numeric' })} - {new Date(data.ovulacion.getTime() + 1 * 86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </>
              ) : 'Pendiente'}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#5B21B6' }}>
              Comienza en {data.ovulacion ? Math.max(0, Math.floor((new Date(data.ovulacion.getTime() - 3 * 86400000) - new Date()) / 86400000)) : '—'} días • 5 días de duración
            </p>
          </div>

          {/* Ovulación */}
          <div className="card" style={{
            background: 'linear-gradient(to right, #FAF5FF, #F3E8FF)',
            borderLeft: '5px solid #C084FC', padding: '20px', position: 'relative'
          }}>
            <div style={{ position: 'absolute', right: '20px', top: '15px' }}>
              <OvuloIcon size={50} color="#C084FC" opacity={0.18} />
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
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Tu ciclo ha sido consistente en los últimos 3 meses ({data.duracion - 1}-{data.duracion + 1} días)</div>
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
