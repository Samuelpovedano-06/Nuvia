// Variantes de cada pose de la mascota (quieta, saltando, cayendo, sentada,
// flotando, caminando) con la ropa equipada dibujada encima. Cada entrada es
// una copia de la imagen base con la prenda pintada a mano sobre esa pose.
const POR_ACCESORIO = {
  camiseta_rayas: {
    idle: '/juego/mascota-idle-rayas.png',
    jump: '/juego/mascota-jump-rayas.png',
    caida: '/juego/mascota-caida-rayas.png',
    sentado: '/mascota-sentado-rayas.png',
    flotando: '/mascota-flotando-rayas.png',
    walk: '/mascota-walk-rayas.png',
  },
  traje_marinero: {
    walk: '/mascota-walk-marinero.png',
  },
  conjunto_invierno: {
    walk: '/mascota-walk-invierno.png',
  },
};

// pose: 'idle' | 'jump' | 'caida' | 'sentado' | 'flotando' | 'walk'
export function getOutfitSprite(pose, base) {
  const equipado = localStorage.getItem('nuvia_mascot_outfit');
  return POR_ACCESORIO[equipado]?.[pose] || base;
}
