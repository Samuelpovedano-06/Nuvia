import React from 'react';

// Componente visual reutilizable para mostrar la moneda de Nuvia usando el logo oficial de la app
export const CoinIcon = ({ size = 22, style = {} }) => (
  <img
    src="/logo.png"
    alt="Moneda Nuvia"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      display: 'inline-block',
      verticalAlign: 'middle',
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
      ...style,
    }}
  />
);
