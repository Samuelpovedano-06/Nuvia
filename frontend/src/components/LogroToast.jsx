import React, { useEffect } from 'react';

// Notificación de "logro desbloqueado". Recibe una cola (array) de logros
// pendientes de mostrar y va sacando el primero; cuando termina su tiempo
// en pantalla, avisa con onSiguiente para que el juego pase al próximo.
export default function LogroToast({ cola, onSiguiente }) {
  const logro = cola?.[0];

  useEffect(() => {
    if (!logro) return;
    const t = setTimeout(onSiguiente, 3200);
    return () => clearTimeout(t);
  }, [logro, onSiguiente]);

  if (!logro) return null;

  return (
    <div
      key={logro.id}
      style={{
        position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 500, display: 'flex', alignItems: 'center', gap: '12px',
        background: 'linear-gradient(135deg, #2D1436 0%, #1A0B24 100%)',
        border: '1.5px solid #F59E0B', borderRadius: '18px',
        padding: '12px 18px 12px 14px', maxWidth: '320px', width: 'calc(100% - 32px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.4), 0 0 24px rgba(245,158,11,0.25)',
        animation: 'logroSlideIn 0.35s cubic-bezier(0.18,0.89,0.32,1.28)'
      }}
    >
      <div style={{
        width: '44px', height: '44px', flexShrink: 0, borderRadius: '50%',
        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        display: 'grid', placeItems: 'center', fontSize: '22px',
        boxShadow: '0 0 16px rgba(245,158,11,0.5)'
      }}>
        {logro.icono}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#FDE047', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          ¡Logro desbloqueado!
        </div>
        <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>{logro.nombre}</div>
        <div style={{ fontSize: '11.5px', color: '#E9D5FF', marginTop: '1px' }}>{logro.descripcion}</div>
      </div>
      <style>{`
        @keyframes logroSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.94); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
