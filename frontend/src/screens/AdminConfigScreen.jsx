import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../api';
import { ChevronLeft, Bell, Zap, Shield, Save, RefreshCw, AlertTriangle, Check } from 'lucide-react';

export default function AdminConfigScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [config, setConfig] = useState({
    modo_mantenimiento: false,
    notificaciones_globales: true,
    max_dias_ciclo: 45,
    min_dias_ciclo: 21,
    max_dias_periodo: 10,
    min_dias_periodo: 3
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data = await ApiService.getSystemConfig();
      setConfig(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await ApiService.updateSystemConfig(config);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="screen-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <RefreshCw className="animate-spin" color="var(--primary)" />
    </div>
  );

  return (
    <div className="screen-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} /> <span>Panel Admin</span>
        </button>
      </div>

      <h2 style={{ marginBottom: '8px' }}>Configuración del sistema</h2>
      <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '30px' }}>
        Gestiona los parámetros globales y el comportamiento de la plataforma Nuvia.
      </p>

      {/* Notificaciones */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#FCE4EC', padding: '10px', borderRadius: '12px', color: '#E91E63' }}>
            <Bell size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0 }}>Notificaciones del Sistema</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-light)' }}>Alertas push y recordatorios globales</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px' }}>Estado de notificaciones globales</span>
          <div 
            onClick={() => setConfig({...config, notificaciones_globales: !config.notificaciones_globales})}
            style={{ 
              width: '45px', height: '24px', background: config.notificaciones_globales ? 'var(--primary)' : '#ccc', 
              borderRadius: '12px', position: 'relative', transition: 'background 0.3s', cursor: 'pointer'
            }}
          >
            <div style={{ 
              width: '20px', height: '20px', background: 'white', borderRadius: '50%', 
              position: 'absolute', left: config.notificaciones_globales ? '23px' : '2px', top: '2px',
              transition: 'left 0.3s'
            }}></div>
          </div>
        </div>
      </div>

      {/* Algoritmo */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#F3E5F5', padding: '10px', borderRadius: '12px', color: 'var(--primary)' }}>
            <Zap size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0 }}>Motor de Predicción</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-light)' }}>Versión y parámetros del algoritmo Nuvia AI</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-light)', display: 'block', marginBottom: '6px' }}>Mín. Frecuencia del periodo</label>
            <input 
              type="number" 
              className="config-input"
              value={config.min_dias_ciclo}
              onChange={e => setConfig({...config, min_dias_ciclo: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #eee', fontSize: '14px', outline: 'none', transition: 'border-color 0.3s' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-light)', display: 'block', marginBottom: '6px' }}>Máx. Frecuencia del periodo</label>
            <input 
              type="number" 
              className="config-input"
              value={config.max_dias_ciclo}
              onChange={e => setConfig({...config, max_dias_ciclo: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #eee', fontSize: '14px', outline: 'none', transition: 'border-color 0.3s' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-light)', display: 'block', marginBottom: '6px' }}>Mín. Duración del periodo</label>
            <input 
              type="number" 
              className="config-input"
              value={config.min_dias_periodo}
              onChange={e => setConfig({...config, min_dias_periodo: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #eee', fontSize: '14px', outline: 'none', transition: 'border-color 0.3s' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-light)', display: 'block', marginBottom: '6px' }}>Máx. Duración del periodo</label>
            <input 
              type="number" 
              className="config-input"
              value={config.max_dias_periodo}
              onChange={e => setConfig({...config, max_dias_periodo: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #eee', fontSize: '14px', outline: 'none', transition: 'border-color 0.3s' }}
            />
          </div>
        </div>
      </div>

      {/* Seguridad y Mantenimiento */}
      <div className="card" style={{ padding: '20px', marginBottom: '40px', border: config.modo_mantenimiento ? '1px solid #FF9A9E' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: config.modo_mantenimiento ? '#FFF1F2' : '#E8F5E9', padding: '10px', borderRadius: '12px', color: config.modo_mantenimiento ? '#F6416C' : '#4CAF50' }}>
            <Shield size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0 }}>Seguridad y Estado</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-light)' }}>Control de acceso y mantenimiento</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>Modo Mantenimiento</span>
            {config.modo_mantenimiento && <AlertTriangle size={14} color="#F6416C" />}
          </div>
          <div 
            onClick={() => setConfig({...config, modo_mantenimiento: !config.modo_mantenimiento})}
            style={{ 
              width: '45px', height: '24px', background: config.modo_mantenimiento ? '#F6416C' : '#ccc', 
              borderRadius: '12px', position: 'relative', transition: 'background 0.3s', cursor: 'pointer'
            }}
          >
            <div style={{ 
              width: '20px', height: '20px', background: 'white', borderRadius: '50%', 
              position: 'absolute', left: config.modo_mantenimiento ? '23px' : '2px', top: '2px',
              transition: 'left 0.3s'
            }}></div>
          </div>
        </div>
        {config.modo_mantenimiento && (
          <p style={{ margin: '15px 0 0', fontSize: '11px', color: '#F6416C', fontStyle: 'italic' }}>
            * Al activar este modo, las usuarias verán un mensaje de mantenimiento y no podrán registrar datos.
          </p>
        )}
      </div>

      {/* Action Button */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <button 
          onClick={handleUpdate}
          disabled={saving}
          style={{ 
            width: '60%', padding: '16px', background: 'var(--primary)', color: 'white', 
            border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '15px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: 'pointer', boxShadow: '0 4px 15px rgba(186, 104, 200, 0.2)',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? 'Guardando...' : 'Guardar Cambios Globales'}
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        .config-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 2px rgba(186, 104, 200, 0.1);
        }
        @keyframes slideInUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Notificación de Éxito Estilo Nuvia */}
      {showSuccess && (
        <div style={{
          position: 'fixed', bottom: '40px', left: '20px', right: '20px',
          background: 'white', padding: '16px 24px', borderRadius: '20px',
          display: 'flex', alignItems: 'center', gap: '15px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          zIndex: 1000, animation: 'slideInUp 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
        }}>
          <div style={{ background: '#E8F5E9', color: '#4CAF50', padding: '8px', borderRadius: '50%', display: 'flex' }}>
            <Check size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Cambios guardados</div>
            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>La configuración global se ha actualizado correctamente.</div>
          </div>
        </div>
      )}
    </div>
  );
}
