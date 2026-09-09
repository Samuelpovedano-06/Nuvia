import React, { useEffect } from 'react';
import LogroIcono from './LogroIcono';

// Notificación de "logro desbloqueado". Recibe una cola (array) de logros
// pendientes de mostrar y va sacando el primero; cuando termina su tiempo
// en pantalla, avisa con onSiguiente para que el juego pase al próximo.
//
// Usa las variables de tema de la app (--white, --text-dark, --text-light,
// --primary), que ya cambian solas con la clase body.dark-mode, así que
// esta tarjeta se ve clara u oscura según el modo oscuro esté activo o no.
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
        background: 'var(--white, #ffffff)',
        border: '1.5px solid var(--primary, #b05bb5)', borderRadius: '18px',
        padding: '12px 18px 12px 14px', maxWidth: '320px', width: 'calc(100% - 32px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.22), 0 0 22px rgba(176,91,181,0.35)',
        animation: 'logroSlideIn 0.35s cubic-bezier(0.18,0.89,0.32,1.28)'
      }}
    >
      <div style={{
        width: '44px', height: '44px', flexShrink: 0, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--primary, #b05bb5) 0%, var(--primary-light, #e891c8) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 14px rgba(176,91,181,0.5)'
      }}>
        <LogroIcono icono={logro.icono} size={22} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--primary, #b05bb5)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          ¡Logro desbloqueado!
        </div>
        <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-dark, #3d2b3f)', lineHeight: 1.2 }}>{logro.nombre}</div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-light, #8a6a8d)', marginTop: '1px' }}>{logro.descripcion}</div>
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
