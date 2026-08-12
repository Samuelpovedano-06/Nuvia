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
    positionStyle = { top: `${size * 0.05}px`, left: '53%', transform: 'translateX(-50%)', fontSize: `${size * 0.56}px` };
  } else if (acc.id === 'zapatillas_conejo') {
    positionStyle = { bottom: '0px', left: '50%', transform: 'translateX(-50%)', fontSize: `${size * 0.25}px` };
  } else if (acc.id === 'lazo_rosa') {
    if (accesorioLado === 'izquierda') {
      positionStyle = { top: `${size * 0.14}px`, left: `${size * 0.16}px`, fontSize: `${size * 0.3}px`, transform: 'rotate(-12deg)' };
    } else {
      positionStyle = { top: `${size * 0.14}px`, right: `${size * 0.16}px`, fontSize: `${size * 0.3}px`, transform: 'rotate(12deg)' };
    }
  } else if (acc.id === 'corona_flores') {
    positionStyle = { top: `-${size * 0.38}px`, left: '50%', transform: 'translateX(-50%)', fontSize: `${size * 0.65}px` };
  } else if (acc.id === 'gorro_noche') {
    positionStyle = { top: `-${size * 0.12}px`, left: '50%', transform: 'translateX(-50%)', fontSize: `${size * 0.4}px` };
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
