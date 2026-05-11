import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, TrendingUp, Info } from 'lucide-react';
import { ApiService } from '../api';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const OvuloIcon = ({ size = 40, color = '#C084FC', opacity = 1 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ opacity }}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="0.5" strokeDasharray="2 1" opacity="0.5" />
    <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.2" opacity="0.8" />
    <circle cx="12" cy="12" r="6" fill={color} opacity="0.15" />
    <circle cx="12" cy="12" r="2.5" fill={color} opacity="0.4" stroke={color} strokeWidth="1" />
    <circle cx="11.2" cy="11.2" r="0.8" fill="white" opacity="0.9" />
  </svg>
);

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
  if (d1) r[d1] = { title: `Día ${d1}: Inicio`, desc: 'Menstruación. Fase de renovación.' };
  if (d2) r[d2] = { title: `Día ${d2}: Transición`, desc: 'Estrógenos subiendo.' };
  if (d3) r[d3] = { title: `Día ${d3}: Ventana Fértil`, desc: 'Energía en aumento.' };
  if (d4) r[d4] = { title: `Día ${d4}: Ovulación`, desc: 'Pico de fertilidad.', icon: <OvuloIcon size={24} /> };
  if (d5) r[d5] = { title: `Día ${d5}: Fase Lútea`, desc: 'Progesterona activa.' };
  if (d6) r[d6] = { title: `Día ${d6}: Pico Lúteo`, desc: 'Posibles síntomas pre.' };
  if (d7) r[d7] = { title: `Día ${d7}: Cierre`, desc: 'Fin del ciclo actual.' };
  return r;
};

