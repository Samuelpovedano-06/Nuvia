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
      flexShrink: 0,
      ...style,
    }}
  />
);
