import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { ApiService } from '../api';
import { sumarMoneda, CoinIcon } from '../utils/coinHelper';
import AccesorioOverlay from '../components/AccesorioOverlay';

const RECORD_KEY = 'nuvia_cliffdash_record';
const JUEGO_ID = 'cliff_dash';

// Jugador — patina en horizontal a X fija; el mundo se desplaza bajo él.
const PLAYER_X = 85;
const PLAYER_W = 56;
const PLAYER_H = 56;

// Carriles horizontales apilados: el personaje cambia de carril tocando la
// mitad de arriba (sube) o de abajo (baja) de la pantalla — no hay salto ni
// zigzag diagonal, solo franjas fijas en pantalla que se recorren de lado a
// lado mientras el mundo se desplaza en horizontal. Cada carril dibuja una
// única línea recta (su propio camino) y ESA línea es la que se puede
// pisar — N carriles = N líneas verdes, sin ninguna línea extra de cierre
// que no se pueda alcanzar (la tierra del último carril solo cuelga un
// poco por debajo, sin borde propio).
const LANES = 3;
// Se juega en horizontal (pantalla forzada a landscape). Los 2 primeros
// carriles miden "lo normal" (entre un mínimo y un máximo calculado a
// partir del alto real de pantalla). Al último se le quita altura a
// propósito (proporción fija respecto a los otros dos) y esa altura se
// reparte entre los otros dos... pero como los otros dos ya tienen su
// propio máximo, lo que sobra se convierte en franja de cielo encima del
// primer carril, así el camino no queda pegado al borde de arriba. La
// tierra del último carril sigue llegando justo hasta el borde de abajo,
// sin ningún hueco.
const SKY_MARGIN_MIN = 40; // franja de cielo mínima encima del primer carril
const SKY_MARGIN_MAX = 200; // hasta dónde puede crecer esa franja
const OTHER_LANE_GAP_MIN = 70;
const OTHER_LANE_GAP_MAX = 115;
const LAST_LANE_FACTOR = 0.45; // el último carril mide esta fracción de los otros dos
const LAST_LANE_MIN_H = 32;
function computeLaneLayout(H) {
  const otherH = Math.max(OTHER_LANE_GAP_MIN, Math.min(OTHER_LANE_GAP_MAX, (H - SKY_MARGIN_MIN) / LANES));
  const lastH = Math.max(LAST_LANE_MIN_H, otherH * LAST_LANE_FACTOR);
  const skyMargin = Math.max(SKY_MARGIN_MIN, Math.min(SKY_MARGIN_MAX, H - otherH * 2 - lastH));
  return { otherH, lastH, skyMargin };
}
const LANE_LERP = 12;  // suavizado del cambio de carril (mayor = más rápido)
const SWIPE_MIN_DIST = 30; // px mínimos de deslizamiento vertical para cambiar de carril

// Velocidad
const BASE_SPEED = 200;  // px de mundo / seg
const MAX_SPEED = 480;
const SPEED_STEP = 2;    // incremento por punto de distancia

// Puntuación
const DIST_PER_POINT = 50; // px de mundo por punto de distancia

// Generación de obstáculos — nunca más de una compresa por sección, así
// siempre quedan carriles libres para poder pasar. Además, dos compresas
// del mismo carril nunca quedan más cerca que OBS_MIN_SAME_LANE_GAP entre
// sí (si no, con carril al azar en cada sección podían caer casi pegadas).
const NUM_SECTIONS = 600;
const SECTION_GAP_MIN = 220;
const SECTION_GAP_MAX = 420;
const OBS_CHANCE = 0.6;
const OBS_MIN_SAME_LANE_GAP = 700;
const OBS_W = 52, OBS_H = 46;
const START_MARGIN = 500; // tramo inicial sin obstáculos

