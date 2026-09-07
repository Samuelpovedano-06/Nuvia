import React from 'react';
import { Bug, X } from 'lucide-react';

// Interruptor con el mismo estilo (píldora + círculo deslizante) que ya usa
// el resto de la app en las pantallas de ajustes.
function Toggle({ label, checked, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
    >
      <span style={{ fontSize: '13px', color: '#1E293B' }}>{label}</span>
      <div style={{
        width: '40px', height: '22px', flexShrink: 0,
        background: checked ? '#F6416C' : '#ccc',
        borderRadius: '11px', position: 'relative', transition: 'background 0.2s'
      }}>
        <div style={{
          width: '18px', height: '18px', background: 'white', borderRadius: '50%',
          position: 'absolute', left: checked ? '20px' : '2px', top: '2px',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
        }} />
      </div>
    </div>
  );
}

// Botón + desplegable de debug de minijuegos, solo visible para admin.
// Se coloca igual en los 8 minijuegos y en el selector de minijuegos.
export default function DebugPanel({ esAdmin, debugConfig, setDebugConfig, show, setShow, style }) {
  if (!esAdmin) return null;
  const activo = debugConfig.colisiones || debugConfig.pausado || debugConfig.modoDios;

  return (
    <div style={{ position: 'relative', display: 'inline-block', zIndex: 300, ...style }}>
      <button
        onClick={() => setShow(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: activo ? '#F6416C' : 'rgba(255,255,255,0.92)',
          border: '1.5px solid #F6416C', borderRadius: '10px', padding: '6px 10px',
          fontSize: '12px', color: activo ? 'white' : '#F6416C', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
        }}
      >
        <Bug size={14} /> Debug
      </button>

      {show && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          background: 'white', borderRadius: '14px', padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: '12px', width: '230px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F6416C', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Debug (solo admin)
            </span>
            <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
          <Toggle
            label="Ver líneas de colisión"
            checked={debugConfig.colisiones}
            onChange={() => setDebugConfig(c => ({ ...c, colisiones: !c.colisiones }))}
          />
          <Toggle
            label="Pausar (todo menos la mascota)"
            checked={debugConfig.pausado}
            onChange={() => setDebugConfig(c => ({ ...c, pausado: !c.pausado }))}
          />
          <Toggle
            label="Modo Dios (no morir)"
            checked={debugConfig.modoDios}
            onChange={() => setDebugConfig(c => ({ ...c, modoDios: !c.modoDios }))}
          />
        </div>
      )}
    </div>
  );
}
