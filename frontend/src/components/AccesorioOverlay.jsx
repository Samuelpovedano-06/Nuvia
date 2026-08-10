import React from 'react';
import { ACCESORIOS } from './DormitorioSection';

export default function AccesorioOverlay({ size = 28 }) {
  const accesorioEquipado = localStorage.getItem('nuvia_mascot_outfit') || 'ninguno';
  const accesorioLado = localStorage.getItem('nuvia_accesorio_lado') || 'derecha';

  if (!accesorioEquipado || accesorioEquipado === 'ninguno') return null;
  const acc = ACCESORIOS.find(a => a.id === accesorioEquipado);
  if (!acc) return null;

  let positionStyle = { top: '-2px', left: '50%', transform: 'translateX(-50%)', fontSize: `${size}px` };
  if (acc.id === 'antifaz') {
    positionStyle = { top: `${size * 0.25}px`, left: '50%', transform: 'translateX(-50%)', fontSize: `${size * 1.4}px` };
  } else if (acc.id === 'zapatillas_conejo') {
    positionStyle = { bottom: '-2px', left: '50%', transform: 'translateX(-50%)', fontSize: `${size * 0.9}px` };
  } else if (acc.id === 'lazo_rosa') {
    if (accesorioLado === 'izquierda') {
      positionStyle = { top: `${size * 0.15}px`, left: `${size * 0.15}px`, fontSize: `${size}px`, transform: 'rotate(-10deg)' };
    } else {
      positionStyle = { top: `${size * 0.15}px`, right: `${size * 0.15}px`, fontSize: `${size}px`, transform: 'rotate(10deg)' };
    }
  } else if (acc.id === 'corona_flores') {
    positionStyle = { top: `-${size * 0.15}px`, left: '50%', transform: 'translateX(-50%)', fontSize: `${size * 1.1}px` };
  } else if (acc.id === 'gorro_noche') {
    positionStyle = { top: `-${size * 0.15}px`, left: '50%', transform: 'translateX(-50%)', fontSize: `${size * 1.1}px` };
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