// Nube mala (la de Sky Jump): solo empieza a aparecer a partir de cierta
// puntuación, y a diferencia de la compresa (quieta en el mundo) esta se
// mueve por su cuenta hacia atrás, en sentido contrario al del jugador —
// así se le echa encima más rápido que un obstáculo quieto. Se genera con
// mucha menos frecuencia que las compresas.
const CLOUD_MIN_SCORE = 90;
const CLOUD_SPEED = 100;          // px de mundo / seg, hacia atrás
const CLOUD_SPAWN_GAP_MIN = 1400; // px de mundo entre apariciones
const CLOUD_SPAWN_GAP_MAX = 2400;
const CLOUD_SPAWN_AHEAD = 900;    // se genera bien por delante, fuera de la pantalla
const CLOUD_W = 62, CLOUD_H = 56;

// Puentes: en cada punto de puente, solo UNO de los 3 carriles tiene suelo
// (el "seguro"); los otros dos tienen un hueco ahí. Si el jugador cruza ese
// punto en el carril seguro, sigue como si nada. Si lo cruza en cualquier
// otro carril, se cae y baja un carril (0→1, 1→2) — salvo que ya esté en
// el último carril, en cuyo caso se cae del todo y pierde.
const BRIDGE_START_OFFSET = 900;
const BRIDGE_GAP_MIN = 700;
const BRIDGE_GAP_MAX = 1200;
const BRIDGE_W = 70;
const BRIDGE_OBSTACLE_BUFFER = 150; // no coloca un puente demasiado cerca de una compresa
const NUM_BRIDGES = 220;

const SP = {
  jump: '/juego/mascota-jump.png',
  fall: '/juego/mascota-caida.png',
  compresa: '/juego/compresa.png',
  nubeMala: '/juego/Sky_Jump/enemigo.png',
};

const WALK_SHEET = '/mascota-walk.png';
const WALK_COLS = 6;
const WALK_INTERVAL = 55;

function makeTrack() {
  const obstacles = [];
  const lastXByLane = new Array(LANES).fill(-Infinity);
  let x = START_MARGIN;
  for (let i = 0; i < NUM_SECTIONS; i++) {
    if (Math.random() < OBS_CHANCE) {
      // Solo se puede colocar en un carril que no tenga ya una compresa
      // demasiado cerca en ese mismo carril.
      const candidates = [];
      for (let lane = 0; lane < LANES; lane++) {
        if (x - lastXByLane[lane] >= OBS_MIN_SAME_LANE_GAP) candidates.push(lane);
      }
      if (candidates.length > 0) {
        const lane = candidates[Math.floor(Math.random() * candidates.length)];
        obstacles.push({ x, lane });
        lastXByLane[lane] = x;
      }
    }
    x += SECTION_GAP_MIN + Math.random() * (SECTION_GAP_MAX - SECTION_GAP_MIN);
  }

  const bridges = [];
  let bx = START_MARGIN + BRIDGE_START_OFFSET;
  for (let i = 0; i < NUM_BRIDGES; i++) {
    // Si cae demasiado cerca de una compresa, se desplaza hacia delante
    // hasta encontrar hueco libre en vez de perderse — descartarlo sin más
    // dejaba huecos enormes sin ningún puente, porque con las compresas
    // tan seguidas casi la mitad de los candidatos caían "demasiado cerca".
    let tries = 0;
    while (obstacles.some(ob => Math.abs(ob.x - bx) < BRIDGE_OBSTACLE_BUFFER) && tries < 80) {
      bx += 25;
      tries++;
    }
    bridges.push({ x: bx, safeLane: Math.floor(Math.random() * LANES), resolved: false });
    bx += BRIDGE_GAP_MIN + Math.random() * (BRIDGE_GAP_MAX - BRIDGE_GAP_MIN);
  }

  const coins = [];
  let cx = START_MARGIN + 300;
  for (let i = 0; i < 150; i++) {
    if (Math.random() < 0.12) { // 12% probabilidad (poco común, valor 1)
      const lane = Math.floor(Math.random() * LANES);
      coins.push({ x: cx, lane, collected: false });
    }
    cx += 450 + Math.random() * 500;
  }

  return { obstacles, bridges, coins };
}

