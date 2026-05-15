import React, { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bell, Lock, Settings, User, LogOut, Pencil, Check, Moon, Sun, Download, FileBarChart, FileText, Activity, Utensils, Calendar } from 'lucide-react';
import { ApiService } from '../api';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  return `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const calcularEdad = (fecha) => {
  if (!fecha) return null;
  const hoy = new Date();
  const cumple = new Date(fecha);
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
    edad--;
  }
  return edad;
};

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
const LogoNuvia = ({ size = 24, color = '#9b6c98' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <svg viewBox="0 0 24 24" width={size * 1.5} height={size * 1.5} fill="none">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} />
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
    </svg>
    <span style={{ fontSize: `${size}px`, fontWeight: '800', letterSpacing: '-0.5px', color: color, fontFamily: 'Outfit, sans-serif' }}>Nuvia</span>
  </div>
);

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
  const { user, logout, getMe } = useContext(AuthContext);
  const navigate = useNavigate();

  const [ciclos, setCiclos] = useState([]);
  const [loadingCiclos, setLoadingCiclos] = useState(true);

  const [cycleDuration, setCycleDuration] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [durationSaved, setDurationSaved] = useState(false);
  const [periodSaved, setPeriodSaved] = useState(false);

  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [editingEdad, setEditingEdad] = useState(false);
  const [fechaNacimientoInput, setFechaNacimientoInput] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear() - 25);
  const [viewMode, setViewMode] = useState('days'); // 'days', 'years'

  // Estados de configuración
  const [notificaciones, setNotificaciones] = useState(1);
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMonths, setExportMonths] = useState(2);
  const [customMonths, setCustomMonths] = useState('');

  // Cargar datos para el reporte
  const prepareReportData = async (months) => {
    const numMonths = parseInt(months) || 2;
    setExporting(true);
    setShowExportModal(false);
    try {
      const [sintomas_raw, diarios_raw, sintomas_cat] = await Promise.all([
        ApiService.getRegistrosSintomas(),
        ApiService.getRegistrosDiarios(),
        ApiService.getSintomas()
      ]);

      const sintomaMap = {};
      sintomas_cat.forEach(s => { sintomaMap[s.id_sintoma] = s.nombre_sintoma; });

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - numMonths);

      const logs = [];
      sintomas_raw?.forEach(s => {
        if (new Date(s.fecha) >= startDate)
          logs.push({ ...s, type: 'symptom', label: sintomaMap[s.id_sintoma] || 'Síntoma' });
      });
      diarios_raw?.forEach(d => {
        if (d.notas && new Date(d.fecha) >= startDate)
          logs.push({ ...d, type: 'note', label: d.notas });
      });
      logs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      // ─── Layout planning ───────────────────────────────────────────
      // N = numMonths % 4:
      //   0 → all pages full (4 cals), graph alone + first 5 hist items
      //   1 → last cal page has 1 cal + graph embedded
      //   2 → last cal page has 2 cals + graph embedded
      //   3 → last cal page has 3 cals, graph alone + first 5 hist items
      const symptoms      = logs.filter(l => l.type === 'symptom');
      const notes         = logs.filter(l => l.type === 'note');
      const N             = numMonths % 4;
      const graphAlone    = N === 0 || N === 3;
      const graphEmbedded = N === 1 || N === 2;
      const totalCalDivs  = Math.ceil(numMonths / 4);
      const GCOLS = 10; // hist items per column on graph page (graphAlone)
      const HCOLS = 21; // hist items per column on full hist page
      const histStart     = graphAlone ? GCOLS : 0;
      const histSymptoms  = symptoms.slice(histStart);
      const histNotes     = notes.slice(histStart);
      const numHistPages  = (histSymptoms.length > 0 || histNotes.length > 0)
        ? Math.max(Math.ceil(histSymptoms.length / HCOLS), Math.ceil(histNotes.length / HCOLS), 1)
        : 0;

      setReportData({
        logs, months: numMonths,
        graphAlone, graphEmbedded, totalCalDivs, numHistPages, histStart,
        stats: { totalSintomas: symptoms.length, totalNotas: notes.length }
      });

      setTimeout(async () => {
        const opts = { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' };

        const calEls  = Array.from({ length: totalCalDivs }, (_, i) => document.getElementById(`nuvia-cal-${i}`));
        const graphEl = graphAlone ? document.getElementById('nuvia-graph') : null;
        const histEls = Array.from({ length: numHistPages }, (_, i) => document.getElementById(`nuvia-hist-${i}`));

        if (calEls.some(el => !el) || (graphAlone && !graphEl) || histEls.some(el => !el)) {
          setExporting(false); return;
        }

        const calCanvases  = await Promise.all(calEls.map(el => html2canvas(el, opts)));
        const graphCanvas  = graphEl ? await html2canvas(graphEl, opts) : null;
        const histCanvases = await Promise.all(histEls.map(el => html2canvas(el, opts)));

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pw  = pdf.internal.pageSize.getWidth();
        const addPage = (canvas, first = false) => {
          if (!first) pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, (canvas.height * pw) / canvas.width);
        };

        calCanvases.forEach((c, i) => addPage(c, i === 0));
        if (graphCanvas) addPage(graphCanvas);
        histCanvases.forEach(c => addPage(c));

        pdf.save(`Informe_Salud_Nuvia_${user?.username || 'Usuario'}.pdf`);
        setExporting(false);
        setReportData(null);
      }, 1500);

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
          if (config.fecha_nacimiento) {
            setFechaNacimiento(config.fecha_nacimiento);
            const d = new Date(config.fecha_nacimiento);
            setPickerMonth(d.getMonth());
            setPickerYear(d.getFullYear());
          }
          setNotificaciones(config.notificaciones ?? 1);

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

  const handleSaveFechaNacimiento = async (val) => {
    if (val) {
      setFechaNacimiento(val);
      try {
        await ApiService.updateConfig({ fecha_nacimiento: val });
      } catch (err) {
        console.error("Error al guardar fecha nacimiento:", err);
      }
    }
    setShowDatePicker(false);
  };

  const toggleNotificaciones = () => {
    const newVal = notificaciones === 1 ? 0 : 1;
    setNotificaciones(newVal);
    // Actualizamos ambos campos en la BD para simplificar
    handleUpdateConfig('notificaciones', newVal);
    handleUpdateConfig('recordatorio_ciclo', newVal);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>
              {fechaNacimiento ? `${calcularEdad(fechaNacimiento)} años` : '—'}
            </span>
            <button
              onClick={() => setShowDatePicker(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', display: 'flex', padding: 0 }}
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>

        {/* Modal de Calendario Custom para Perfil */}
        {showDatePicker && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100, padding: '20px'
          }}>
            <div className="card" style={{ maxWidth: '350px', width: '100%', padding: '20px', background: 'white', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <button 
                  onClick={() => {
                    if (viewMode === 'days') {
                      if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(pickerYear - 1); }
                      else setPickerMonth(pickerMonth - 1);
                    } else {
                      setPickerYear(pickerYear - 12);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div 
                  onClick={() => setViewMode(viewMode === 'days' ? 'years' : 'days')}
                  style={{ fontWeight: '700', color: 'var(--primary)', textTransform: 'capitalize', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {viewMode === 'days' 
                    ? `${new Date(pickerYear, pickerMonth).toLocaleDateString('es-ES', { month: 'long' })} ${pickerYear}`
                    : 'Selecciona Año'
                  }
                </div>

                <button 
                  onClick={() => {
                    if (viewMode === 'days') {
                      if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(pickerYear + 1); }
                      else setPickerMonth(pickerMonth + 1);
                    } else {
                      setPickerYear(pickerYear + 12);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {viewMode === 'days' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                    {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1' }}>{d}</div>)}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {Array.from({ length: (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7 }).map((_, i) => <div key={`e-${i}`}></div>)}
                    {Array.from({ length: new Date(pickerYear, pickerMonth + 1, 0).getDate() }).map((_, i) => {
                      const d = i + 1;
                      const dateStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const isSelected = fechaNacimiento === dateStr;
                      const isFuture = new Date(pickerYear, pickerMonth, d) > new Date();
                      return (
                        <div 
                          key={d} 
                          onClick={() => { if (!isFuture) handleSaveFechaNacimiento(dateStr); }}
                          style={{
                            aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: isSelected ? '700' : '500', borderRadius: '12px',
                            cursor: isFuture ? 'default' : 'pointer',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            color: isSelected ? 'white' : (isFuture ? '#e2e8f0' : 'var(--text-dark)'),
                            transition: 'all 0.2s'
                          }}
                        >
                          {d}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {Array.from({ length: 12 }, (_, i) => pickerYear - 5 + i).map(y => (
                    <div 
                      key={y}
                      onClick={() => { setPickerYear(y); setViewMode('days'); }}
                      style={{
                        padding: '10px', borderRadius: '12px', textAlign: 'center',
                        fontSize: '14px', fontWeight: y === pickerYear ? '700' : '500',
                        background: y === pickerYear ? 'var(--primary)' : '#f8fafc',
                        color: y === pickerYear ? 'white' : 'var(--text-dark)',
                        cursor: 'pointer'
                      }}
                    >
                      {y}
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                onClick={() => setShowDatePicker(false)}
                style={{ width: '100%', marginTop: '20px', padding: '12px', borderRadius: '16px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
        
        {/* Mi Código */}
        {user?.mi_codigo && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-light)' }}>Mi Código de Nuvia</span>
            <span style={{ fontWeight: '700', color: 'var(--primary)', letterSpacing: '1px', background: 'rgba(176,91,181,0.05)', padding: '2px 8px', borderRadius: '6px' }}>
              {user.mi_codigo}
            </span>
          </div>
        )}



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
          onClick={() => setShowExportModal(true)}
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
              <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Elige el rango de tiempo a exportar</div>
            </div>
          </div>
          <ChevronRight size={18} color="#cbd5e1" />
        </div>
      </div>

      {/* MODAL DE EXPORTACIÓN */}
      {showExportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px', backdropFilter: 'blur(6px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '380px', padding: '30px', animation: 'slideUp 0.3s ease', border: '1px solid rgba(155,108,152,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '22px', fontWeight: '700' }}>Exportar Informe</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '25px', lineHeight: '1.5' }}>¿Cuántos meses de historial quieres incluir en tu reporte premium?</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
              {[1, 3, 6, 12].map(m => (
                <button
                  key={m}
                  onClick={() => { setExportMonths(m); setCustomMonths(''); }}
                  style={{
                    padding: '14px 5px', borderRadius: '14px', 
                    border: exportMonths === m ? '2.5px solid var(--primary)' : '1px solid rgba(155,108,152,0.15)',
                    background: exportMonths === m ? 'rgba(176,91,181,0.1)' : 'var(--white)', 
                    color: exportMonths === m ? 'var(--primary)' : 'var(--text-light)',
                    fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {m} m.
                </button>
              ))}
              <button
                onClick={() => setExportMonths('custom')}
                style={{
                  gridColumn: 'span 2', padding: '14px', borderRadius: '14px', 
                  border: exportMonths === 'custom' ? '2.5px solid var(--primary)' : '1px solid rgba(155,108,152,0.15)',
                  background: exportMonths === 'custom' ? 'rgba(176,91,181,0.1)' : 'var(--white)', 
                  color: exportMonths === 'custom' ? 'var(--primary)' : 'var(--text-light)',
                  fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s'
                }}
              >
                Personalizado
              </button>
            </div>

            {exportMonths === 'custom' && (
              <div style={{ marginBottom: '25px', animation: 'fadeIn 0.4s' }}>
                <label style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '800', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Número de meses</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customMonths}
                  onChange={(e) => setCustomMonths(e.target.value)}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '14px', border: '2px solid var(--primary)',
                    background: 'rgba(176,91,181,0.05)', color: 'var(--text-dark)', fontWeight: 'bold', outline: 'none', fontSize: '16px'
                  }}
                  placeholder="Ej: 5"
                  autoFocus
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: 'rgba(155,108,152,0.1)', color: 'var(--text-light)', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const val = exportMonths === 'custom' ? customMonths : exportMonths;
                  prepareReportData(val);
                }}
                disabled={exportMonths === 'custom' && !customMonths}
                style={{ 
                  flex: 1, padding: '16px', borderRadius: '16px', border: 'none', 
                  background: (exportMonths === 'custom' && !customMonths) ? 'rgba(155,108,152,0.2)' : 'var(--primary)', 
                  color: 'white', fontWeight: '800', cursor: 'pointer', opacity: (exportMonths === 'custom' && !customMonths) ? 0.5 : 1,
                  boxShadow: (exportMonths === 'custom' && !customMonths) ? 'none' : '0 8px 20px rgba(176,91,181,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ff5252', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', cursor: 'pointer' }}>
          <LogOut size={18} style={{ marginRight: '8px' }} /> Cerrar sesión
        </button>
        <p style={{ marginTop: '8px', color: 'var(--text-light)', fontSize: '12px' }}>💜 Hecho con amor para tu bienestar</p>
      </div>
      {/* REPORTE OCULTO — divs dinámicos calculados por hoja */}
      {reportData && createPortal(
        (() => {
          const { logs, months: numMonths, graphAlone, graphEmbedded, totalCalDivs, numHistPages, histStart } = reportData;
          const symptoms = logs.filter(l => l.type === 'symptom');
          const notes    = logs.filter(l => l.type === 'note');
          const N        = numMonths % 4;
          const GCOLS    = 10;
          const HCOLS    = 21;
          const todayISO = new Date().toISOString().split('T')[0];

          const pageStyle = { position: 'absolute', left: '-9999px', top: 0, width: '800px', background: 'white', color: '#333', padding: '46px 56px', fontFamily: 'Inter, sans-serif' };

          const renderCalMonth = (offset) => {
            const d = new Date(); d.setMonth(d.getMonth() - offset);
            const year = d.getFullYear(), month = d.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
            return (
              <div key={offset} style={{ background: 'white', padding: '14px', borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ color: '#9b6c98', fontSize: '14px' }}>‹</span>
                  <h3 style={{ fontSize: '14px', margin: 0, color: '#9b6c98', fontWeight: 'bold' }}>{MESES[month]} {year}</h3>
                  <span style={{ color: '#9b6c98', fontSize: '14px' }}>›</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '9px', textAlign: 'center', color: '#9b6c98', marginBottom: '5px' }}>
                  {DIAS_SEMANA.map(ds => <div key={ds} style={{ fontWeight: '600' }}>{ds}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    let bg = 'transparent', col = '#555', bdr = 'none', br = '6px', fw = 'normal';
                    const dObj = new Date(year, month, day);
                    const dayISO = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    if (ciclos.length > 0) {
                      const inicio = new Date(ciclos[0].fecha_inicio); inicio.setHours(0,0,0,0);
                      const diff = Math.floor((dObj - inicio) / 86400000);
                      if (diff >= 0) {
                        const dCiclo = (diff % cycleDuration) + 1, isFuture = diff >= cycleDuration;
                        const ovDia = Math.max(7, cycleDuration - 14), fertilS = ovDia - 3, fertilE = ovDia + 1;
                        if (!isFuture) {
                          if (dCiclo <= periodDuration)                        { bg='#ff4d4d'; col='white'; br='50%'; }
                          else if (dCiclo === ovDia)                           { bg='#9b6c98'; col='white'; br='50%'; }
                          else if (dCiclo >= fertilS && dCiclo <= fertilE)     { bdr='1.5px dashed #F472B6'; col='#F472B6'; br='50%'; }
                          else if (dCiclo > periodDuration && dCiclo < fertilS){ bg='rgba(255,183,94,0.2)'; col='#B45309'; br='50%'; }
                        } else if (dCiclo <= periodDuration) { bdr='1.5px dashed #A855F7'; col='#A855F7'; br='50%'; }
                      }
                    }
                    if (dayISO === todayISO) { fw='bold'; if (bg==='transparent'&&bdr==='none'){ bdr='1.5px solid #9b6c98'; col='#9b6c98'; br='50%'; } }
                    return <div key={day} style={{ aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:fw, background:bg, color:col, borderRadius:br, border:bdr }}>{day}</div>;
                  })}
                </div>
              </div>
            );
          };

          const legend = (
            <div style={{ marginTop: '18px' }}>
              <h3 style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>Leyenda del Ciclo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                {[{ bg:'#ff4d4d', border:'none', label:'Periodo' }, { bg:'rgba(168,85,247,0.06)', border:'1.5px dashed #A855F7', label:'Predicción Regla' }, { bg:'rgba(255,183,94,0.25)', border:'none', label:'Fase Folicular' }, { bg:'transparent', border:'1.5px dashed #F472B6', label:'Ventana Fértil' }, { bg:'#9b6c98', border:'none', label:'Ovulación' }]
                  .map(({ bg, border, label }) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <div style={{ width:'11px', height:'11px', borderRadius:'50%', background:bg, border, flexShrink:0 }} />
                      <span>{label}</span>
                    </div>
                  ))}
              </div>
            </div>
          );

          const graph = (
            <div style={{ marginTop: '30px' }}>
              <h2 style={{ fontSize: '16px', color: '#9b6c98', borderBottom: '1px solid #e8d5f0', paddingBottom: '6px', marginBottom: '14px' }}>Curva Hormonal y Puntos Clave</h2>
              <div style={{ padding: '0 8px' }}><ReportGraph duracion={cycleDuration} /></div>
            </div>
          );

          const histColumns = (symSlice, noteSlice) => (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'28px', alignItems:'start', marginTop:'14px' }}>
              <div>
                <h3 style={{ fontSize:'12px', color:'#9b6c98', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px' }}><Activity size={12} /> Síntomas</h3>
                {symSlice.map((log, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'3px 0', borderBottom:'1px solid #f5f5f5' }}>
                    <span style={{ fontSize:'9px', color:'#aaa', minWidth:'40px', flexShrink:0 }}>{new Date(log.fecha).toLocaleDateString('es-ES', { day:'numeric', month:'short' })}</span>
                    <div style={{ width:'28px', height:'28px', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <div className="nuvia-sun-container" style={{ margin:0, transform:'scale(0.40)', color:'#9b6c98' }}>
                        <div className="nuvia-sun-rays" /><div className="nuvia-sun-bg"><NuviaFace type={SINTOMA_STYLE[log.label]?.face || 'feliz'} color="#9b6c98" /></div>
                      </div>
                    </div>
                    <span style={{ fontSize:'10px', color:'#9b6c98', fontWeight:'500' }}>{log.label}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{ fontSize:'12px', color:'#9b6c98', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px' }}><FileText size={12} /> Registros Diarios</h3>
                {noteSlice.map((log, i) => (
                  <div key={i} style={{ padding:'3px 0', borderBottom:'1px solid #f5f5f5' }}>
                    <div style={{ fontSize:'9px', color:'#aaa', marginBottom:'1px' }}>{new Date(log.fecha).toLocaleDateString('es-ES', { day:'numeric', month:'short' })}</div>
                    <div style={{ fontSize:'10px', color:'#555', lineHeight:'1.3' }}>{log.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );

          const footer = <footer style={{ marginTop:'20px', paddingTop:'12px', borderTop:'1px solid #eee', textAlign:'center', fontSize:'9px', color:'#ccc' }}>Este informe es una recopilación de datos de Nuvia. No sustituye el consejo médico profesional.</footer>;

          const miniHeader = (title) => (
            <header style={{ borderBottom:'2px solid #9b6c98', paddingBottom:'8px', marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ color:'#9b6c98', margin:0, fontSize:'16px' }}>Informe Nuvia — {title}</h2>
              <p style={{ fontSize:'10px', color:'#999', margin:0 }}>{user?.nombre_completo || user?.username}</p>
            </header>
          );

          const pages = [];

          // ── Páginas de calendarios ──────────────────────────────────
          for (let pi = 0; pi < totalCalDivs; pi++) {
            const isFirst   = pi === 0;
            const isLastCal = pi === totalCalDivs - 1;
            const count     = isLastCal && N !== 0 ? N : 4;
            const startOff  = numMonths - 1 - pi * 4;
            const embedGraph = isLastCal && graphEmbedded;
            pages.push(
              <div key={`cal-${pi}`} id={`nuvia-cal-${pi}`} style={pageStyle}>
                {isFirst ? (
                  <header style={{ borderBottom:'3px solid #9b6c98', paddingBottom:'14px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                    <div><LogoNuvia size={24} /><p style={{ color:'#666', margin:'6px 0 0', fontSize:'11px' }}>Reporte de Salud Femenina • {user?.nombre_completo || user?.username}</p></div>
                    <div style={{ textAlign:'right' }}><p style={{ fontSize:'10px', color:'#999', margin:'0 0 2px' }}>Historial de {numMonths} meses</p><p style={{ fontSize:'10px', color:'#999', margin:0 }}>Generado el {new Date().toLocaleDateString()}</p></div>
                  </header>
                ) : miniHeader('Calendarios')}
                <h2 style={{ fontSize:'15px', color:'#9b6c98', borderBottom:'1px solid #e8d5f0', paddingBottom:'5px', marginBottom:'14px' }}>Calendarios de Seguimiento</h2>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                  {Array.from({ length: count }).map((_, j) => renderCalMonth(startOff - j))}
                </div>
                {isLastCal && legend}
                {embedGraph && graph}
                {footer}
              </div>
            );
          }

          // ── Página gráfica standalone (N=0 ó N=3) ──────────────────
          if (graphAlone) {
            const sym0  = symptoms.slice(0, histStart);
            const note0 = notes.slice(0, histStart);
            pages.push(
              <div key="graph" id="nuvia-graph" style={pageStyle}>
                {miniHeader('Gráfica e Historial')}
                {graph}
                {(sym0.length > 0 || note0.length > 0) && (
                  <>
                    <h2 style={{ fontSize:'15px', color:'#9b6c98', borderBottom:'1px solid #e8d5f0', paddingBottom:'5px', marginBottom:'8px', marginTop:'20px' }}>Historial Detallado</h2>
                    {histColumns(sym0, note0)}
                  </>
                )}
                {footer}
              </div>
            );
          }

          // ── Páginas de historial ────────────────────────────────────
          for (let hi = 0; hi < numHistPages; hi++) {
            const sym  = symptoms.slice(histStart + hi * HCOLS, histStart + (hi + 1) * HCOLS);
            const note = notes.slice(histStart + hi * HCOLS, histStart + (hi + 1) * HCOLS);
            pages.push(
              <div key={`hist-${hi}`} id={`nuvia-hist-${hi}`} style={pageStyle}>
                {miniHeader('Historial Detallado')}
                <h2 style={{ fontSize:'15px', color:'#9b6c98', borderBottom:'1px solid #e8d5f0', paddingBottom:'5px', marginBottom:'8px' }}>Historial Detallado</h2>
                {histColumns(sym, note)}
                {footer}
              </div>
            );
          }

          return <>{pages}</>;
        })(),
        document.body
      )}
    </div>
  );
}
