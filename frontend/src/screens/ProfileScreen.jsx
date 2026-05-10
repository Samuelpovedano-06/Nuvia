import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bell, Lock, Settings, User, LogOut, Pencil, Check } from 'lucide-react';
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
  const [durationSaved, setDurationSaved] = useState(false);

  const [edad, setEdad] = useState('');
  const [editingEdad, setEditingEdad] = useState(false);
  const [edadInput, setEdadInput] = useState('');

  // Estados de configuración
  const [notificaciones, setNotificaciones] = useState(1);
  const [recordatorioCiclo, setRecordatorioCiclo] = useState(1);
  const [privacidadEstricta, setPrivacidadEstricta] = useState(0);

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
          if (config.edad) setEdad(String(config.edad));
          setNotificaciones(config.notificaciones ?? 1);
          setRecordatorioCiclo(config.recordatorio_ciclo ?? 1);
          setPrivacidadEstricta(config.privacidad_estricta ?? 0);
        }
      })
      .catch(err => {
        console.warn("No se pudo cargar la configuración, usando valor local:", err);
        const stored = localStorage.getItem('nuvia_cycle_duration');
        if (stored) setCycleDuration(Number(stored));
        const storedEdad = localStorage.getItem('nuvia_edad');
        if (storedEdad) setEdad(storedEdad);
      });
  }, []);

  const handleUpdateConfig = async (key, val) => {
    try {
      await ApiService.updateConfig({ [key]: val });
    } catch (err) {
      console.error(`Error al actualizar ${key}:`, err);
    }
  };

  const handleDurationChange = async (e) => {
    const val = Number(e.target.value);
    setCycleDuration(val);
    localStorage.setItem('nuvia_cycle_duration', val);
    try {
      await ApiService.updateConfig({ duracion_ciclo: val });
      setDurationSaved(true);
      setTimeout(() => setDurationSaved(false), 1500);
    } catch (err) {
      console.error("Error al guardar en BD:", err);
    }
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
    handleUpdateConfig('notificaciones', newVal);
  };

  const togglePrivacidad = () => {
    const newVal = privacidadEstricta === 1 ? 0 : 1;
    setPrivacidadEstricta(newVal);
    handleUpdateConfig('privacidad_estricta', newVal);
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
      <div className="card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--primary)', fontWeight: '600', opacity: 0.9 }}>
          Configuración del ciclo
        </h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-light)' }}>Duración del ciclo</span>
          <span style={{ fontWeight: '600', color: durationSaved ? '#4CAF50' : 'var(--primary)', transition: 'color 0.3s' }}>
            {durationSaved ? '✓ Guardado' : `${cycleDuration} días`}
          </span>
        </div>
        <input
          type="range"
          min={21}
          max={45}
          step={1}
          value={cycleDuration}
          onChange={handleDurationChange}
          className="custom-range"
          style={{ 
            '--value': `${((cycleDuration - 21) / (45 - 21)) * 100}%`
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: 'var(--text-light)' }}>
          <span>21 días</span>
          <span>45 días</span>
        </div>
      </div>

      {/* Options List */}
      <div className="card" style={{ padding: '10px 0' }}>
        <div 
          onClick={toggleNotificaciones}
          style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: notificaciones ? '#FCE4EC' : '#f0f0f0', padding: '10px', borderRadius: '50%', color: notificaciones ? '#E91E63' : '#999', marginRight: '16px', transition: 'all 0.3s' }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Notificaciones</div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Recordatorios y alertas</div>
            </div>
          </div>
          <div style={{ 
            width: '42px', height: '22px', background: notificaciones ? 'var(--primary)' : '#ccc', 
            borderRadius: '12px', position: 'relative', transition: 'background 0.3s' 
          }}>
            <div style={{ 
              width: '18px', height: '18px', background: 'white', borderRadius: '50%', 
              position: 'absolute', left: notificaciones ? '22px' : '2px', top: '2px',
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

        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ background: '#F3E5F5', padding: '10px', borderRadius: '50%', color: 'var(--primary)', marginRight: '16px' }}>
              <Settings size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Configuración general</div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Preferencias de la app</div>
            </div>
          </div>
          <ChevronRight size={20} color="var(--text-light)" />
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
