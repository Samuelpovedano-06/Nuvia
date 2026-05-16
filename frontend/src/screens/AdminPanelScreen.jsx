import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ApiService } from '../api';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Users, Shield, Trash2, Edit, UserPlus, X, Save, Eye, EyeOff, 
  TrendingUp, Activity, Calendar, Download, Settings, Zap, ArrowUpRight
} from 'lucide-react';

export default function AdminPanelScreen() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_users: 0, total_ciclos: 0, registros_hoy: 0, crecimiento_semanal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: 'usuaria' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logTab, setLogTab] = useState('rass');
  const [showLogs, setShowLogs] = useState(false);
  const [serverLogs, setServerLogs] = useState([]);
  const [clientLogs, setClientLogs] = useState([
    { id: 1, type: 'APP', content: '[Nuvia-App] Monitor de Sistema iniciado', color: '#64748b' }
  ]);

  const logEndRef = React.useRef(null);
  const logScrollRef = React.useRef(null);
  const logsPrimeraCargaRef = React.useRef(true);

  // Al abrir la consola o cambiar de pestaña, ir abajo del todo (forzar)
  useEffect(() => {
    if (showLogs) {
      logsPrimeraCargaRef.current = true;
    }
  }, [showLogs, logTab]);

  // Auto-scroll inteligente: solo si la usuaria está cerca del fondo
  useEffect(() => {
    if (!showLogs) return;
    const cont = logScrollRef.current;
    if (logsPrimeraCargaRef.current) {
      logsPrimeraCargaRef.current = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cont) cont.scrollTop = cont.scrollHeight;
          else logEndRef.current?.scrollIntoView({ behavior: 'auto' });
        });
      });
      return;
    }
    if (!cont) return;
    // Solo seguir bajando si estás a menos de 120px del fondo
    const dist = cont.scrollHeight - cont.scrollTop - cont.clientHeight;
    if (dist < 120) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serverLogs, clientLogs, showLogs, logTab]);

  // Efecto para logs REALES del servidor
  useEffect(() => {
    if (!showLogs || logTab !== 'rass') return;

    const fetchServerLogs = async () => {
      try {
        const logs = await ApiService.getLogs();
        setServerLogs(logs);
      } catch (err) {
        console.error("Error al obtener logs:", err);
      }
    };

    fetchServerLogs(); // Carga inicial
    const interval = setInterval(fetchServerLogs, 2000); // Polling cada 2s

    return () => clearInterval(interval);
  }, [showLogs, logTab]);

  // Efecto para logs de UI (Front)
  useEffect(() => {
    if (!showLogs || logTab !== 'front') return;
    
    // Aquí podrías interceptar eventos reales, por ahora añadimos uno al entrar
    const newEntry = { 
      id: Date.now(), 
      content: `[UI] Inspeccionando logs - Vista: ${logTab.toUpperCase()} - ${new Date().toLocaleTimeString()}`,
      color: 'var(--primary)' 
    };
    setClientLogs(prev => [...prev.slice(-49), newEntry]);

  }, [showLogs, logTab]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (user && user.rol !== 'admin') {
      navigate('/');
    } else {
      fetchData();
    }
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsData = await ApiService.getAdminStats();
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleExport = async () => {
    try {
      const blob = await ApiService.exportData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nuvia_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Error al exportar: ' + err.message);
    }
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
          <ChevronLeft size={18} /> Volver
        </button>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontSize: '32px', color: 'var(--primary)', margin: 0, fontWeight: '700' }}>Panel de Admin</h2>
        <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '14px' }}>Gestión y estadísticas del sistema</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card" style={{ 
          margin: 0, background: 'white', 
          color: '#1e293b', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
        }}>
          <Users size={24} color="var(--primary)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Usuarias registradas</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '4px 0' }}>{stats.total_users.toLocaleString()}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ margin: 0, padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Activity size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Registros hoy</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.registros_hoy}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <Calendar size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Ciclos totales</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.total_ciclos.toLocaleString()}</div>
        </div>
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <TrendingUp size={20} color={stats.crecimiento_semanal >= 0 ? "#4CAF50" : "#F44336"} style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Crecimiento sem.</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: stats.crecimiento_semanal >= 0 ? "#4CAF50" : "#F44336" }}>
            {stats.crecimiento_semanal >= 0 ? '+' : ''}{stats.crecimiento_semanal}%
          </div>
        </div>
      </div>



      {/* Full Screen Log Modal */}
      {showLogs && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'linear-gradient(180deg, #fdf2f8 0%, #ffffff 100%)', zIndex: 5000,
          display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease'
        }}>
          {/* Header del Modal */}
          <div style={{ padding: '20px 25px', borderBottom: '1px solid rgba(155, 108, 152, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => setShowLogs(false)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '5px' }}
              >
                <ChevronLeft size={24} />
              </button>
              <h2 style={{ color: 'var(--text-dark)', margin: 0, fontSize: '24px', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>Logs</h2>
            </div>
            <div style={{ display: 'flex', background: 'rgba(155, 108, 152, 0.05)', padding: '5px', borderRadius: '14px', gap: '5px' }}>
              {['RASS', 'FRONT'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setLogTab(tab.toLowerCase())}
                  style={{
                    padding: '8px 24px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '800',
                    background: logTab === tab.toLowerCase() ? 'var(--primary)' : 'transparent',
                    color: logTab === tab.toLowerCase() ? 'white' : 'var(--text-light)', 
                    cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: logTab === tab.toLowerCase() ? '0 4px 15px rgba(186, 104, 200, 0.25)' : 'none'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Consola de Logs (Light) */}
          <div ref={logScrollRef} style={{
            flex: 1, overflowY: 'auto', padding: '25px', fontFamily: '"Fira Code", monospace', fontSize: '13px',
            background: 'transparent', color: 'var(--text-dark)', lineHeight: '1.8'
          }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '20px', border: '1px solid rgba(155, 108, 152, 0.08)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
              {(logTab === 'rass' ? serverLogs : clientLogs).map((log) => (
                <div key={log.id} style={{ 
                  color: log.color === '#94a3b8' ? '#64748b' : (log.color === '#f8fafc' ? '#334155' : log.color), 
                  marginBottom: '6px', animation: 'fadeIn 0.2s ease', borderBottom: '1px solid #f8fafc', paddingBottom: '4px'
                }}>
                  {log.content}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Footer del Modal */}
          <div style={{ padding: '20px 25px', borderTop: '1px solid rgba(155, 108, 152, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4CAF50', fontSize: '12px', fontWeight: '700' }}>
              <div className="pulse" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4CAF50', boxShadow: '0 0 10px rgba(76, 175, 80, 0.4)' }}></div>
              Monitorización en tiempo real activa
            </div>
            <button style={{ 
              background: 'rgba(186, 104, 200, 0.1)', border: 'none', color: 'var(--primary)', 
              fontWeight: '800', fontSize: '12px', cursor: 'pointer', padding: '8px 16px', borderRadius: '10px' 
            }}>
              Exportar Historial
            </button>
          </div>
        </div>
      )}


      {/* Configuración del Sistema */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Configuración del sistema</h3>
      <div className="card" style={{ padding: '8px 0', marginBottom: '30px' }}>
        {[
          { icon: <Settings size={18} />, label: 'Configuración del sistema', path: '/admin/config' },
          { icon: <Users size={18} />, label: 'Gestión de usuarios', path: '/admin/users' },
          { icon: <Activity size={18} />, label: 'Monitor de Sistema (Logs)', action: () => setShowLogs(true) }
        ].map((item, i) => (
          <div 
            key={i} 
            onClick={() => item.path ? navigate(item.path) : item.action()}
            style={{ 
              padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer',
              borderBottom: i < 2 ? '1px solid rgba(155, 108, 152, 0.1)' : 'none',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ color: 'var(--primary)', display: 'flex' }}>{item.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-dark)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Export Button */}
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <button 
          onClick={handleExport}
          style={{ 
            padding: '12px 30px', background: 'var(--primary)', color: 'white', 
            border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: 'pointer', boxShadow: '0 4px 15px rgba(186, 104, 200, 0.2)'
          }}
        >
          <Download size={18} /> Exportar datos
        </button>
      </div>

    </div>
  );
}


