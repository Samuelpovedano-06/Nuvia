import React, { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bell, Lock, Settings, User, LogOut, Pencil, Check, Moon, Sun, Download, FileBarChart, FileText, Activity, Utensils } from 'lucide-react';
import { ApiService } from '../api';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  return `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const calcPuntosClave = (duracion) => {
  const ov = Math.max(7, duracion - 14);
  const p2 = Math.round(duracion * 0.18);
  const p3 = Math.round((p2 + ov) / 2);
  const p5 = ov + Math.round((duracion - ov) * 0.35);
  const p6 = ov + Math.round((duracion - ov) * 0.72);
  return [...new Set([1, p2, p3, ov, p5, p6, duracion])].sort((a, b) => a - b);
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

const ReportGraph = ({ duracion = 28 }) => {
  const W = 800, H = 120, PAD = 20;
  const yBase = 70, yPeak = 12;
  const puntosClave = calcPuntosClave(duracion);
  const ovulacion = Math.max(7, duracion - 14);
  const ovX = PAD + ((ovulacion - 1) / (duracion - 1)) * (W - 2 * PAD);
  const endX = W - PAD;
  const getX = (dia) => PAD + ((dia - 1) / (duracion - 1)) * (W - 2 * PAD);

  const bez = (t, p0, p1, p2, p3) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3;
  const findT = (tx, x0, x1, x2, x3) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 25; i++) { const m = (lo + hi) / 2; bez(m, x0, x1, x2, x3) < tx ? (lo = m) : (hi = m); }
    return (lo + hi) / 2;
  };
  const getY = (x) => {
    if (x <= ovX) {
      const t = findT(x, PAD, ovX * 0.4, ovX * 0.85, ovX);
      return bez(t, yBase, yBase, yPeak, yPeak);
    }
    const t = findT(x, ovX, ovX * 1.15, endX, endX);
    return bez(t, yPeak, yPeak, yBase, yBase);
  };
  const pathD = `M ${PAD},${yBase} C ${ovX * 0.4},${yBase} ${ovX * 0.85},${yPeak} ${ovX},${yPeak} S ${endX},${yBase} ${endX},${yBase}`;

  return (
    <div style={{ width: '100%', background: '#fff' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <path d={pathD} fill="none" stroke="#9b6c98" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
        {puntosClave.map((dia) => {
          const x = getX(dia);
          const y = getY(x);
          return (
            <g key={dia}>
              <circle cx={x} cy={y} r="5.5" fill="#9b6c98" />
              <text x={x} y={yBase + 17} textAnchor="middle" fontSize="11" fill="#9b6c98" fontFamily="Inter, sans-serif">
                Día {dia}
              </text>
            </g>
          );
        })}
        <text x={PAD} y={yBase + 32} fontSize="10" fill="#bbb" fontFamily="Inter, sans-serif">Inicio del Ciclo</text>
        <text x={ovX} y={yBase + 32} textAnchor="middle" fontSize="10" fill="#bbb" fontFamily="Inter, sans-serif">Ovulación</text>
        <text x={endX} y={yBase + 32} textAnchor="end" fontSize="10" fill="#bbb" fontFamily="Inter, sans-serif">Fin del Ciclo</text>
      </svg>
    </div>
  );
};

// Lógica de iconos compartida para el reporte
const NuviaFace = ({ type, color = '#9b6c98' }) => {
  const faces = {
    'feliz': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="10" r="1" fill={color} />
        <circle cx="16" cy="10" r="1" fill={color} />
        <path d="M7 15c1.5 2 5.5 2 7 0" />
      </svg>
    ),
    'risa': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l3 2-3 2M18 9l-3 2 3 2" />
        <path d="M7 15c1 3 9 3 10 0z" fill={color} opacity="0.3" /><path d="M7 15c1 3 9 3 10 0" />
      </svg>
    ),
    'triste': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M8 9c-.5 1-1.5 1-2 0M18 9c-.5 1-1.5 1-2 0" /><path d="M8 17c1.5-2 6.5-2 8 0" />
      </svg>
    ),
    'molesta': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
        <path d="M6 10h4M14 10h4" /><path d="M8 17c1.5-2 6.5-2 8 0" strokeWidth="2.5" />
      </svg>
    ),
    'dolor_agudo': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8l3 2-3 2M18 8l-3 2 3 2" /><path d="M9 17h6" />
      </svg>
    ),
    'sensible': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="11" r="1" fill={color} /><circle cx="16" cy="11" r="1" fill={color} />
        <path d="M10 16c1 1 3 1 4 0" /><path d="M16 14v2" strokeWidth="2" opacity="0.6" />
      </svg>
    ),
    'irritable': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 8l3 2M18 8l-3 2" strokeWidth="3" />
        <circle cx="8" cy="13" r="1" fill={color} /><circle cx="16" cy="13" r="1" fill={color} /><path d="M9 18h6" />
      </svg>
    ),
    'variable': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="8" cy="10" r="1.5" fill={color} /><path d="M15 10l2 1" strokeWidth="3" /><path d="M7 17c2-2 6 2 8 0" />
      </svg>
    ),
    'enamorada': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill={color} stroke={color} strokeWidth="1">
        <path d="M8 7c-1.5-1.5-4 0-2 2.5 1 1 2 2 2 2s1-1 2-2c2-2.5-.5-4-2-2.5z" />
        <path d="M16 7c-1.5-1.5-4 0-2 2.5 1 1 2 2 2 2s1-1 2-2c2-2.5-.5-4-2-2.5z" />
        <path d="M8 16c1.5 2 6.5 2 8 0" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    'nauseas': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M8 9c0 1-1 1-1 0M17 9c0 1-1 1-1 0" /><path d="M7 16c1-1 2 1 3-1s2 1 3-1 2 1 3-1 2 1 3-1" />
      </svg>
    ),
    'ansiosa': (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 11l2-2 2 2M14 11l2-2 2 2" /><path d="M8 16h8l-1 1-1-1-1 1-1-1-1 1-1-1-1 1" />
      </svg>
    )
  };
  return faces[type] || faces['feliz'];
};

const SINTOMA_STYLE = {
  'Dolor Abdominal': { face: 'triste' },
  'Dolor de Cabeza': { face: 'triste' },
  'Pecho Sensible': { face: 'molesta' },
  'Hinchazón': { face: 'molesta' },
  'Cólicos': { face: 'dolor_agudo' },
  'Dolor de Espalda': { face: 'triste' },
  'Antojos': { icon: <Utensils size={18} /> },
  'Náuseas': { face: 'nauseas' },
  'Ansiedad': { face: 'ansiosa' },
  'Sensibilidad': { face: 'sensible' },
  'Irritabilidad': { face: 'irritable' },
  'Humor Variable': { face: 'variable' },
  'Euforia': { face: 'risa' },
  'Cansancio': { face: 'durmiendo' },
  'Manchada': { face: 'pena' },
  'Insomnio': { face: 'despierta' },
  'Libido Alta': { face: 'enamorada' }
};

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [ciclos, setCiclos] = useState([]);
  const [loadingCiclos, setLoadingCiclos] = useState(true);

  const [cycleDuration, setCycleDuration] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [durationSaved, setDurationSaved] = useState(false);
  const [periodSaved, setPeriodSaved] = useState(false);

  const [edad, setEdad] = useState('');
  const [editingEdad, setEditingEdad] = useState(false);
  const [edadInput, setEdadInput] = useState('');

  // Estados de configuración
  const [notificaciones, setNotificaciones] = useState(1);
  const [privacidadEstricta, setPrivacidadEstricta] = useState(0);
  const [modoOscuro, setModoOscuro] = useState(0);
  const [isCycleEditable, setIsCycleEditable] = useState(false);
  const [systemRanges, setSystemRanges] = useState({
    min_dias_ciclo: 21,
    max_dias_ciclo: 45,
    min_dias_periodo: 3,
    max_dias_periodo: 10
  });
  const [globalNotifsDisabled, setGlobalNotifsDisabled] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Cargar datos para el reporte
  const prepareReportData = async () => {
    setExporting(true);
    try {
      const [sintomas_raw, diarios_raw, sintomas_cat] = await Promise.all([
        ApiService.getRegistrosSintomas(),
        ApiService.getRegistrosDiarios(),
        ApiService.getSintomas()
      ]);

      const sintomaMap = {};
      sintomas_cat.forEach(s => { sintomaMap[s.id_sintoma] = s.nombre_sintoma; });

      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const logs = [];
      sintomas_raw?.forEach(s => {
        if (new Date(s.fecha) >= twoMonthsAgo)
          logs.push({ ...s, type: 'symptom', label: sintomaMap[s.id_sintoma] || 'Síntoma' });
      });
      diarios_raw?.forEach(d => {
        if (d.notas && new Date(d.fecha) >= twoMonthsAgo)
          logs.push({ ...d, type: 'note', label: d.notas });
      });

      logs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      setReportData({
        ciclos: ciclos.slice(0, 2),
        logs: logs,
        stats: {
          totalSintomas: sintomas_raw?.length || 0,
          totalNotas: diarios_raw?.filter(d => d.notas)?.length || 0
        }
      });

      setTimeout(async () => {
        const p1 = document.getElementById('nuvia-report-p1');
        const p2 = document.getElementById('nuvia-report-p2');
        if (!p1 || !p2) { setExporting(false); return; }

        const opts = { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' };
        const [canvas1, canvas2] = await Promise.all([
          html2canvas(p1, opts),
          html2canvas(p2, opts)
        ]);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();

        // Página 1: cabecera, calendarios, gráfica
        const h1 = (canvas1.height * pw) / canvas1.width;
        pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pw, h1);

        // Páginas 2+: historial (se divide si supera A4)
        const scale2 = pw / canvas2.width;
        const phPx = ph / scale2;
        const totalH2 = canvas2.height * scale2;
        let srcY = 0;
        while (srcY < canvas2.height) {
          pdf.addPage();
          pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, -(srcY * scale2), pw, totalH2);
          srcY += phPx;
        }

        pdf.save(`Informe_Salud_Nuvia_${user?.username || 'Usuario'}.pdf`);
        setExporting(false);
        setReportData(null);
      }, 1000);

    } catch (err) {
      console.error(err);
      setExporting(false);
    }
  };

  useEffect(() => {
    ApiService.getCiclos()
      .then(data => {
        setCiclos(data);
      })
      .catch(console.error)
      .finally(() => setLoadingCiclos(false));

    // Cargar configuración de la base de datos
    ApiService.getConfig()
      .then(config => {
        if (config) {
          if (config.duracion_ciclo) setCycleDuration(config.duracion_ciclo);
          if (config.duracion_periodo) setPeriodDuration(config.duracion_periodo);
          if (config.edad) setEdad(String(config.edad));
          setNotificaciones(config.notificaciones ?? 1);
          setPrivacidadEstricta(config.privacidad_estricta ?? 0);

          const dark = config.modo_oscuro ?? 0;
          setModoOscuro(dark);
          localStorage.setItem('nuvia_modo_oscuro', dark);
        }
      })
      .catch(err => {
        console.warn("No se pudo cargar la configuración, usando valor local:", err);
        const stored = localStorage.getItem('nuvia_cycle_duration');
        if (stored) setCycleDuration(Number(stored));
        const storedEdad = localStorage.getItem('nuvia_edad');
        if (storedEdad) setEdad(storedEdad);
      });
    // Cargar rangos del sistema
    if (user?.rol === 'admin') {
      ApiService.getSystemConfig()
        .then(config => {
          if (config) {
            setSystemRanges({
              min_dias_ciclo: config.min_dias_ciclo || 21,
              max_dias_ciclo: config.max_dias_ciclo || 45,
              min_dias_periodo: config.min_dias_periodo || 3,
              max_dias_periodo: config.max_dias_periodo || 10
            });
            setGlobalNotifsDisabled(config.notificaciones_globales === false);
          }
        })
        .catch(console.error);
    } else {
      // Para usuarias normales, usar el endpoint público
      ApiService.getPublicStatus()
        .then(status => {
          if (status) {
            setSystemRanges({
              min_dias_ciclo: status.min_dias_ciclo || 21,
              max_dias_ciclo: status.max_dias_ciclo || 45,
              min_dias_periodo: status.min_dias_periodo || 3,
              max_dias_periodo: status.max_dias_periodo || 10
            });
            setGlobalNotifsDisabled(status.notificaciones_globales === false);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  // Efecto para aplicar modo oscuro al body
  useEffect(() => {
    if (modoOscuro) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [modoOscuro]);

  const handleUpdateConfig = async (key, val) => {
    try {
      await ApiService.updateConfig({ [key]: val });
    } catch (err) {
      console.error(`Error al actualizar ${key}:`, err);
    }
  };

  const durationTimer = useRef(null);
  const periodTimer = useRef(null);

  const handleDurationChange = (e) => {
    const val = Number(e.target.value);
    setCycleDuration(val);
    clearTimeout(durationTimer.current);
    durationTimer.current = setTimeout(async () => {
      try {
        await ApiService.updateConfig({ duracion_ciclo: val });
        setDurationSaved(true);
        setTimeout(() => setDurationSaved(false), 1500);
      } catch (err) {
        console.error("Error al guardar ciclo:", err);
      }
    }, 600);
  };

  const handlePeriodChange = (e) => {
    const val = Number(e.target.value);
    setPeriodDuration(val);
    clearTimeout(periodTimer.current);
    periodTimer.current = setTimeout(async () => {
      try {
        await ApiService.updateConfig({ duracion_periodo: val });
        setPeriodSaved(true);
        setTimeout(() => setPeriodSaved(false), 1500);
      } catch (err) {
        console.error("Error al guardar periodo:", err);
      }
    }, 600);
  };

  const handleSaveEdad = async () => {
    const val = edadInput.trim();
    if (val && Number(val) > 0) {
      setEdad(val);
      try {
        await ApiService.updateConfig({ edad: Number(val) });
      } catch (err) {
        console.error("Error al guardar edad:", err);
      }
    }
    setEditingEdad(false);
  };

  const toggleNotificaciones = () => {
    const newVal = notificaciones === 1 ? 0 : 1;
    setNotificaciones(newVal);
    // Actualizamos ambos campos en la BD para simplificar
    handleUpdateConfig('notificaciones', newVal);
    handleUpdateConfig('recordatorio_ciclo', newVal);
  };

  const togglePrivacidad = () => {
    const newVal = privacidadEstricta === 1 ? 0 : 1;
    setPrivacidadEstricta(newVal);
    handleUpdateConfig('privacidad_estricta', newVal);
  };

  const toggleModoOscuro = () => {
    const newVal = modoOscuro === 1 ? 0 : 1;
    setModoOscuro(newVal);
    localStorage.setItem('nuvia_modo_oscuro', newVal);
    handleUpdateConfig('modo_oscuro', newVal);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '800px', margin: '0 auto 10px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
        </button>
      </div>

      {/* Avatar */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{
          width: '100px', height: '100px', background: 'var(--primary-light)', borderRadius: '50%',
          margin: '0 auto 16px', display: 'flex', justifyContent: 'center', alignItems: 'center',
          fontSize: '42px', color: 'white', fontWeight: '500'
        }}>
          {user?.nombre?.charAt(0).toUpperCase() || 'U'}
        </div>
        <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{user?.nombre}</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '15px' }}>{user?.email}</p>
      </div>

      {/* Información personal */}
      <div className="card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--primary)', fontWeight: '600', opacity: 0.9 }}>
          Información personal
        </h4>

        {/* Edad */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-light)' }}>Edad</span>
          {editingEdad ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                value={edadInput}
                onChange={e => setEdadInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveEdad()}
                autoFocus
                min={10} max={99}
                style={{
                  width: '60px', padding: '4px 8px', border: '1px solid var(--primary)',
                  borderRadius: '8px', fontSize: '14px', textAlign: 'center', outline: 'none'
                }}
              />
              <button onClick={handleSaveEdad} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex' }}>
                <Check size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{edad ? `${edad} años` : '—'}</span>
              <button
                onClick={() => { setEdadInput(edad); setEditingEdad(true); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', display: 'flex', padding: 0 }}
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Desde */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-light)' }}>Usando Nuvia desde</span>
          <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{formatFecha(user?.fecha_registro)}</span>
        </div>

        {/* Ciclos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-light)' }}>Ciclos registrados</span>
          {loadingCiclos
            ? <span style={{ color: 'var(--text-light)' }}>...</span>
            : <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
              {ciclos.length} {ciclos.length === 1 ? 'ciclo' : 'ciclos'}
            </span>
          }
        </div>
      </div>

      {/* Configuración del ciclo */}
      <div className="card" style={{ padding: '20px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '16px', margin: 0, color: 'var(--primary)', fontWeight: '600', opacity: 0.9 }}>
            Configuración del ciclo
          </h4>
          <button
            onClick={() => setIsCycleEditable(!isCycleEditable)}
            style={{
              background: isCycleEditable ? 'var(--primary)' : '#f1f5f9',
              color: isCycleEditable ? 'white' : '#64748b',
              border: 'none', borderRadius: '20px', padding: '6px 12px', fontSize: '12px',
              fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {isCycleEditable ? <Lock size={14} /> : <Settings size={14} />}
            {isCycleEditable ? 'Bloquear' : 'Editar'}
          </button>
        </div>

        {/* Frecuencia Periodo (antes Duración Ciclo) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', opacity: isCycleEditable ? 1 : 0.6 }}>
          <span style={{ color: 'var(--text-light)' }}>Frecuencia del periodo</span>
          <span style={{ fontWeight: '600', color: durationSaved ? '#4CAF50' : 'var(--primary)', transition: 'color 0.3s' }}>
            {durationSaved ? '✓ Guardado' : `Cada ${cycleDuration} días`}
          </span>
        </div>
        <input
          type="range"
          min={systemRanges.min_dias_ciclo}
          max={systemRanges.max_dias_ciclo}
          step={1}
          disabled={!isCycleEditable}
          value={cycleDuration}
          onChange={handleDurationChange}
          className="custom-range"
          style={{
            '--value': `${((cycleDuration - systemRanges.min_dias_ciclo) / (systemRanges.max_dias_ciclo - systemRanges.min_dias_ciclo)) * 100}%`,
            marginBottom: '6px',
            opacity: isCycleEditable ? 1 : 0.5,
            cursor: isCycleEditable ? 'pointer' : 'not-allowed'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '12px', color: 'var(--text-light)', opacity: isCycleEditable ? 1 : 0.6 }}>
          <span>{systemRanges.min_dias_ciclo} días</span>
          <span>{systemRanges.max_dias_ciclo} días</span>
        </div>

        {/* Duración Periodo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', opacity: isCycleEditable ? 1 : 0.6 }}>
          <span style={{ color: 'var(--text-light)' }}>Duración del periodo</span>
          <span style={{ fontWeight: '600', color: periodSaved ? '#4CAF50' : 'var(--primary)', transition: 'color 0.3s' }}>
            {periodSaved ? '✓ Guardado' : `${periodDuration} días`}
          </span>
        </div>
        <input
          type="range"
          min={systemRanges.min_dias_periodo}
          max={systemRanges.max_dias_periodo}
          step={1}
          disabled={!isCycleEditable}
          value={periodDuration}
          onChange={handlePeriodChange}
          className="custom-range range-pink"
          style={{
            '--value': `${((periodDuration - systemRanges.min_dias_periodo) / (systemRanges.max_dias_periodo - systemRanges.min_dias_periodo)) * 100}%`,
            '--thumb-color': '#FF9A9E',
            marginBottom: '6px',
            opacity: isCycleEditable ? 1 : 0.5,
            cursor: isCycleEditable ? 'pointer' : 'not-allowed'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-light)', opacity: isCycleEditable ? 1 : 0.6 }}>
          <span>{systemRanges.min_dias_periodo} días</span>
          <span>{systemRanges.max_dias_periodo} días</span>
        </div>
      </div>

      {/* Banner de Notificaciones Desactivadas */}
      {globalNotifsDisabled && (
        <div style={{
          background: '#FFF1F2', color: '#F6416C', padding: '12px 20px', borderRadius: '15px',
          marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px',
          border: '1px solid #FF9A9E'
        }}>
          <Bell size={18} />
          <span><strong>Aviso:</strong> El administrador ha pausado las notificaciones del sistema.</span>
        </div>
      )}

      {/* Options List */}
      <div className="card" style={{ padding: '10px 0' }}>
        <div
          onClick={() => !globalNotifsDisabled && toggleNotificaciones()}
          style={{
            padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: globalNotifsDisabled ? 'not-allowed' : 'pointer',
            opacity: globalNotifsDisabled ? 0.6 : 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: (notificaciones && !globalNotifsDisabled) ? '#FCE4EC' : '#f0f0f0', padding: '10px', borderRadius: '50%', color: (notificaciones && !globalNotifsDisabled) ? '#E91E63' : '#999', marginRight: '16px', transition: 'all 0.3s' }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Notificaciones y Alertas</div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                {globalNotifsDisabled ? 'Desactivadas por el administrador' : 'Gestiona avisos y recordatorios'}
              </div>
            </div>
          </div>
          <div style={{
            width: '42px', height: '22px', background: (notificaciones && !globalNotifsDisabled) ? 'var(--primary)' : '#ccc',
            borderRadius: '12px', position: 'relative', transition: 'background 0.3s'
          }}>
            <div style={{
              width: '18px', height: '18px', background: 'white', borderRadius: '50%',
              position: 'absolute', left: (notificaciones && !globalNotifsDisabled) ? '22px' : '2px', top: '2px',
              transition: 'left 0.3s'
            }}></div>
          </div>
        </div>

        <div
          onClick={togglePrivacidad}
          style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: privacidadEstricta ? '#F3E5F5' : '#f0f0f0', padding: '10px', borderRadius: '50%', color: privacidadEstricta ? 'var(--primary)' : '#999', marginRight: '16px', transition: 'all 0.3s' }}>
              <Lock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Privacidad</div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>{privacidadEstricta ? 'Máxima protección activa' : 'Gestiona tus datos'}</div>
            </div>
          </div>
          <div style={{
            width: '42px', height: '22px', background: privacidadEstricta ? 'var(--primary)' : '#ccc',
            borderRadius: '12px', position: 'relative', transition: 'background 0.3s'
          }}>
            <div style={{
              width: '18px', height: '18px', background: 'white', borderRadius: '50%',
              position: 'absolute', left: privacidadEstricta ? '22px' : '2px', top: '2px',
              transition: 'left 0.3s'
            }}></div>
          </div>
        </div>

        <div
          onClick={toggleModoOscuro}
          style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: modoOscuro ? '#333' : '#FFF9C4', padding: '10px', borderRadius: '50%', color: modoOscuro ? '#ffeb3b' : '#FBC02D', marginRight: '16px', transition: 'all 0.3s' }}>
              {modoOscuro ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Modo Oscuro</div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>{modoOscuro ? 'Tema noche activo' : 'Tema día activo'}</div>
            </div>
          </div>
          <div style={{
            width: '42px', height: '22px', background: modoOscuro ? '#444' : '#ccc',
            borderRadius: '12px', position: 'relative', transition: 'background 0.3s'
          }}>
            <div style={{
              width: '18px', height: '18px', background: 'white', borderRadius: '50%',
              position: 'absolute', left: modoOscuro ? '22px' : '2px', top: '2px',
              transition: 'left 0.3s'
            }}></div>
          </div>
        </div>

        {user?.rol === 'admin' && (
          <div
            onClick={() => navigate('/admin')}
            style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderTop: '1px solid rgba(0,0,0,0.05)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: '#F3E5F5', padding: '10px', borderRadius: '50%', color: 'var(--primary)', marginRight: '16px' }}>
                <User size={18} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '500' }}>Panel de Administrador</div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Solo para administradores</div>
              </div>
            </div>
            <ChevronRight size={20} color="var(--text-light)" />
          </div>
        )}
      </div>

      {/* Export Data */}
      <div className="card" style={{ padding: '5px 0', marginTop: '20px' }}>
        <div
          onClick={prepareReportData}
          style={{
            padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: exporting ? 'wait' : 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: '#F3E5F5', padding: '8px', borderRadius: '10px', color: 'var(--primary)', marginRight: '15px' }}>
              <Download size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-dark)' }}>
                {exporting ? 'Generando Informe...' : 'Exportar Informe de Salud (PDF)'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Resumen de tus últimos 2 meses</div>
            </div>
          </div>
          <ChevronRight size={18} color="#cbd5e1" />
        </div>
      </div>

      {/* Logout */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ff5252', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', cursor: 'pointer' }}>
          <LogOut size={18} style={{ marginRight: '8px' }} /> Cerrar sesión
        </button>
        <p style={{ marginTop: '8px', color: 'var(--text-light)', fontSize: '12px' }}>💜 Hecho con amor para tu bienestar</p>
      </div>
      {/* REPORTE OCULTO — PÁGINA 1: cabecera, calendarios, gráfica */}
      {reportData && createPortal(
        <>
          <div id="nuvia-report-p1" style={{
            position: 'absolute', left: '-9999px', top: 0, width: '800px', background: 'white', color: '#333',
            padding: '60px', fontFamily: 'Inter, sans-serif'
          }}>
            <header style={{ borderBottom: '3px solid #9b6c98', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ color: '#9b6c98', margin: 0, fontSize: '32px' }}>Informe Nuvia</h1>
                <p style={{ color: '#666', margin: '5px 0 0' }}>Reporte de Salud Femenina • {user?.nombre_completo || user?.username}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>Generado el {new Date().toLocaleDateString()}</p>
              </div>
            </header>

            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '20px', color: '#9b6c98', borderBottom: '2px solid #9b6c98', paddingBottom: '8px', marginBottom: '25px' }}>Calendarios de Seguimiento</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                {[1, 0].map(offset => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - offset);
                  const year = date.getFullYear();
                  const month = date.getMonth();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
                  return (
                    <div key={offset} style={{ background: 'white', padding: '20px', borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ color: '#9b6c98', fontSize: '18px' }}>‹</span>
                        <h3 style={{ fontSize: '18px', margin: 0, color: '#9b6c98', fontWeight: 'bold' }}>{MESES[month]} {year}</h3>
                        <span style={{ color: '#9b6c98', fontSize: '18px' }}>›</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', fontSize: '12px', textAlign: 'center', color: '#9b6c98', marginBottom: '10px' }}>
                        {DIAS_SEMANA.map(d => <div key={d} style={{ fontWeight: '500' }}>{d}</div>)}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                        {Array.from({ length: firstDay }).map((_, i) => <div key={i}></div>)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          let bg = 'transparent', color = '#555', border = 'none', br = '8px', fw = 'normal';
                          const dObj = new Date(year, month, day);
                          const todayISO = new Date().toISOString().split('T')[0];
                          const dayISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isToday = dayISO === todayISO;
                          if (ciclos.length > 0) {
                            const inicio = new Date(ciclos[0].fecha_inicio);
                            inicio.setHours(0, 0, 0, 0);
                            const diff = Math.floor((dObj - inicio) / 86400000);
                            if (diff >= 0) {
                              const dCiclo = (diff % cycleDuration) + 1;
                              const isFuture = diff >= cycleDuration;
                              const ovDia = Math.max(7, cycleDuration - 14);
                              const fertilS = ovDia - 3, fertilE = ovDia + 1;
                              if (!isFuture) {
                                if (dCiclo <= periodDuration) { bg = '#ff4d4d'; color = 'white'; br = '50%'; }
                                else if (dCiclo === ovDia) { bg = '#9b6c98'; color = 'white'; br = '50%'; }
                                else if (dCiclo >= fertilS && dCiclo <= fertilE) { border = '1.5px dashed #F472B6'; color = '#F472B6'; br = '50%'; }
                                else if (dCiclo > periodDuration && dCiclo < fertilS) { bg = 'rgba(255,183,94,0.2)'; color = '#B45309'; br = '50%'; }
                              } else if (dCiclo <= periodDuration) {
                                border = '1.5px dashed #A855F7'; color = '#A855F7'; br = '50%';
                              }
                            }
                          }
                          if (isToday) {
                            fw = 'bold';
                            if (bg === 'transparent' && border === 'none') { border = '2px solid #9b6c98'; color = '#9b6c98'; br = '50%'; }
                          }
                          return (
                            <div key={day} style={{
                              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: fw, background: bg, color, borderRadius: br, border
                            }}>
                              {day}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '30px', padding: '0 10px' }}>
                <h3 style={{ fontSize: '18px', color: '#333', marginBottom: '15px' }}>Leyenda del Ciclo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  {[
                    { bg: '#ff4d4d', border: 'none', label: 'Periodo' },
                    { bg: 'rgba(168,85,247,0.06)', border: '1.5px dashed #A855F7', label: 'Predicción Regla' },
                    { bg: 'rgba(255,183,94,0.25)', border: 'none', label: 'Fase Folicular' },
                    { bg: 'transparent', border: '1.5px dashed #F472B6', label: 'Ventana Fértil' },
                    { bg: '#9b6c98', border: 'none', label: 'Ovulación' },
                  ].map(({ bg, border, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: bg, border, flexShrink: 0 }}></div>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '20px', color: '#9b6c98', borderBottom: '2px solid #9b6c98', paddingBottom: '8px', marginBottom: '20px' }}>Curva Hormonal y Puntos Clave</h2>
              <div style={{ padding: '0 10px' }}>
                <ReportGraph duracion={cycleDuration} />
              </div>
            </div>

            <footer style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '11px', color: '#bbb' }}>
              Este informe es una recopilación de datos registrados por la usuaria en Nuvia. No sustituye el consejo médico profesional.
            </footer>
          </div>

          {/* PÁGINA 2+: Historial Detallado */}
          <div id="nuvia-report-p2" style={{
            position: 'absolute', left: '-9999px', top: 0, width: '800px', background: 'white', color: '#333',
            padding: '60px', fontFamily: 'Inter, sans-serif'
          }}>
            <header style={{ borderBottom: '2px solid #9b6c98', paddingBottom: '12px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ color: '#9b6c98', margin: 0, fontSize: '22px' }}>Informe Nuvia — Historial Detallado</h1>
              <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>{user?.nombre_completo || user?.username}</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>
              <div>
                <h3 style={{ fontSize: '14px', color: '#9b6c98', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={14} /> Síntomas
                </h3>
                {reportData.logs.filter(l => l.type === 'symptom').map((log, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ fontSize: '11px', color: '#aaa', minWidth: '55px', flexShrink: 0 }}>
                      {new Date(log.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    <div style={{ width: '40px', height: '40px', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="nuvia-sun-container" style={{ margin: 0, transform: 'scale(0.57)', color: '#9b6c98' }}>
                        <div className="nuvia-sun-rays"></div>
                        <div className="nuvia-sun-bg">
                          <NuviaFace type={SINTOMA_STYLE[log.label]?.face || 'feliz'} color="#9b6c98" />
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', color: '#9b6c98', fontWeight: '500' }}>{log.label}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{ fontSize: '14px', color: '#9b6c98', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> Registros Diarios
                </h3>
                {reportData.logs.filter(l => l.type === 'note').map((log, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '3px' }}>
                      {new Date(log.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.5' }}>{log.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <footer style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '11px', color: '#bbb' }}>
              Este informe es una recopilación de datos registrados por la usuaria en Nuvia Wellness App. No sustituye el consejo médico profesional.
            </footer>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