// Textura decorativa de la tierra: una franja ondulada más oscura dentro
// del carril, por debajo de la línea recta (que es la que marca el camino
// real). La ondulación es solo del fondo, nunca del borde por el que se
// camina. Recibe el rango [xLeft, xRight] en vez de todo el ancho del
// canvas para poder dibujar solo el tramo de un carril que sí tiene suelo
// (los huecos de los puentes cortan el carril en varios tramos).
function drawWavyFill(ctx, camX, yTop, xLeft, xRight, extraH, amp, wavelength, color) {
  ctx.beginPath();
  ctx.moveTo(xLeft - 2, yTop);
  for (let sx = xLeft - 2; sx <= xRight + 2; sx += 8) {
    const wy = yTop + Math.sin((sx + camX) / wavelength) * amp;
    ctx.lineTo(sx, wy);
  }
  ctx.lineTo(xRight + 2, yTop + extraH);
  ctx.lineTo(xLeft - 2, yTop + extraH);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export default function CliffDashGame({ onSalir, onVolverAlListado, mostrarColisiones }) {
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [monedasPartida, setMonedasPartida] = useState(0);
  const [record, setRecord] = useState(() => +(localStorage.getItem(RECORD_KEY) || 0));
  const [landscape, setLandscape] = useState(() => window.innerWidth > window.innerHeight);

  const landscapeRef = useRef(window.innerWidth > window.innerHeight);
  const phaseRef = useRef('menu');
  const scoreRef = useRef(0);
  const speedRef = useRef(BASE_SPEED);
  const cameraXRef = useRef(0);
  const laneRef = useRef(1);       // carril lógico (0 arriba .. LANES-1 abajo)
  const laneAnimRef = useRef(1);   // valor animado para la posición en pantalla
  const obstaclesRef = useRef([]);
  const cloudsRef = useRef([]);
  const bridgesRef = useRef([]);
  const coinsRef = useRef([]);
  const nextCloudSpawnXRef = useRef(0);
  const lastTRef = useRef(null);
  const animRef = useRef(null);
  const compImgRef = useRef(null);
  const cloudImgRef = useRef(null);
  const logoImgRef = useRef(null);
  const showHitboxRef = useRef(mostrarColisiones);
  const areaRef = useRef(null);
  const swipeStartRef = useRef(null); // { y, id } — para detectar deslizar arriba/abajo
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const walkFrameRef = useRef(0);
  const lastWalkTRef = useRef(0);

  const syncPhase = v => { phaseRef.current = v; setPhase(v); };
  const syncScore = v => { scoreRef.current = v; setScore(v); };

  useEffect(() => {
    ApiService.getRecordsJuego().then(recs => {
      const sv = Number(recs?.[JUEGO_ID] || 0);
      const loc = Number(localStorage.getItem(RECORD_KEY) || 0);
      const best = Math.max(sv, loc);
      setRecord(best);
      localStorage.setItem(RECORD_KEY, String(best));
      if (loc > sv) ApiService.guardarRecordJuego(JUEGO_ID, loc);
    }).catch(() => { });
  }, []);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  // Cliff Dash es horizontal (como Sky Hop): se juega en landscape con
  // pantalla completa y giro forzado, no reescalado dentro de un móvil en
  // vertical.
  useEffect(() => {
    const check = () => {
      const v = window.innerWidth > window.innerHeight;
      landscapeRef.current = v;
      setLandscape(v);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  // Salir de pantalla completa + desbloquear la orientación al desmontar
  useEffect(() => {
    return () => {
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) { }
      try { screen.orientation?.unlock?.(); } catch (_) { }
    };
  }, []);

  useEffect(() => { showHitboxRef.current = mostrarColisiones; }, [mostrarColisiones]);

  useEffect(() => {
    const img = new Image();
    img.src = SP.compresa;
    compImgRef.current = img;
    const cloudImg = new Image();
    cloudImg.src = SP.nubeMala;
    cloudImgRef.current = cloudImg;
    const logoImg = new Image();
    logoImg.src = '/logo.png';
    logoImgRef.current = logoImg;
  }, []);

  const endGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    if (playerRef.current) {
      playerRef.current.style.backgroundImage = `url('${SP.fall}')`;
      playerRef.current.style.backgroundSize = 'contain';
      playerRef.current.style.backgroundPosition = 'center';
    }
    syncPhase('over');
    const s = scoreRef.current;
    setRecord(prev => {
      if (s > prev) {
        localStorage.setItem(RECORD_KEY, String(s));
        ApiService.guardarRecordJuego(JUEGO_ID, s);
        return s;
      }
      return prev;
    });
  }, []);

  const drawWorld = useCallback((W, H) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    ctx.clearRect(0, 0, W, H);

    const camX = cameraXRef.current;
    // Los 2 primeros carriles son más bajos que el último (ver
    // computeLaneLayout); su tierra sigue llegando justo hasta el borde de
    // abajo, sin dejar hueco de cielo.
    const { otherH, lastH, skyMargin } = computeLaneLayout(H);
    const laneY = lane => skyMargin + lane * otherH;

    for (let lane = 0; lane < LANES; lane++) {
      const top = laneY(lane);
      const bottom = lane === LANES - 1 ? top + lastH : laneY(lane + 1);

      // En cada punto de puente TODOS los carriles tienen un hueco real
      // (no hay tierra debajo de ninguno ahí) — la única diferencia es que
      // el carril seguro tiene un tablón cruzando por encima del hueco, y
      // los otros dos no tienen nada. Por eso el hueco se calcula igual
      // para los 3 carriles, sin excluir el carril seguro.
      const gaps = bridgesRef.current
        .map(b => ({ left: b.x - BRIDGE_W / 2 - camX, right: b.x + BRIDGE_W / 2 - camX }))
        .filter(g => g.right > -20 && g.left < W + 20)
        .sort((a, b) => a.left - b.left);

      const drawGround = (left, right) => {
        if (right <= left) return;
        const grad = ctx.createLinearGradient(0, top, 0, bottom);
        grad.addColorStop(0, '#ffd35c');
        grad.addColorStop(1, '#ffa733');
        ctx.fillStyle = grad;
        ctx.fillRect(left, top, right - left, bottom - top);

        const waveTop = top + (bottom - top) * 0.6;
        drawWavyFill(ctx, camX, waveTop, left, right, bottom - waveTop, 7, 65, 'rgba(196,110,20,0.25)');

        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(right, top);
        ctx.strokeStyle = '#3fae1f';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(left, top - 2);
        ctx.lineTo(right, top - 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // El aviso de colisión (debug) también tiene que respetar los
        // huecos — dibujarlo de 0 a W sin más lo cruzaba entero por encima
        // de cualquier hueco, aunque ahí no hubiera suelo real.
        if (showHitboxRef.current) {
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = 'rgba(250,204,21,0.8)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(left, top - 4, right - left, 8);
          ctx.restore();
        }
      };

      let cursor = 0;
      for (const g of gaps) {
        drawGround(cursor, Math.min(g.left, W));
        cursor = Math.max(cursor, g.right);
      }
      drawGround(cursor, W);

      // Tablón de puente en el carril seguro: aquí también hay un hueco
      // real (igual que en los otros dos carriles), pero el tablón lo
      // cruza por encima a la altura de la línea, dejando pasar al
      // jugador. Se dibuja SOLO hacia abajo desde la línea (nunca hacia
      // arriba) para no invadir el hueco del carril de encima.
      for (const b of bridgesRef.current) {
        if (b.safeLane !== lane) continue;
        const sx = b.x - camX;
        if (sx + BRIDGE_W / 2 < -20 || sx - BRIDGE_W / 2 > W + 20) continue;
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(sx - BRIDGE_W / 2, top, BRIDGE_W, 12);
        ctx.strokeStyle = '#5c3a1a';
        ctx.lineWidth = 1.5;
        for (let px = -BRIDGE_W / 2 + 8; px < BRIDGE_W / 2; px += 10) {
          ctx.beginPath();
          ctx.moveTo(sx + px, top);
          ctx.lineTo(sx + px, top + 12);
          ctx.stroke();
        }
      }
    }

    const VIEW_MARGIN = 80;
    const img = compImgRef.current;
    for (const ob of obstaclesRef.current) {
      const sx = ob.x - camX;
      if (sx < -VIEW_MARGIN || sx > W + VIEW_MARGIN) continue;
      const sy = laneY(ob.lane); // apoyada sobre el camino, igual que el jugador
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, sx - OBS_W / 2, sy - OBS_H, OBS_W, OBS_H);
      } else {
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(sx - OBS_W / 2, sy - OBS_H, OBS_W, OBS_H);
      }
      if (showHitboxRef.current) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx - OBS_W / 2 + 4, sy - OBS_H + 4, OBS_W - 8, OBS_H - 8);
        ctx.restore();
      }
    }

    // Dibujar Monedas en los carriles
    if (coinsRef.current) {
      const logoImg = logoImgRef.current;
      for (const coin of coinsRef.current) {
        if (coin.collected) continue;
        const sx = coin.x - camX;
        if (sx < -VIEW_MARGIN || sx > W + VIEW_MARGIN) continue;
        const sy = laneY(coin.lane) - 22;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
        ctx.restore();

        if (logoImg?.complete && logoImg.naturalWidth > 0) {
          ctx.drawImage(logoImg, sx - 9, sy - 9, 18, 18);
        }
      }
    }

    const cloudImg = cloudImgRef.current;
    for (const cl of cloudsRef.current) {
      const sx = cl.x - camX;
      if (sx < -VIEW_MARGIN || sx > W + VIEW_MARGIN) continue;
      const sy = laneY(cl.lane);
      ctx.save();
      ctx.shadowColor = 'rgba(120,40,160,0.65)';
      ctx.shadowBlur = 14;
      if (cloudImg?.complete && cloudImg.naturalWidth > 0) {
        ctx.drawImage(cloudImg, sx - CLOUD_W / 2, sy - CLOUD_H, CLOUD_W, CLOUD_H);
      } else {
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(sx - CLOUD_W / 2, sy - CLOUD_H, CLOUD_W, CLOUD_H);
      }
      ctx.restore();
      if (showHitboxRef.current) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx - CLOUD_W / 2 + 6, sy - CLOUD_H + 6, CLOUD_W - 12, CLOUD_H - 12);
        ctx.restore();
      }
    }
  }, []);

  const gameLoop = useCallback(ts => {
    if (phaseRef.current !== 'playing') return;
    const dt = lastTRef.current ? Math.min((ts - lastTRef.current) / 1000, 0.05) : 0.016;
    lastTRef.current = ts;

    const area = areaRef.current;
    if (!area) { animRef.current = requestAnimationFrame(gameLoop); return; }
    const W = area.clientWidth;
    const H = area.clientHeight;

    cameraXRef.current += speedRef.current * dt;
    laneAnimRef.current += (laneRef.current - laneAnimRef.current) * Math.min(1, dt * LANE_LERP);

    const distScore = Math.floor(cameraXRef.current / DIST_PER_POINT);
    if (distScore !== scoreRef.current) {
      syncScore(distScore);
      speedRef.current = Math.min(BASE_SPEED + distScore * SPEED_STEP, MAX_SPEED);
    }

    const pwx = cameraXRef.current + PLAYER_X;
    const playerLeft = pwx - PLAYER_W / 2 + 6;
    const playerRight = pwx + PLAYER_W / 2 - 6;

    // Recoger Monedas
    if (coinsRef.current) {
      for (const coin of coinsRef.current) {
        if (!coin.collected && coin.lane === laneRef.current && Math.abs(coin.x - pwx) < 32) {
          coin.collected = true;
          sumarMoneda(1);
          setMonedasPartida(m => m + 1);
        }
      }
    }

    for (const ob of obstaclesRef.current) {
      if (ob.lane !== laneRef.current) continue;
      if (Math.abs(ob.x - pwx) > OBS_W) continue;
      if (playerRight > ob.x - OBS_W / 2 + 4 && playerLeft < ob.x + OBS_W / 2 - 4) {
        endGame();
        return;
      }
    }

    // Puentes: cruzar uno en el carril seguro no hace nada; cruzarlo en
    // cualquier otro carril hace que el jugador se caiga un carril hacia
    // abajo — o pierda del todo si ya estaba en el último.
    for (const b of bridgesRef.current) {
      if (b.resolved) continue;
      if (pwx < b.x - BRIDGE_W / 2) continue;
      b.resolved = true;
      if (laneRef.current !== b.safeLane) {
        if (laneRef.current >= LANES - 1) {
          endGame();
          return;
        }
        laneRef.current += 1;
      }
    }

    // Nube mala: aparece solo pasada cierta puntuación, y a diferencia de
    // la compresa se mueve por su cuenta hacia atrás (contra el sentido
    // del jugador), así que cierra la distancia más rápido. Solo se coloca
    // en un carril que no tenga ninguna compresa en todo el tramo que la
    // nube va a recorrer (desde el jugador hasta su punto de aparición),
    // para que nunca se solape con una y obligue a esquivar las dos a la
    // vez sin poder reaccionar.
    if (distScore >= CLOUD_MIN_SCORE && cameraXRef.current >= nextCloudSpawnXRef.current) {
      const spawnX = cameraXRef.current + CLOUD_SPAWN_AHEAD;
      const laneCandidates = [];
      for (let lane = 0; lane < LANES; lane++) {
        const blocked = obstaclesRef.current.some(ob => ob.lane === lane && ob.x >= pwx - 100 && ob.x <= spawnX + 100);
        if (!blocked) laneCandidates.push(lane);
      }
      if (laneCandidates.length > 0) {
        cloudsRef.current.push({
          x: spawnX,
          lane: laneCandidates[Math.floor(Math.random() * laneCandidates.length)],
        });
      }
      nextCloudSpawnXRef.current = cameraXRef.current + CLOUD_SPAWN_GAP_MIN + Math.random() * (CLOUD_SPAWN_GAP_MAX - CLOUD_SPAWN_GAP_MIN);
    }
    for (const cl of cloudsRef.current) cl.x -= CLOUD_SPEED * dt;
    cloudsRef.current = cloudsRef.current.filter(cl => cl.x > cameraXRef.current - 200);

    for (const cl of cloudsRef.current) {
      if (cl.lane !== laneRef.current) continue;
      if (Math.abs(cl.x - pwx) > CLOUD_W) continue;
      if (playerRight > cl.x - CLOUD_W / 2 + 6 && playerLeft < cl.x + CLOUD_W / 2 - 6) {
        endGame();
        return;
      }
    }

    drawWorld(W, H);

    if (playerRef.current) {
      // El personaje se apoya sobre la línea recta del carril (igual que
      // las compresas), no flota en medio de la franja de tierra.
      const { otherH: laneOtherH, skyMargin: laneSkyMargin } = computeLaneLayout(H);
      const lineY = laneSkyMargin + laneAnimRef.current * laneOtherH;
      playerRef.current.style.top = `${lineY - PLAYER_H}px`;

      const now = performance.now();
      if (now - lastWalkTRef.current >= WALK_INTERVAL) {
        walkFrameRef.current = (walkFrameRef.current + 1) % WALK_COLS;
        lastWalkTRef.current = now;
      }
      const fx = walkFrameRef.current * PLAYER_W;
      playerRef.current.style.backgroundImage = `url('${WALK_SHEET}')`;
      playerRef.current.style.backgroundSize = `${WALK_COLS * PLAYER_W}px ${2 * PLAYER_H}px`;
      playerRef.current.style.backgroundPosition = `-${fx}px 0px`;
    }

    animRef.current = requestAnimationFrame(gameLoop);
  }, [drawWorld, endGame]);

  const moveLane = useCallback(delta => {
    if (phaseRef.current !== 'playing') return;
    laneRef.current = Math.max(0, Math.min(LANES - 1, laneRef.current + delta));
  }, []);

  const exitFullscreen = async () => {
    // Esperar a que la pantalla completa se cierre DE VERDAD antes de
    // navegar de vuelta al listado. En algunos navegadores móviles la
    // promesa se resuelve antes de que document.fullscreenElement se
    // actualice, así que además comprobamos el estado real (con límite de
    // tiempo por si nunca llega a soltarse del todo) — si no, la barra de
    // menús puede quedarse calculada con un viewport a medio asentar y no
    // aparecer.
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        const start = Date.now();
        while (document.fullscreenElement && Date.now() - start < 500) {
          await new Promise(r => setTimeout(r, 50));
        }
      }
    } catch (_) { }
    try { screen.orientation?.unlock?.(); } catch (_) { }
    window.dispatchEvent(new Event('resize'));
    await new Promise(r => setTimeout(r, 60));
  };

  const handleExit = async () => {
    await exitFullscreen();
    onVolverAlListado?.();
  };

  const handleSalirExit = async () => {
    await exitFullscreen();
    onSalir?.();
  };

  const handleGirar = async () => {
    try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch (_) { }
    try {
      await screen.orientation?.lock?.('landscape');
      setLandscape(true);
      landscapeRef.current = true;
    } catch (_) { }
  };

  const startGame = useCallback(async () => {
    try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch (_) { }
    try {
      await screen.orientation?.lock?.('landscape');
      setLandscape(true);
      landscapeRef.current = true;
    } catch (_) { }
    cancelAnimationFrame(animRef.current);
    const { obstacles, bridges, coins } = makeTrack();
    obstaclesRef.current = obstacles;
    bridgesRef.current = bridges;
    coinsRef.current = coins;
    cloudsRef.current = [];
    nextCloudSpawnXRef.current = CLOUD_MIN_SCORE * DIST_PER_POINT;
    cameraXRef.current = 0;
    laneRef.current = 1;
    laneAnimRef.current = 1;
    speedRef.current = BASE_SPEED;
    lastTRef.current = null;
    walkFrameRef.current = 0;
    syncScore(0);
    setMonedasPartida(0);
    if (playerRef.current) {
      playerRef.current.style.backgroundSize = `${WALK_COLS * PLAYER_W}px ${2 * PLAYER_H}px`;
    }
    syncScore(0);
    syncPhase('playing');
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      cancelAnimationFrame(animRef.current);
      syncPhase('paused');
    } else if (phaseRef.current === 'paused') {
      lastTRef.current = null;
      syncPhase('playing');
      animRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameLoop]);

  const btn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '999px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' };
  const btnSec = { ...btn, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)' };

  const Overlay = ({ children }) => (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      {children}
    </div>
  );

  // Cliff Dash es un juego horizontal — igual que Sky Hop, fuera del menú
  // se pide girar el móvil en vez de encajar los 3 carriles en vertical.
  if (phase !== 'menu' && !landscape) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'linear-gradient(160deg, #2b0b30 0%, #52185c 50%, #852296 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '18px',
      }}>
        <div style={{ fontSize: '72px', animation: 'hd-rotate-phone 2.2s ease-in-out infinite' }}>📱</div>
        <p style={{ color: '#fff', fontSize: '20px', fontWeight: 800, textAlign: 'center', margin: 0 }}>
          Gira el teléfono
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', textAlign: 'center', margin: 0, maxWidth: '240px' }}>
          Cliff Dash se juega en orientación horizontal
        </p>
        <button
          onClick={handleExit}
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '10px 24px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}
        >
          ← Volver a juegos
        </button>
        <style>{`
          @keyframes hd-rotate-phone {
            0%,100% { transform:rotate(0deg) scale(1); }
            30%     { transform:rotate(-90deg) scale(1.1); }
            70%     { transform:rotate(-90deg) scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={areaRef}
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', userSelect: 'none', touchAction: 'none', background: 'linear-gradient(180deg, #6fc9ec 0%, #a7e1f4 100%)' }}
      onPointerDown={e => {
        e.preventDefault();
        if (phaseRef.current !== 'playing') return;
        swipeStartRef.current = { y: e.clientY, id: e.pointerId };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { }
      }}
      onPointerUp={e => {
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        if (!start || start.id !== e.pointerId || phaseRef.current !== 'playing') return;
        const deltaY = e.clientY - start.y;
        if (Math.abs(deltaY) < SWIPE_MIN_DIST) return;
        // Deslizar hacia arriba (deltaY negativo) sube de carril; hacia
        // abajo (deltaY positivo) baja, sin importar en qué punto de la
        // pantalla empiece el gesto.
        moveLane(deltaY < 0 ? -1 : 1);
      }}
      onPointerCancel={() => { swipeStartRef.current = null; }}
    >
      {/* Carriles y compresas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Jugador (X fija en pantalla, el mundo se desplaza en horizontal) */}
      <div
        ref={playerRef}
        style={{
          position: 'absolute',
          left: PLAYER_X - PLAYER_W / 2,
          top: `calc(50% - ${PLAYER_H / 2}px)`,
          width: PLAYER_W, height: PLAYER_H,
          backgroundImage: `url('${SP.jump}')`, backgroundSize: 'contain',
          backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))', pointerEvents: 'none', zIndex: 20,
        }}
      >
        <AccesorioOverlay size={22} />
      </div>

      {/* Puntuación */}
      {phase === 'playing' && (
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 30, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: 20, padding: '5px 12px', fontWeight: 800, fontSize: 14, color: 'var(--primary, #852296)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CoinIcon size={16} /> {monedasPartida}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: 20, padding: '5px 18px', fontWeight: 800, fontSize: 20, color: 'var(--primary)' }}>
            {score}
          </div>
        </div>
      )}

      {/* Botón de pausa */}
      {phase === 'playing' && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={togglePause}
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 30, background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Pause size={18} color="var(--primary)" />
        </button>
      )}

      {/* Menú */}
      {phase === 'menu' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #2b0b30 0%, #52185c 50%, #852296 100%)', zIndex: 200, padding: '16px 24px', overflowY: 'auto' }}>
          <svg style={{ position: 'absolute', bottom: 0, width: '100%', opacity: 0.22 }} viewBox="0 0 400 200" preserveAspectRatio="none">
            <path d="M0,150 Q50,80 100,130 Q150,60 200,110 Q250,50 300,100 Q350,70 400,120 L400,200 L0,200Z" fill="#8b5cf6" />
            <path d="M0,170 Q60,120 120,150 Q180,100 240,140 Q300,110 360,150 L400,160 L400,200 L0,200Z" fill="#6d28d9" />
          </svg>
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '38px', marginBottom: '2px' }}>🏃</div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.5px', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>Cliff Dash</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 12px' }}>¡Corre sin parar y esquiva las compresas!</p>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '14px', padding: '10px 14px', marginBottom: '14px', textAlign: 'left', width: '100%' }}>
              {[
                ['👆', 'Arriba / Abajo', 'Toca arriba o abajo para cambiar de carril'],
                ['🪵', 'Puentes', 'Solo 1 carril seguro por corte; si no, caes'],
                ['🌩️', 'Nube mala', 'A partir de 90 pts, ¡esquiva la nube mala!']
              ].map(([icon, title, sub]) => (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '12px' }}>{title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
            {record > 0 && <div style={{ color: '#FFD700', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>🏆 Récord: {record}</div>}
            <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
              <button onClick={startGame} style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)', color: '#fff', border: 'none', borderRadius: '14px', padding: '11px 0', fontSize: '15px', fontWeight: 800, cursor: 'pointer', width: '100%', maxWidth: '200px', boxShadow: '0 8px 32px rgba(233,30,140,0.5)' }}>▶ Jugar</button>
              <button onClick={handleExit} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '11px 0', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%', maxWidth: '200px' }}>← Volver</button>
            </div>
          </div>
        </div>
      )}

      {/* Pausa */}
      {phase === 'paused' && (
        <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Pausa</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '6px 0 14px' }}>¡Tómate un respiro!</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 220 }}>
            <button onClick={togglePause} style={btn}><Play size={18} fill="white" /> Reanudar</button>
            <button onClick={handleExit} style={btnSec}>Volver atrás</button>
            <button onClick={handleSalirExit} style={btnSec}>Salir</button>
          </div>
        </Overlay>
      )}

      {/* Fin de partida */}
      {phase === 'over' && (
        <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>¡Te has caído!</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '6px 0 4px' }}>
            Puntos: <strong style={{ color: 'var(--primary)', fontSize: 24 }}>{score}</strong>
          </p>
          {score > 0 && score >= record && <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13, margin: '0 0 10px' }}>¡Nuevo récord!</p>}
          {(score === 0 || score < record) && <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 10px' }}>Récord: <strong style={{ color: 'var(--primary)' }}>{record}</strong></p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 220 }}>
            <button onClick={startGame} style={btn}><Play size={18} fill="white" /> Jugar de nuevo</button>
            <button onClick={handleExit} style={btnSec}>Volver atrás</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
