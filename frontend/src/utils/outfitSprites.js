// Variantes de cada pose de la mascota (quieta, saltando, cayendo, sentada,
// flotando, caminando) con la ropa equipada dibujada encima. Cada entrada es
// una copia de la imagen base con la prenda pintada a mano sobre esa pose.
// Sprites de caminar/sentado/flotando (los de la mascota suelta por la
// pantalla de inicio) viven en home-walk-sit-float/; los de idle/jump/caida
// (usados dentro de los minijuegos) viven en juego/movimiento-mascota/.
const POR_ACCESORIO = {
  camiseta_rayas: {
    idle: '/juego/movimiento-mascota/quieta/mascota-idle-rayas.png',
    jump: '/juego/movimiento-mascota/satando/mascota-jump-rayas.png',
    caida: '/juego/movimiento-mascota/caida/mascota-caida-rayas.png',
    sentado: '/home-walk-sit-float/mascota-sentado-rayas.png',
    flotando: '/home-walk-sit-float/mascota-flotando-rayas.png',
    walk: '/home-walk-sit-float/mascota-walk-rayas.png',
  },
  // traje_marinero no tiene sprite de caminar propio por ahora (se está
  // rehaciendo el arte); cae al sprite base hasta que se añada uno nuevo.
  conjunto_invierno: {
    idle: '/juego/movimiento-mascota/quieta/mascota-idle-conjunto-invierno.png',
    jump: '/juego/movimiento-mascota/satando/mascota-jump_conjunto_invierno.png',
    por_saltar: '/juego/movimiento-mascota/por-saltar/por_saltar_conjunto_invierno.png',
    caida: '/juego/movimiento-mascota/caida/mascota-caidaconjunto-invierno.png',
    walk: '/home-walk-sit-float/mascota-walk-invierno.png',
    sentado: '/home-walk-sit-float/mascota-sentado-invierno.png',
    flotando: '/home-walk-sit-float/mascota-flotando_conjunto_invierno.png',
  },
};

// pose: 'idle' | 'jump' | 'por_saltar' | 'caida' | 'sentado' | 'flotando' | 'walk'
export function getOutfitSprite(pose, base) {
  const equipado = localStorage.getItem('nuvia_mascot_outfit');
  return POR_ACCESORIO[equipado]?.[pose] || base;
}
