import React from 'react';
import { Trophy } from 'lucide-react';
import { CoinIcon } from '../utils/coinHelper';

// Icono de un logro: usa imágenes/iconos reales de la app cuando el logro
// tiene uno asociado ('coin' = moneda de Nuvia, 'trophy' = mismo icono que
// el ranking, o una ruta '/...' a un sprite del propio minijuego) y cae a
// un emoji simple cuando no hay un equivalente visual claro en la app.
export default function LogroIcono({ icono, size = 20 }) {
  if (icono === 'coin') return <CoinIcon size={size} />;
  if (icono === 'trophy') return <Trophy size={size} color="currentColor" />;
  if (typeof icono === 'string' && icono.startsWith('/')) {
    return (
      <img
        src={icono}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    );
  }
  return (
    <span style={{ fontSize: size, lineHeight: 1, display: 'block' }}>{icono}</span>
  );
}
