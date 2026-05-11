import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { ApiService } from '../api';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CalendarScreen() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [ciclos, setCiclos] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ciclosData, configData] = await Promise.all([
          ApiService.getCiclos(),
          ApiService.getConfig()
        ]);
        setCiclos(ciclosData);
        setConfig(configData);
      } catch (err) {
        console.error("Error cargando datos del calendario:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Ajustar para que lunes sea 0
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  const isFuture = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return checkDate > today;
  };

  // Lógica simple de detección de días de periodo (basada en ciclos registrados)
  const getDayStatus = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(dateStr);

    // 1. Verificar si es un día de periodo REAL (registrado)
    const isPeriodoReal = ciclos.some(c => {
      const inicio = new Date(c.fecha_inicio);
      const duracionP = config?.duracion_periodo || 5;
      const fin = c.fecha_fin ? new Date(c.fecha_fin) : new Date(inicio.getTime() + (duracionP - 1) * 24 * 60 * 60 * 1000);
      return dateObj >= inicio && dateObj <= fin;
    });

    if (isPeriodoReal) return 'periodo';

    // 2. Predicciones continuas si hay configuración
    if (config && ciclos.length > 0) {
      const ultimoCiclo = ciclos[0]; 
      const inicioUltimo = new Date(ultimoCiclo.fecha_inicio);
      const duracion = config.duracion_ciclo || 28;
      
      // Calcular cuántos días han pasado desde el último inicio registrado
      const diffTime = dateObj.getTime() - inicioUltimo.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Normalizar día al rango [1, duracion] usando módulo
      let diaCiclo = ((diffDays % duracion) + duracion) % duracion + 1;

      const duracionP = config?.duracion_periodo || 5;
      
      // Asegurar que la ventana fértil empiece al menos 3 días después de la regla
      const minInicioFertil = duracionP + 3;
      const ovulacionCalculada = duracion - 14;
      const ovulacion = Math.max(minInicioFertil + 3, ovulacionCalculada); 
      
      const ventanaInicio = ovulacion - 3;
      const ventanaFin = ovulacion + 1;

      // Definición de fases Dinámica
      if (diaCiclo <= duracionP) return 'prediccion-periodo';
      if (diaCiclo < ventanaInicio) return 'folicular';
      if (diaCiclo === ovulacion) return 'ovulacion'; 
      if (diaCiclo >= ventanaInicio && diaCiclo <= ventanaFin) return 'fertil';
      
      return null; 
    }

    return null;
  };

  const renderDays = () => {
    const days = [];
    const totalDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    // Espacios vacíos
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Días del mes
    for (let d = 1; d <= totalDays; d++) {
      const status = getDayStatus(d);
      const future = isFuture(d);
      days.push(
        <div
          key={d}
          className={`calendar-day ${status || ''} ${isToday(d) ? 'today' : ''} ${future ? 'future' : ''}`}
          onClick={() => !future && navigate('/sintomas')}
        >
          <span className="day-number">{d}</span>
          {status === 'ovulacion' && <Sparkles size={10} className="ovulacion-icon" />}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', width: '100%', maxWidth: '800px', margin: '0 auto 20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <CalendarIcon color="var(--primary)" /> Calendario Nuvia
        </h2>
        <p className="subtitle">Visualiza tu ciclo y planifica tus días</p>
      </div>

      <div className="card" style={{ padding: '20px', maxWidth: '400px', margin: '0 auto 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><ChevronLeft /></button>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--primary)' }}>
            {MESES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><ChevronRight /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', marginBottom: '10px' }}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)', padding: '5px 0' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
          {renderDays()}
        </div>
      </div>

      {/* Leyenda */}
      <div className="card" style={{ padding: '16px', maxWidth: '400px', margin: '0 auto' }}>
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
        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          border-radius: 12px;
          cursor: pointer;
          position: relative;
          transition: 0.2s;
          color: var(--text-dark);
          background: var(--white);
        }
        .calendar-day:hover {
          background: #f0f0f0;
        }
        .calendar-day.future {
          cursor: not-allowed;
        }
        .calendar-day.future .day-number {
          opacity: 0.5;
        }
        body.dark-mode .calendar-day:hover {
          background: #333;
        }
        .calendar-day.empty {
          cursor: default;
          background: transparent !important;
        }
        .calendar-day.today {
          border: 2px solid var(--primary);
          font-weight: bold;
        }
        .calendar-day.periodo {
          background: #ff4d4d !important;
          color: white !important;
        }
        .calendar-day.prediccion-periodo {
          background: rgba(168, 85, 247, 0.1) !important;
          border: 1.5px dashed #A855F7;
          color: #6B21A8 !important;
        }
        .calendar-day.folicular {
          background: rgba(255, 183, 94, 0.1) !important;
          color: #ED8F03 !important;
        }
        .calendar-day.fertil {
          background: rgba(244, 114, 182, 0.1) !important;
          border: 1.5px dotted #F472B6;
          color: #9D174D !important;
        }
        .calendar-day.ovulacion {
          background: var(--primary) !important;
          color: white !important;
          font-weight: bold;
          box-shadow: 0 0 10px rgba(156, 39, 176, 0.3);
        }
        .ovulacion-icon {
          position: absolute;
          top: 4px;
          right: 4px;
          color: white;
        }
      `}</style>
    </div>
  );
}
