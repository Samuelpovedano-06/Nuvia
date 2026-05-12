import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bell, Lock, Settings, User, LogOut, Pencil, Check, Moon, Sun } from 'lucide-react';
import { ApiService } from '../api';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  return `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

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
          <span><strong>Aviso:</strong> El administrador ha pausado las notificaciones globales del sistema.</span>
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

      {/* Logout */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ff5252', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', cursor: 'pointer' }}>
          <LogOut size={18} style={{ marginRight: '8px' }} /> Cerrar sesión
        </button>
        <p style={{ marginTop: '20px', color: 'var(--text-light)', fontSize: '13px' }}>Nuvia v1.0.0</p>
        <p style={{ marginTop: '8px', color: 'var(--text-light)', fontSize: '12px' }}>💜 Hecho con amor para tu bienestar</p>
      </div>
    </div>
  );
}
