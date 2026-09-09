// Definición de los logros de minijuegos: 5 por juego (40 en total).
// Cada logro tiene una condición que se evalúa contra las estadísticas
// finales de una partida (ver cada *Game.jsx, función endGame). El id es
// el mismo para siempre — nunca lo cambies o se perderán los ya conseguidos.
//
// stats esperadas por juego (lo que le pasa cada juego a revisarLogros):
//   esquivar_compresas: { puntos, vidas, monedas }
//   sky_jump:            { metros, monedas, portal }
//   sky_hop:              { saltos, estrellas, monedas }
//   food_drop:            { atrapados, fallos, monedas }
//   cliff_jump:           { saltos, monedas }
//   cliff_dash:           { distancia, nubesEsquivadas, monedas }
//   tumble:                { metros, monedas }
//   hill_drive:           { metros }

export const LOGROS = {
  esquivar_compresas: [
    { id: 'esquivar_r1', nombre: 'Primeros esquives', descripcion: 'Esquiva 10 compresas en una partida', icono: '🎯', condicion: s => s.puntos >= 10 },
    { id: 'esquivar_r2', nombre: 'Esquivadora experta', descripcion: 'Esquiva 100 compresas en una partida', icono: '🎯', condicion: s => s.puntos >= 100 },
    { id: 'esquivar_r3', nombre: 'Maestra esquivando', descripcion: 'Esquiva 200 compresas en una partida', icono: '🏆', condicion: s => s.puntos >= 200 },
    { id: 'esquivar_skill', nombre: 'Racha perfecta', descripcion: 'Llega a 100 esquives sin perder ninguna vida', icono: '💎', condicion: s => s.puntos >= 100 && s.vidas >= 3 },
    { id: 'esquivar_especial', nombre: 'Cazamonedas', descripcion: 'Recoge 15 monedas en una sola partida', icono: '🪙', condicion: s => s.monedas >= 15 },
  ],

  sky_jump: [
    { id: 'skyjump_r1', nombre: 'Despegue', descripcion: 'Alcanza 50 metros de altura', icono: '🚀', condicion: s => s.metros >= 50 },
    { id: 'skyjump_r2', nombre: 'Rumbo a las nubes', descripcion: 'Alcanza 150 metros de altura', icono: '🚀', condicion: s => s.metros >= 150 },
    { id: 'skyjump_r3', nombre: 'Casi en órbita', descripcion: 'Alcanza 300 metros de altura', icono: '🏆', condicion: s => s.metros >= 300 },
    { id: 'skyjump_skill', nombre: 'Recolectora del cielo', descripcion: 'Recoge 5 monedas en una sola partida', icono: '🪙', condicion: s => s.monedas >= 5 },
    { id: 'skyjump_especial', nombre: 'Zona Nuvia desbloqueada', descripcion: 'Cruza el portal de los 200 metros', icono: '🌀', condicion: s => !!s.portal },
  ],

  sky_hop: [
    { id: 'skyhop_r1', nombre: 'Primeros saltos', descripcion: 'Consigue 20 saltos en una partida', icono: '🐇', condicion: s => s.saltos >= 20 },
    { id: 'skyhop_r2', nombre: 'Salto ágil', descripcion: 'Consigue 60 saltos en una partida', icono: '🐇', condicion: s => s.saltos >= 60 },
    { id: 'skyhop_r3', nombre: 'Leyenda saltarina', descripcion: 'Consigue 120 saltos en una partida', icono: '🏆', condicion: s => s.saltos >= 120 },
    { id: 'skyhop_skill', nombre: 'Cazaestrellas', descripcion: 'Recoge 5 estrellas de bonus en una partida', icono: '⭐', condicion: s => s.estrellas >= 5 },
    { id: 'skyhop_especial', nombre: 'Bolsillos llenos', descripcion: 'Recoge 8 monedas en una sola partida', icono: '🪙', condicion: s => s.monedas >= 8 },
  ],

  food_drop: [
    { id: 'fooddrop_r1', nombre: 'Buen apetito', descripcion: 'Atrapa 20 alimentos en una partida', icono: '🍓', condicion: s => s.atrapados >= 20 },
    { id: 'fooddrop_r2', nombre: 'Nutrición experta', descripcion: 'Atrapa 60 alimentos en una partida', icono: '🍓', condicion: s => s.atrapados >= 60 },
    { id: 'fooddrop_r3', nombre: 'Chef estrella', descripcion: 'Atrapa 120 alimentos en una partida', icono: '🏆', condicion: s => s.atrapados >= 120 },
    { id: 'fooddrop_skill', nombre: 'Mano firme', descripcion: 'Atrapa 30 alimentos sin fallar ninguno', icono: '🎯', condicion: s => s.atrapados >= 30 && s.fallos === 0 },
    { id: 'fooddrop_especial', nombre: 'Buscadora de monedas', descripcion: 'Recoge 10 monedas en una sola partida', icono: '🪙', condicion: s => s.monedas >= 10 },
  ],

  cliff_jump: [
    { id: 'cliffjump_r1', nombre: 'Primer salto al vacío', descripcion: 'Cruza 15 precipicios en una partida', icono: '🪨', condicion: s => s.saltos >= 15 },
    { id: 'cliffjump_r2', nombre: 'Saltadora experta', descripcion: 'Cruza 50 precipicios en una partida', icono: '🪨', condicion: s => s.saltos >= 50 },
    { id: 'cliffjump_r3', nombre: 'Sin miedo a las alturas', descripcion: 'Cruza 100 precipicios en una partida', icono: '🏆', condicion: s => s.saltos >= 100 },
    { id: 'cliffjump_skill', nombre: 'Manos rápidas', descripcion: 'Recoge 10 monedas en una sola partida', icono: '🪙', condicion: s => s.monedas >= 10 },
    { id: 'cliffjump_especial', nombre: 'Fortuna', descripcion: 'Recoge 25 monedas en una sola partida', icono: '💰', condicion: s => s.monedas >= 25 },
  ],

  cliff_dash: [
    { id: 'cliffdash_r1', nombre: 'A toda carrera', descripcion: 'Consigue 30 puntos de distancia en una partida', icono: '🏃', condicion: s => s.distancia >= 30 },
    { id: 'cliffdash_r2', nombre: 'Corredora veterana', descripcion: 'Consigue 90 puntos de distancia en una partida', icono: '🏃', condicion: s => s.distancia >= 90 },
    { id: 'cliffdash_r3', nombre: 'Imparable', descripcion: 'Consigue 180 puntos de distancia en una partida', icono: '🏆', condicion: s => s.distancia >= 180 },
    { id: 'cliffdash_skill', nombre: 'Bolsillos llenos', descripcion: 'Recoge 10 monedas en una sola partida', icono: '🪙', condicion: s => s.monedas >= 10 },
    { id: 'cliffdash_especial', nombre: 'Esquiva nubes', descripcion: 'Esquiva 10 nubes tormentosas en una partida', icono: '⛈️', condicion: s => s.nubesEsquivadas >= 10 },
  ],

  tumble: [
    { id: 'tumble_r1', nombre: 'Primeros metros', descripcion: 'Desciende 30 metros en una partida', icono: '🌀', condicion: s => s.metros >= 30 },
    { id: 'tumble_r2', nombre: 'Rodando bien', descripcion: 'Desciende 100 metros en una partida', icono: '🌀', condicion: s => s.metros >= 100 },
    { id: 'tumble_r3', nombre: 'Caída legendaria', descripcion: 'Desciende 200 metros en una partida', icono: '🏆', condicion: s => s.metros >= 200 },
    { id: 'tumble_skill', nombre: 'Recolectora rodante', descripcion: 'Recoge 10 monedas en una sola partida', icono: '🪙', condicion: s => s.monedas >= 10 },
    { id: 'tumble_especial', nombre: 'Bola de oro', descripcion: 'Recoge 20 monedas en una sola partida', icono: '💰', condicion: s => s.monedas >= 20 },
  ],

  hill_drive: [
    // Solo de distancia recorrida, sin categorías de habilidad.
    { id: 'hilldrive_r1', nombre: 'Primeras curvas', descripcion: 'Recorre 100 metros en una partida', icono: '🚗', condicion: s => s.metros >= 100 },
    { id: 'hilldrive_r2', nombre: 'Rodando lejos', descripcion: 'Recorre 300 metros en una partida', icono: '🚗', condicion: s => s.metros >= 300 },
    { id: 'hilldrive_r3', nombre: 'Conductora experta', descripcion: 'Recorre 600 metros en una partida', icono: '🏆', condicion: s => s.metros >= 600 },
    { id: 'hilldrive_r4', nombre: 'Kilómetros de sobra', descripcion: 'Recorre 1000 metros en una partida', icono: '🏆', condicion: s => s.metros >= 1000 },
    { id: 'hilldrive_r5', nombre: 'Reina de las colinas', descripcion: 'Recorre 1500 metros en una partida', icono: '👑', condicion: s => s.metros >= 1500 },
  ],
};

// Revisa los logros de un juego contra las stats finales de la partida y
// desbloquea (en servidor + localStorage) los que se cumplan y aún no
// estuvieran conseguidos. Devuelve la lista de logros recién desbloqueados
// (para encolar sus notificaciones), en el mismo orden que LOGROS[juego].
export function revisarLogros(juego, stats, desbloqueadosSet) {
  const lista = LOGROS[juego] || [];
  const nuevos = [];
  for (const logro of lista) {
    if (desbloqueadosSet.has(logro.id)) continue;
    try {
      if (logro.condicion(stats)) nuevos.push(logro);
    } catch (_) { /* stats incompleta, ignora este logro esta vez */ }
  }
  return nuevos;
}
