import React from 'react';
import { ACCESORIOS } from './DormitorioSection';

export function TrajeMarineroOverlay({ width = 76, height = 50, top = '54%' }) {
  return (
    <div style={{
      position: 'absolute',
      top: top,
      left: '50%',
      transform: 'translateX(-50%)',
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      pointerEvents: 'none',
      zIndex: 15,
      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))'
    }}>
      <svg viewBox="0 0 100 65" width="100%" height="100%" style={{ display: 'block' }}>
        <path
          d="M 6 6 L 94 6 L 50 50 Z"
          fill="#FFFFFF"
          stroke="#1E3A8A"
          strokeWidth="6.5"
          strokeLinejoin="round"
        />
        <path
          d="M 18 12 L 82 12 L 50 44 Z"
          fill="none"
          stroke="#1E3A8A"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <polygon
          points="50,24 40,44 50,62 60,44"
          fill="#DC2626"
          stroke="#991B1B"
          strokeWidth="1.5"
        />
        <ellipse
          cx="50"
          cy="26"
          rx="7"
          ry="4.5"
          fill="#B91C1C"
        />
      </svg>
    </div>
  );
}

export default function AccesorioOverlay({ size = 28 }) {
  const accesorioEquipado = localStorage.getItem('nuvia_mascot_outfit') || 'ninguno';
  const accesorioLado = localStorage.getItem('nuvia_accesorio_lado') || 'derecha';

  if (!accesorioEquipado || accesorioEquipado === 'ninguno') return null;
  const acc = ACCESORIOS.find(a => a.id === accesorioEquipado);
  if (!acc) return null;

  if (acc.id === 'traje_marinero') {
    return <TrajeMarineroOverlay width={size * 1.1} height={size * 0.7} top="52%" />;
  }
  // La camiseta de rayas va dibujada directamente en cada pose del sprite
  // (mascota-idle-rayas.png, mascota-jump-rayas.png, mascota-caida-rayas.png, ...)
  if (acc.id === 'camiseta_rayas') return null;

  // El conjunto de invierno ya lleva el gorro y la bufanda pintados
  // directamente en mascota-idle-conjunto-invierno.png / -caida-...png
  if (acc.id === 'conjunto_invierno') return null;

  let positionStyle = { top: '-2px', left: '50%', transform: 'translateX(-50%)', fontSize: `${size}px` };
  if (acc.id === 'antifaz') {
    positionStyle = { top: `${size * 0.05}px`, left: '53%', transform: 'translateX(-50%)', fontSize: `${size * 0.56}px` };
  } else if (acc.id === 'lazo_rosa') {
    if (accesorioLado === 'izquierda') {
      positionStyle = { top: `${size * 0.14}px`, left: `${size * 0.16}px`, fontSize: `${size * 0.3}px`, transform: 'rotate(-12deg)' };
    } else {
      positionStyle = { top: `${size * 0.14}px`, right: `${size * 0.16}px`, fontSize: `${size * 0.3}px`, transform: 'rotate(12deg)' };
    }
  } else if (acc.id === 'corona_flores') {
    positionStyle = { top: `-${size * 0.38}px`, left: '50%', transform: 'translateX(-50%)', fontSize: `${size * 0.65}px` };
  }

  return (
    <div style={{
      position: 'absolute',
      ...positionStyle,
      pointerEvents: 'none',
      zIndex: 10,
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
    }}>
      {acc.icono}
    </div>
  );
}
