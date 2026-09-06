// Variantes de cada pose de la mascota (quieta, saltando, cayendo, sentada,
// flotando, caminando) con la ropa equipada dibujada encima. Cada entrada es
// una copia de la imagen base con la prenda pintada a mano sobre esa pose.
// Sprites de caminar/sentado/flotando (los de la mascota suelta por la
// pantalla de inicio) viven en home-walk-sit-float/{walk,sentada,flotando}/;
// los de idle/jump/por_saltar/caida (usados dentro de los minijuegos) viven
// en juego/movimiento-mascota/.
//
// Varios accesorios solo tienen arte propio para la pose "quieta" por ahora;
// en el resto de poses caen al sprite base hasta que se añada más arte.
const POR_ACCESORIO = {
  camiseta_rayas: {
    idle: '/juego/movimiento-mascota/quieta/mascota-idle-rayas.png',
    jump: '/juego/movimiento-mascota/satando/mascota-jump-rayas.png',
    caida: '/juego/movimiento-mascota/caida/mascota-caida-rayas.png',
    sentado: '/home-walk-sit-float/sentada/mascota-sentado-rayas.png',
    flotando: '/home-walk-sit-float/flotando/mascota-flotando-rayas.png',
    walk: '/home-walk-sit-float/walk/mascota-walk-rayas.png',
  },
  conjunto_invierno: {
    idle: '/juego/movimiento-mascota/quieta/mascota-idle-conjunto-invierno.png',
    jump: '/juego/movimiento-mascota/satando/mascota-jump_conjunto_invierno.png',
    por_saltar: '/juego/movimiento-mascota/por-saltar/por_saltar_conjunto_invierno.png',
    caida: '/juego/movimiento-mascota/caida/mascota-caidaconjunto-invierno.png',
    walk: '/home-walk-sit-float/walk/mascota-walk-invierno.png',
    sentado: '/home-walk-sit-float/sentada/mascota-sentado-invierno.png',
    flotando: '/home-walk-sit-float/flotando/mascota-flotando_conjunto_invierno.png',
  },
  traje_marinero: {
    idle: '/juego/movimiento-mascota/quieta/mascota-idle-marinero.png',
    flotando: '/home-walk-sit-float/flotando/mascota-flotando-marinero.png',
  },
  gafas: {
    idle: '/juego/movimiento-mascota/quieta/mascota-idle-gafas.png',
    flotando: '/home-walk-sit-float/flotando/mascota-flotando-gafas.png',
  },
  mecanico: {
    idle: '/juego/movimiento-mascota/quieta/mascota-idle-mecanico.png',
    flotando: '/home-walk-sit-float/flotando/mascota-flotando-mecanico.png',
  },
  detective: {
    idle: '/juego/movimiento-mascota/quieta/mascota-idle_detective.png',
    flotando: '/home-walk-sit-float/flotando/mascota-flotando_detective.png',
  },
  antifaz: {
    idle: '/juego/movimiento-mascota/quieta/mascota-idle-gafas-sol.png',
  },
  corona_flores: {
    idle: '/juego/movimiento-mascota/quieta/mascota-idle-corona.png',
  },
  // lazo_rosa tiene 2 variantes de "quieta" (una por lado) — se resuelven
  // aparte en getOutfitSprite porque dependen también de nuvia_accesorio_lado.
};

const LAZO_IDLE = {
  izquierda: '/juego/movimiento-mascota/quieta/mascota-idle-lazo-izq.png',
  derecha: '/juego/movimiento-mascota/quieta/mascota-idle-lazo-drc.png',
};

// pose: 'idle' | 'jump' | 'por_saltar' | 'caida' | 'sentado' | 'flotando' | 'walk'
export function getOutfitSprite(pose, base) {
  const equipado = localStorage.getItem('nuvia_mascot_outfit');
  if (equipado === 'lazo_rosa' && pose === 'idle') {
    const lado = localStorage.getItem('nuvia_accesorio_lado') || 'derecha';
    return LAZO_IDLE[lado] || base;
  }
  return POR_ACCESORIO[equipado]?.[pose] || base;
}