const getYOnCurve = (x, ovulacionX, width, height) => {
  const y0 = height - 10;
  const yPeak = 10;
  const bezierY = (t, p0, p1, p2, p3) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3;
  const bezierX = (t, p0, p1, p2, p3) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3;
  const findT = (targetX, x0, x1, x2, x3) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) {
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

const CycleGraph = ({ duracion = 28, onSelectPoint, selectedPoint }) => {
  const width = 800;
  const height = 60;
  const puntosClave = calcPuntosClave(duracion);
  const ovulacion = Math.max(7, duracion - 14);
  const ovulacionX = (ovulacion / duracion) * width;
  const getX = (dia) => (dia / duracion) * width;
  const pathData = `M 0,${height - 10} C ${ovulacionX * 0.4},${height - 10} ${ovulacionX * 0.8},10 ${ovulacionX},10 S ${width},${height - 10} ${width},${height - 10}`;

  return (
    <div style={{ width: '100%', padding: '10px 0', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height + 20}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
        <path d={pathData} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        {puntosClave.map((dia) => {
          const x = getX(dia);
          const y = getYOnCurve(x, ovulacionX, width, height);
          const isSelected = selectedPoint === dia;
          return (
            <g key={dia} onClick={() => onSelectPoint(dia)} style={{ cursor: 'pointer' }}>
              <circle cx={x} cy={y} r={isSelected ? "6" : "4"} fill={isSelected ? "var(--primary)" : "#fff"} stroke="var(--primary)" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function CalendarScreen() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [ciclos, setCiclos] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState(14);
  const [diaActual, setDiaActual] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ciclosData, configData] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig()
        ]);
        setCiclos(ciclosData);
        setConfig(configData);
        
        if (ciclosData.length > 0) {
          const duracion = configData?.duracion_ciclo || 28;
          const hoy = new Date();
          const inicio = new Date(ciclosData[0].fecha_inicio);
          const d = (Math.floor((hoy - inicio) / 86400000) % duracion) + 1;
          setDiaActual(d);
          setSelectedPoint(Math.max(7, duracion - 14));
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  const isFuture = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return checkDate > today;
  };

  const getDayStatus = (day) => {
    // Función auxiliar para obtener YYYY-MM-DD en hora LOCAL
    const toLocalYMD = (date) => {
      const d = new Date(date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayNum}`;
    };

    // Fecha actual de la celda del calendario
    const dObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dStr = toLocalYMD(dObj);

    // 1. Verificar si es un día de periodo REAL (registrado)
    const isPeriodoReal = ciclos.some(c => {
      const inicioStr = toLocalYMD(c.fecha_inicio);
      const duracionP = config?.duracion_periodo || 5;
      
      let finStr;
      if (c.fecha_fin) {
        finStr = toLocalYMD(c.fecha_fin);
      } else {
        const finDate = new Date(c.fecha_inicio);
        finDate.setDate(finDate.getDate() + (duracionP - 1));
        finStr = toLocalYMD(finDate);
      }
      
      return dStr >= inicioStr && dStr <= finStr;
    });

    if (isPeriodoReal) return 'periodo';

    // 2. Predicciones continuas si hay configuración
    if (config && ciclos.length > 0) {
      const ultimoCiclo = ciclos[0]; 
      const inicioUltimo = new Date(ultimoCiclo.fecha_inicio);
      inicioUltimo.setHours(0,0,0,0);
      dObj.setHours(0,0,0,0);

      const duracion = config.duracion_ciclo || 28;
      const diffTime = dObj.getTime() - inicioUltimo.getTime();
      const diffDays = Math.floor(diffTime / 86400000);
      
      let diaCiclo = ((diffDays % duracion) + duracion) % duracion + 1;
      const duracionP = config?.duracion_periodo || 5;
      
      const ovulacionBase = duracion - 14;
      const inicioFertilBase = ovulacionBase - 3;
      const ventanaInicio = Math.max(duracionP + 4, inicioFertilBase); 
      const ovulacion = ventanaInicio + 3;
      const ventanaFin = ovulacion + 1;

      if (diaCiclo <= duracionP) return 'prediccion-periodo';
      if (diaCiclo < ventanaInicio) return 'folicular';
      if (diaCiclo === ovulacion) return 'ovulacion'; 
      if (diaCiclo >= ventanaInicio && diaCiclo <= ventanaFin) return 'fertil';
    }

    return null;
  };

  if (loading) return <div className="screen-container"><div className="loader"></div></div>;

  const puntosClave = calcPuntosClave(config?.duracion_ciclo || 28);
  const puntosDetalle = getPuntosDetalle(puntosClave);
  const tooltipInfo = puntosDetalle[selectedPoint] || {};

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span>Volver</span>
        </button>
      </div>

      {/* Sección Superior: Evolución del Ciclo (Fusión de Predicciones) */}
      <div className="card" style={{ padding: '20px', marginBottom: '25px', background: 'white' }}>
        <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0' }}>
          <TrendingUp size={18} color="var(--primary)" /> Centro de Ciclo
        </h3>
        <CycleGraph 
          duracion={config?.duracion_ciclo || 28} 
          onSelectPoint={setSelectedPoint} 
          selectedPoint={selectedPoint} 
        />
        <div style={{
          marginTop: '15px', background: '#FDF2F8', padding: '12px', borderRadius: '15px',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div style={{ background: 'white', padding: '8px', borderRadius: '50%' }}>{tooltipInfo.icon || <Info size={18} color="var(--primary)" />}</div>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '14px' }}>{tooltipInfo.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dark)' }}>{tooltipInfo.desc}</div>
          </div>
        </div>
      </div>

      {/* Sección Inferior: Calendario */}
      <div className="card" style={{ padding: '20px', maxWidth: '400px', margin: '0 auto 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><ChevronLeft /></button>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--primary)' }}>{MESES[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><ChevronRight /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', marginBottom: '10px' }}>
          {DIAS_SEMANA.map(d => <div key={d} style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-light)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
          {Array.from({ length: getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => <div key={`e-${i}`} className="calendar-day empty"></div>)}
          {Array.from({ length: getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
            const d = i + 1;
            const status = getDayStatus(d);
            const future = isFuture(d);
            return (
              <div key={d} className={`calendar-day ${status || ''} ${isToday(d) ? 'today' : ''} ${future ? 'future' : ''}`} onClick={() => !future && navigate('/sintomas')}>
                <span className="day-number">{d}</span>
                {status === 'ovulacion' && <Sparkles size={10} className="ovulacion-icon" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="card" style={{ padding: '16px', maxWidth: '400px', margin: '0 auto 40px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-dark)' }}>Leyenda del Ciclo</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ff4d4d' }}></div>
            <span>Periodo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', border: '1px dashed #A855F7', background: 'rgba(168, 85, 247, 0.1)' }}></div>
            <span>Predicción Regla</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(255, 183, 94, 0.2)' }}></div>
            <span>Fase Folicular</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', border: '1px dotted #F472B6', background: 'rgba(244, 114, 182, 0.1)' }}></div>
            <span>Ventana Fértil</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></div>
            <span>Ovulación</span>
          </div>
        </div>
      </div>

      <style>{`
        .calendar-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 14px; border-radius: 12px; cursor: pointer; position: relative; transition: 0.2s; color: var(--text-dark); background: #f9f9f9; }
        .calendar-day.empty { background: transparent !important; }
        .calendar-day.today { border: 2px solid var(--primary); font-weight: bold; }
        .calendar-day.periodo { background: #ff4d4d !important; color: white !important; }
        .calendar-day.prediccion-periodo { background: rgba(168, 85, 247, 0.1) !important; border: 1.5px dashed #A855F7; color: #6B21A8 !important; }
        .calendar-day.folicular { background: rgba(255, 183, 94, 0.1) !important; color: #ED8F03 !important; }
        .calendar-day.fertil { background: rgba(244, 114, 182, 0.1) !important; border: 1.5px dotted #F472B6; color: #9D174D !important; }
        .calendar-day.ovulacion { background: var(--primary) !important; color: white !important; font-weight: bold; }
        .ovulacion-icon { position: absolute; top: 2px; right: 2px; color: white; }
        body.dark-mode .card { background: #1a1a1a !important; color: white !important; border: 1px solid #333; }
        body.dark-mode .calendar-day { background: #2a2a2a; color: #eee; }
      `}</style>
    </div>
  );
}
