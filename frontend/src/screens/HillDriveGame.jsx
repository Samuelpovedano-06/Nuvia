import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, ChevronLeft } from 'lucide-react';
import { ApiService } from '../api';

// ─────────────────────── Constantes ───────────────────────
const RECORD_KEY = 'nuvia_hilldrive_record';
const JUEGO_ID = 'hill_drive';
const GRAVITY = 980;
const SPRING_K = 2800;
const DAMPING = 60;
const MAX_TORQUE = 14000;
const WHEEL_RADIUS = 14;
const CHASSIS_W = 70;
const CHASSIS_H = 22;
const MASS = 1.0;
const I_INERTIA = 0.85;
const FRICTION = 0.82;
const TILT_KILL_DEG = 125;
const TIMER_INIT = 60000;
const FUEL_BONUS_MS = 8000;
const FUEL_INTERVAL = 4500;
const TERRAIN_STEP = 5;
const TERRAIN_FREQ = 0.0016;
const TERRAIN_AMP = 85;
const TERRAIN_AMP2 = 32;
const TERRAIN_FREQ2 = 0.004;
const AMP_RAMP = 0.004;
const METERS_PER_PX = 0.01;
const CAM_X_OFFSET = 0.32;
const MAX_VX = 1100;
const MAX_VY = 1800;

// ─────────────────────── Perlin Noise 1D (inline) ───────────────────────
function buildPerlin(seed = 42) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = ((s >>> 0) % (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x) => (h & 1) === 0 ? x : -x;
  return x => {
    const xi = Math.floor(x) & 255;
    const xf = x - Math.floor(x);
    return lerp(grad(perm[perm[xi]], xf), grad(perm[perm[xi + 1]], xf - 1), fade(xf));
  };
}

// ─────────────────────── Terreno ───────────────────────
function terrainY(worldX, baseY, nA, nB, distMeters) {
  const boost = 1 + distMeters * AMP_RAMP;
  const a1 = Math.min(TERRAIN_AMP * boost, 280);
  const a2 = Math.min(TERRAIN_AMP2 * boost, 110);
  // Zona de salida plana breve para un arranque suave
  const startFlat = Math.min(1.0, Math.max(0, (worldX - 40) / 180));
  return baseY - (nA(worldX * TERRAIN_FREQ) * a1 + nB(worldX * TERRAIN_FREQ2) * a2) * startFlat;
}

function terrainHeightAt(worldX, pts) {
  const i = Math.max(0, Math.min(pts.length - 2, Math.floor(worldX / TERRAIN_STEP)));
  const p0 = pts[i], p1 = pts[i + 1];
  if (!p0 || !p1) return p0?.y ?? 400;
  const t = (worldX - p0.x) / (p1.x - p0.x || 1);
  return p0.y + t * (p1.y - p0.y);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function deg(r) { return r * 180 / Math.PI; }

// ─────────────────────── Componente ───────────────────────
export default function HillDriveGame({ onSalir, onVolverAlListado }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const pausadoRef = useRef(false);
  const bgImgRef = useRef(null);  // fondo_nubes.png precargado

  const [fase, setFase] = useState('inicio');
  const [puntuacion, setPuntuacion] = useState(0);
  const [tiempoMs, setTiempoMs] = useState(TIMER_INIT);
  const [record, setRecord] = useState(() => Number(localStorage.getItem(RECORD_KEY) || 0));
  const [causaGameover, setCausaGO] = useState('');
  const [pausado, setPausado] = useState(false);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== 'undefined' && window.innerHeight > window.innerWidth
  );
  const faseRef = useRef('inicio');
  useEffect(() => { faseRef.current = fase; }, [fase]);

  // ─── Forzar orientación horizontal ───
  // El bloqueo de orientación (y la pantalla completa) solo funciona si se
  // pide dentro de un gesto del usuario (p. ej. al pulsar "Jugar"), nunca
  // al montar el componente — por eso el intento real vive en
  // iniciarJuego/handleGirar, igual que en Sky Hop y Cliff Dash. Aquí solo
  // seguimos la orientación actual para mostrar el aviso de "gira el móvil".
  const wasPortraitRef = useRef(isPortrait);
  useEffect(() => {
    const onResize = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const wasPortrait = wasPortraitRef.current;
      wasPortraitRef.current = portrait;
      setIsPortrait(portrait);
      // Si el juego se había iniciado en vertical (el bloqueo de pantalla
      // falló o tardó) y el jugador acaba de girar el móvil a horizontal,
      // el terreno ya generado quedó calculado con las medidas verticales
      // (mucho más alto que ancho) y aparece fuera de la pantalla nueva.
      // Hay que regenerar el estado entero con las medidas reales, no solo
      // parchear W/H sobre el terreno viejo.
      if (!portrait && faseRef.current === 'jugando') {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const reinit = wasPortrait; // pasó de vertical a horizontal: regenerar de cero
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const W = canvas.offsetWidth || window.innerWidth;
          const H = canvas.offsetHeight || window.innerHeight;
          if (!W || !H) return;
          canvas.width = W;
          canvas.height = H;
          if (reinit) {
            stateRef.current = initState(W, H);
            stateRef.current.lastTime = null;
          } else if (stateRef.current) {
            // Reajuste menor (p. ej. la barra del navegador se oculta): no
            // hace falta regenerar el terreno, solo actualizar el tamaño.
            stateRef.current.W = W;
            stateRef.current.H = H;
          }
        }));
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) { }
      try { screen?.orientation?.unlock(); } catch (_) { }
    };
  }, []);

  const exitFullscreen = async () => {
    // Hay que ESPERAR a que la pantalla completa se cierre DE VERDAD antes
    // de navegar de vuelta al listado. En algunos navegadores móviles la
    // promesa de exitFullscreen() se resuelve antes de que
    // document.fullscreenElement se actualice, así que además de esperar
    // la promesa, comprobamos el estado real (con un límite de tiempo por
    // si nunca llega a soltarse del todo) — si no, React desmonta el juego
    // y muestra la barra de menús mientras el navegador sigue a medio salir
    // de pantalla completa/orientación bloqueada, y la barra se queda mal
    // calculada (oculta) hasta que algo más fuerce un recálculo.
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        const start = Date.now();
        while (document.fullscreenElement && Date.now() - start < 500) {
          await new Promise(r => setTimeout(r, 50));
        }
      }
    } catch (_) { }
    try { screen?.orientation?.unlock?.(); } catch (_) { }
    // Red de seguridad: fuerza un recálculo de layout por si algo se quedó
    // con las medidas viejas.
    window.dispatchEvent(new Event('resize'));
    await new Promise(r => setTimeout(r, 60));
  };

  const handleSalir = async () => { await exitFullscreen(); onSalir?.(); };
  const handleVolver = async () => { await exitFullscreen(); onVolverAlListado?.(); };

  const handleGirar = async () => {
    try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch (_) { }
    try { await screen?.orientation?.lock?.('landscape'); } catch (_) { }
  };

  const petImgRef = useRef(null); // mascota-idle.png precargada

  // Precargar imagen de fondo y mascota
  useEffect(() => {
    const img = new Image();
    img.src = '/juego/Sky_Jump/fondo_nubes.png';
    img.onload = () => { bgImgRef.current = img; };

    const imgPet = new Image();
    imgPet.src = '/juego/mascota-idle.png';
    imgPet.onload = () => { petImgRef.current = imgPet; };
  }, []);

  // Sincronizar récord con servidor al montar
  useEffect(() => {
    (async () => {
      try {
        const records = await ApiService.getRecordsJuego();
        const srv = Number(records?.[JUEGO_ID] || 0);
        const loc = Number(localStorage.getItem(RECORD_KEY) || 0);
        const best = Math.max(srv, loc);
        setRecord(best);
        localStorage.setItem(RECORD_KEY, String(best));
        if (loc > srv) ApiService.guardarRecordJuego(JUEGO_ID, loc);
      } catch (_) { }
    })();
  }, []);

  // ─── Inicializar estado físico ───
  const initState = useCallback((W, H) => {
    const nA = buildPerlin(Math.floor(Math.random() * 9999));
    const nB = buildPerlin(Math.floor(Math.random() * 9999));
    // BUG FIX: canvas.offsetWidth = 0 cuando el canvas está en display:none.
    // Usamos window.innerWidth/Height (el juego es position:fixed inset:0)
    const baseY = H * 0.82;  // terreno en el 82% inferior → solo el 18% inferior visible
    const numPoints = Math.ceil((W * 60) / TERRAIN_STEP);
    const terrainPoints = [];
    for (let i = 0; i < numPoints; i++) {
      const wx = i * TERRAIN_STEP;
      terrainPoints.push({ x: wx, y: terrainY(wx, baseY, nA, nB, 0) });
    }
    const startWX = W * CAM_X_OFFSET;
    const startTY = terrainHeightAt(startWX, terrainPoints);
    return {
      camX: 0, W, H, baseY, nA, nB,
      terrainPoints,
      terrainMaxX: numPoints * TERRAIN_STEP,
      chassis: {
        x: startWX,
        y: startTY - WHEEL_RADIUS - CHASSIS_H,
        vx: 0, vy: 0, angle: 0, omega: 0,
      },
      accel: 0,
      timerMs: TIMER_INIT,
      distPx: 0, distMeters: 0,
      fuels: [],
      nextFuelAtPx: FUEL_INTERVAL,
      gameOver: false,
      causaGameover: '',
      lastTime: null,
    };
  }, []);

  // ─── Extender terreno ───
  function extendTerrain(s) {
    const { chassis, terrainPoints, baseY, nA, nB, distMeters } = s;
    const lookAhead = chassis.x + 2000;
    while (s.terrainMaxX < lookAhead) {
      const wx = s.terrainMaxX;
      terrainPoints.push({ x: wx, y: terrainY(wx, baseY, nA, nB, distMeters) });
      s.terrainMaxX += TERRAIN_STEP;
    }
  }

  // ─── Dibujo ───
  function drawScene(canvas, s) {
    if (!canvas) return;
    const { W, H, camX, chassis, terrainPoints, fuels } = s;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Fondo: imagen fondo_nubes estática adaptada sin distorsión ni cortes
    if (bgImgRef.current) {
      const imgW = bgImgRef.current.naturalWidth || bgImgRef.current.width || 1;
      const imgH = bgImgRef.current.naturalHeight || bgImgRef.current.height || 1;
      const scale = Math.max(W / imgW, H / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const drawX = (W - drawW) / 2;
      const drawY = (H - drawH) / 2;
      ctx.drawImage(bgImgRef.current, drawX, drawY, drawW, drawH);
    } else {
      // Fallback si la imagen no cargó aún
      const skyG = ctx.createLinearGradient(0, 0, 0, H);
      skyG.addColorStop(0, '#87ceeb'); skyG.addColorStop(1, '#c8e6f5');
      ctx.fillStyle = skyG;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.save();
    ctx.translate(-camX, 0);

    // Terreno
    const si = Math.max(0, Math.floor(camX / TERRAIN_STEP) - 2);
    const ei = Math.min(terrainPoints.length - 1, Math.ceil((camX + W) / TERRAIN_STEP) + 2);
    // Relleno de tierra
    ctx.beginPath();
    if (terrainPoints[si]) ctx.moveTo(terrainPoints[si].x, terrainPoints[si].y);
    for (let i = si; i <= ei; i++) { if (terrainPoints[i]) ctx.lineTo(terrainPoints[i].x, terrainPoints[i].y); }
    ctx.lineTo((terrainPoints[ei]?.x ?? W), H + 50);
    ctx.lineTo((terrainPoints[si]?.x ?? 0), H + 50);
    ctx.closePath();
    const dirtG = ctx.createLinearGradient(0, 0, 0, H);
    dirtG.addColorStop(0, '#8B6914'); dirtG.addColorStop(1, '#5D4037');
    ctx.fillStyle = dirtG;
    ctx.fill();

    // Capa de hierba
    ctx.beginPath();
    if (terrainPoints[si]) ctx.moveTo(terrainPoints[si].x, terrainPoints[si].y);
    for (let i = si; i <= ei; i++) { if (terrainPoints[i]) ctx.lineTo(terrainPoints[i].x, terrainPoints[i].y); }
    for (let i = ei; i >= si; i--) { if (terrainPoints[i]) ctx.lineTo(terrainPoints[i].x, terrainPoints[i].y + 10); }
    ctx.closePath();
    ctx.fillStyle = '#4CAF50';
    ctx.fill();

    ctx.beginPath();
    if (terrainPoints[si]) ctx.moveTo(terrainPoints[si].x, terrainPoints[si].y);
    for (let i = si; i <= ei; i++) { if (terrainPoints[i]) ctx.lineTo(terrainPoints[i].x, terrainPoints[i].y); }
    ctx.strokeStyle = '#1B5E20'; ctx.lineWidth = 2.5; ctx.stroke();

    // Coleccionables
    const now = Date.now();
    for (const fuel of fuels) {
      if (fuel.collected) continue;
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
      ctx.save();
      ctx.translate(fuel.x, fuel.y);
      const fg = ctx.createLinearGradient(-12, -18, 12, 18);
      fg.addColorStop(0, '#FF7043'); fg.addColorStop(1, '#BF360C');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.roundRect(-12, -18, 24, 32, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.roundRect(-8, -15, 8, 12, 4); ctx.fill();
      ctx.fillStyle = '#37474F';
      ctx.beginPath(); ctx.roundRect(-6, -22, 12, 6, 3); ctx.fill();
      ctx.fillStyle = '#FFF9C4'; ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+10s', 0, 4);
      ctx.beginPath(); ctx.arc(0, 0, 22 + pulse * 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,160,0,${0.4 * pulse})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }

    // Vehículo (orientado hacia la derecha +X)
    const { x, y, angle } = chassis;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);

    const WHEEL_OY = 8; // Ruedas conectadas directamente al chasis
    const WHEEL_OX = CHASSIS_W - 17; // Ruedas más adentro (no sobresalen por delante/detrás)

    // Chasis (conectado a las ruedas, estilo descapotable con la mascota conduciendo)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8;

    // Mascota Nuvia conduciendo en el asiento del piloto
    if (petImgRef.current) {
      ctx.drawImage(petImgRef.current, -8, -50, 42, 42);
    } else {
      // Fallback cabeza de la mascota
      ctx.fillStyle = '#E91E8C';
      ctx.beginPath(); ctx.arc(10, -30, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(14, -33, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(15, -33, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Cuerpo principal del coche (cubriendo los ejes de las ruedas)
    const bodyG = ctx.createLinearGradient(-CHASSIS_W, -20, CHASSIS_W, 0);
    bodyG.addColorStop(0, '#880E4F'); bodyG.addColorStop(0.5, '#C2185B'); bodyG.addColorStop(1, '#E91E8C');
    ctx.fillStyle = bodyG;
    ctx.beginPath(); ctx.roundRect(-CHASSIS_W + 4, -22, CHASSIS_W * 2 - 8, 24, [10, 10, 6, 6]);
    ctx.fill();

    // Cubiertas / Guardabarros curvados sobre las ruedas
    for (const ox of [-WHEEL_OX, WHEEL_OX]) {
      ctx.fillStyle = '#4A0023';
      ctx.beginPath();
      ctx.arc(ox, -2, WHEEL_RADIUS + 4, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();

      ctx.fillStyle = '#AB47BC';
      ctx.beginPath();
      ctx.arc(ox, -2, WHEEL_RADIUS + 2, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
    }

    // Marco parabrisas deportivo delante de la mascota
    ctx.fillStyle = 'rgba(173,216,230,0.75)';
    ctx.beginPath(); ctx.roundRect(14, -30, 12, 10, [4, 4, 1, 1]); ctx.fill();
    ctx.strokeStyle = '#C2185B'; ctx.lineWidth = 2; ctx.stroke();

    // Faros delanteros (derecha +X)
    ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFF176';
    ctx.beginPath(); ctx.ellipse(CHASSIS_W - 8, -10, 7, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Luz trasera (izquierda -X)
    ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#EF5350';
    ctx.beginPath(); ctx.ellipse(-CHASSIS_W + 6, -10, 5, 4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();

    // Ruedas (dibujadas por DELANTE de la carrocería)
    const wheels = [
      { ox: -WHEEL_OX, oy: WHEEL_OY }, // trasera (izquierda)
      { ox: WHEEL_OX,  oy: WHEEL_OY }, // delantera (derecha)
    ];
    for (const { ox, oy } of wheels) {
      const wx = x + cosA * ox - sinA * oy;
      const wy = y + sinA * ox + cosA * oy;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(0, 0, WHEEL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#1A1A1A'; ctx.fill();
      const rimG = ctx.createRadialGradient(-3, -3, 1, 0, 0, WHEEL_RADIUS * 0.55);
      rimG.addColorStop(0, '#CFD8DC'); rimG.addColorStop(1, '#78909C');
      ctx.beginPath(); ctx.arc(0, 0, WHEEL_RADIUS * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = rimG; ctx.fill();
      ctx.strokeStyle = '#546E7A'; ctx.lineWidth = 2; ctx.shadowBlur = 0;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * WHEEL_RADIUS * 0.5, Math.sin(a) * WHEEL_RADIUS * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore(); // fin translate camX
  }

  // ─── Game Loop ───
  const gameLoop = useCallback((timestamp) => {
    const s = stateRef.current;
    if (!s || pausadoRef.current) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    if (s.lastTime === null) s.lastTime = timestamp;
    const dt = Math.min((timestamp - s.lastTime) / 1000, 0.05);
    s.lastTime = timestamp;

    const { chassis } = s;

    extendTerrain(s);

    const cosA = Math.cos(chassis.angle), sinA = Math.sin(chassis.angle);
    const WHEEL_OX = CHASSIS_W - 17;
    // Rueda delantera (derecha +X)
    const wfx = chassis.x + cosA * WHEEL_OX - sinA * 8;
    const wfy = chassis.y + sinA * WHEEL_OX + cosA * 8;
    // Rueda trasera (izquierda -X)
    const wrx = chassis.x - cosA * WHEEL_OX - sinA * 8;
    const wry = chassis.y - sinA * WHEEL_OX + cosA * 8;

    const groundF = terrainHeightAt(wfx, s.terrainPoints);
    const groundR = terrainHeightAt(wrx, s.terrainPoints);
    
    const penF = (wfy + WHEEL_RADIUS) - groundF;
    const penR = (wry + WHEEL_RADIUS) - groundR;
    const enSueloF = penF >= -6;
    const enSueloR = penR >= -6;
    const enSuelo = enSueloF || enSueloR;

    // Gravedad
    chassis.vy += 750 * dt;

    // Aceleración (Tracción Trasera) y Freno (rebajado un 83% para máxima estabilidad dócil)
    if (s.accel > 0) {
      if (enSueloR || enSuelo) {
        // Aceleración con tracción trasera (83% más dócil y estable)
        chassis.vx += 980 * dt;
        chassis.omega -= 0.8 * dt; // Elevación sutil de morro
      } else {
        chassis.omega -= 1.2 * dt; // Giro muy suave en el aire
      }
    } else if (s.accel < 0) {
      if (enSuelo) {
        chassis.vx -= 550 * dt;
        chassis.omega += 0.6 * dt; // Frenada suave
      } else {
        chassis.omega += 1.2 * dt;
      }
    } else {
      // Sin acelerar ni frenar: el peso del coche lo cae al suelo si se queda apoyado en una sola rueda o en el aire
      const slopeAngle = Math.atan2(groundF - groundR, wfx - wrx);
      if (enSueloR && !enSueloF) {
        chassis.omega += (slopeAngle - chassis.angle) * 8.0 * dt;
      } else if (enSueloF && !enSueloR) {
        chassis.omega += (slopeAngle - chassis.angle) * 8.0 * dt;
      } else if (!enSuelo) {
        chassis.omega += (slopeAngle - chassis.angle) * 3.5 * dt;
      }
    }

    // En suelo se aplica fricción ligera; en el aire la inercia horizontal se conserva
    chassis.vx *= Math.pow(enSuelo ? 0.985 : 0.9995, dt * 60);
    chassis.vx = clamp(chassis.vx, -300, 1000);
    chassis.vy = clamp(chassis.vy, -1000, 1000);

    // Integración de rotación con firme auto-nivelado de pendiente al apoyar ambas ruedas
    if (enSueloF && enSueloR) {
      const slopeAngle = Math.atan2(groundF - groundR, wfx - wrx);
      chassis.angle += (slopeAngle - chassis.angle) * Math.min(1.0, 11.0 * dt);
      chassis.omega *= 0.30;
    }
    chassis.angle += chassis.omega * dt;
    chassis.omega *= Math.pow(0.96, dt * 60);

    // Integración de posición
    chassis.x += chassis.vx * dt;
    chassis.y += chassis.vy * dt;

    // Física de contacto: Apoyo pivotado en rueda trasera para permitir levantar el morro sin freno
    if (enSueloR) {
      const targetY_R = groundR - WHEEL_RADIUS - 8 + Math.sin(chassis.angle) * WHEEL_OX;
      if (chassis.y > targetY_R - 4) {
        chassis.y = targetY_R - 4;
        if (chassis.vy > 0) chassis.vy = 0;
      }
    } else if (enSueloF) {
      const targetY_F = groundF - WHEEL_RADIUS - 8 - Math.sin(chassis.angle) * WHEEL_OX;
      if (chassis.y > targetY_F - 4) {
        chassis.y = targetY_F - 4;
        if (chassis.vy > 0) chassis.vy = 0;
      }
    }

    s.camX = chassis.x - s.W * CAM_X_OFFSET;
    s.distPx = Math.max(s.distPx, chassis.x);
    s.distMeters = s.distPx * METERS_PER_PX;

    if (s.distPx + s.W > s.nextFuelAtPx) {
      const spawnX = s.nextFuelAtPx + Math.random() * 80 - 40;
      const spawnY = terrainHeightAt(spawnX, s.terrainPoints) - WHEEL_RADIUS - 28;
      s.fuels.push({ x: spawnX, y: spawnY, collected: false });
      s.nextFuelAtPx += FUEL_INTERVAL;
    }

    for (const fuel of s.fuels) {
      if (fuel.collected) continue;
      const dx = chassis.x - fuel.x, dy = chassis.y - fuel.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) { fuel.collected = true; s.timerMs += FUEL_BONUS_MS; }
    }
    s.fuels = s.fuels.filter(f => !f.collected && f.x > s.camX - 100);

    s.timerMs -= dt * 1000;
    if (s.timerMs <= 0) { s.timerMs = 0; s.gameOver = true; s.causaGameover = 'tiempo'; }
    if (Math.abs(deg(chassis.angle)) > TILT_KILL_DEG) { s.gameOver = true; s.causaGameover = 'vuelco'; }

    drawScene(canvasRef.current, s);

    if (Math.round(timestamp / 120) !== Math.round((timestamp - dt * 1000) / 120)) {
      setPuntuacion(Math.floor(s.distMeters));
      setTiempoMs(Math.max(0, Math.floor(s.timerMs)));
    }

    if (s.gameOver) {
      cancelAnimationFrame(rafRef.current);
      const metros = Math.floor(s.distMeters);
      setPuntuacion(metros); setTiempoMs(0); setCausaGO(s.causaGameover);
      setFase('gameover');
      const best = Math.max(metros, Number(localStorage.getItem(RECORD_KEY) || 0));
      localStorage.setItem(RECORD_KEY, String(best));
      setRecord(best);
      try { ApiService.guardarRecordJuego(JUEGO_ID, best); } catch (_) { }
      return;
    }
    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // ─── Iniciar ───
  const iniciarJuego = useCallback(async () => {
    // Pedir pantalla completa y bloquear en horizontal: solo funciona aquí,
    // dentro del gesto de pulsar "Jugar" (no al montar el componente).
    await handleGirar();

    // Paso 1: primero setear la fase a 'jugando' para que React haga el canvas visible.
    setPuntuacion(0); setTiempoMs(TIMER_INIT); setCausaGO('');
    setPausado(false);
    pausadoRef.current = false;
    setFase('jugando');
    cancelAnimationFrame(rafRef.current);

    // Paso 2: esperar DOS frames de rAF:
    //   - 1er frame: React commitea el DOM (canvas pasa a display:block)
    //   - 2do frame: el browser ha pintado y offsetWidth/Height son reales
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = canvas.offsetWidth || window.innerWidth;
      const H = canvas.offsetHeight || window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      stateRef.current = initState(W, H);
      stateRef.current.lastTime = null;
      rafRef.current = requestAnimationFrame(gameLoop);
    }));
  }, [initState, gameLoop]);

  const togglePausa = () => {
    setPausado(v => {
      pausadoRef.current = !v;
      if (!v && stateRef.current) stateRef.current.lastTime = null;
      return !v;
    });
  };

  // ─── Controles táctiles ───
  useEffect(() => {
    if (fase !== 'jugando') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = new Set();
    const update = () => {
      if (!stateRef.current) return;
      const W = stateRef.current.W;
      let l = false, r = false;
      for (const x of active) { if (x < W / 2) l = true; else r = true; }
      stateRef.current.accel = r && !l ? 1 : l && !r ? -1 : 0;
    };
    const rect = () => canvas.getBoundingClientRect();
    const onStart = e => { e.preventDefault(); for (const t of e.changedTouches) active.add(t.clientX - rect().left); update(); };
    const onMove = e => { e.preventDefault(); active.clear(); for (const t of e.touches) active.add(t.clientX - rect().left); update(); };
    const onEnd = e => { e.preventDefault(); active.clear(); for (const t of e.touches) active.add(t.clientX - rect().left); update(); };
    const onKey = e => { if (!stateRef.current) return; const k = e.key; if (e.type === 'keydown') { if (k === 'ArrowRight' || k === 'd' || k === 'D') stateRef.current.accel = 1; if (k === 'ArrowLeft' || k === 'a' || k === 'A') stateRef.current.accel = -1; } else stateRef.current.accel = 0; };
    const onDown = e => { if (!stateRef.current) return; const r2 = canvas.getBoundingClientRect(); stateRef.current.accel = e.clientX - r2.left >= stateRef.current.W / 2 ? 1 : -1; };
    const onUp = () => { if (stateRef.current) stateRef.current.accel = 0; };
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [fase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const fmtTime = ms => `${Math.ceil(ms / 1000)}s`;
  const timerColor = tiempoMs > 20000 ? '#4CAF50' : tiempoMs > 10000 ? '#FF9800' : '#F44336';
  const timerPulse = tiempoMs <= 10000;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg,#87ceeb,#c8e6f5)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 100, fontFamily: "'Outfit','Inter',sans-serif" }}>

      {/* Pantalla de inicio */}
      {fase === 'inicio' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #2b0b30 0%, #52185c 50%, #852296 100%)', zIndex: 200, padding: '16px 24px', overflowY: 'auto' }}>
          <svg style={{ position: 'absolute', bottom: 0, width: '100%', opacity: 0.22 }} viewBox="0 0 400 200" preserveAspectRatio="none">
            <path d="M0,150 Q50,80 100,130 Q150,60 200,110 Q250,50 300,100 Q350,70 400,120 L400,200 L0,200Z" fill="#4CAF50" />
            <path d="M0,170 Q60,120 120,150 Q180,100 240,140 Q300,110 360,150 L400,160 L400,200 L0,200Z" fill="#2E7D32" />
          </svg>
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '38px', marginBottom: '2px' }}>🚗</div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.5px', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>Hill Drive</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 12px' }}>¡Conduce por las colinas sin quedarte sin tiempo!</p>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '14px', padding: '10px 14px', marginBottom: '14px', textAlign: 'left', width: '100%' }}>
              {[['👉', 'Mitad derecha', 'Acelerar → avanzar'], ['👈', 'Mitad izquierda', 'Frenar / retroceder'], ['⛽', 'Bidones rojos', 'Recógelos para +10s']].map(([icon, title, sub]) => (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '12px' }}>{title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
            {record > 0 && <div style={{ color: '#FFD700', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>🏆 Récord: {record} m</div>}
            <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
              <button onClick={iniciarJuego} style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)', color: '#fff', border: 'none', borderRadius: '14px', padding: '11px 0', fontSize: '15px', fontWeight: 800, cursor: 'pointer', width: '100%', maxWidth: '200px', boxShadow: '0 8px 32px rgba(233,30,140,0.5)' }}>▶ Jugar</button>
              <button onClick={handleVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '11px 0', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%', maxWidth: '200px' }}>← Volver</button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas del juego */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: (fase === 'jugando' || fase === 'pausa') ? 'block' : 'none', touchAction: 'none', userSelect: 'none', cursor: 'none' }}
      />

      {/* HUD */}
      {(fase === 'jugando' || fase === 'pausa') && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 150, pointerEvents: 'none' }}>
          <button onClick={handleSalir} style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '12px', padding: '8px 12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, pointerEvents: 'auto' }}>
            <ChevronLeft size={16} /> Salir
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', borderRadius: '14px', padding: '6px 18px', color: timerColor, fontWeight: 900, fontSize: '22px', minWidth: '90px', textAlign: 'center', boxShadow: timerPulse ? `0 0 18px ${timerColor}66` : 'none', animation: timerPulse ? 'hd-pulse 0.6s ease-in-out infinite' : 'none' }}>
              ⏱ {fmtTime(tiempoMs)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 700, marginTop: '2px', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{puntuacion} m</div>
          </div>
          <button onClick={togglePausa} style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '12px', padding: '8px 12px', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}>
            {pausado ? <Play size={20} /> : <Pause size={20} />}
          </button>
        </div>
      )}

      {/* Indicadores de zona táctil */}
      {fase === 'jugando' && !pausado && (
        <>
          <div style={{ position: 'absolute', bottom: '28px', left: '18px', color: 'rgba(255,255,255,0.22)', fontSize: '16px', fontWeight: 900, userSelect: 'none', pointerEvents: 'none', textShadow: '0 1px 6px rgba(0,0,0,0.3)', letterSpacing: '1px' }}>◀ FRENAR</div>
          <div style={{ position: 'absolute', bottom: '28px', right: '18px', color: 'rgba(255,255,255,0.22)', fontSize: '16px', fontWeight: 900, userSelect: 'none', pointerEvents: 'none', textShadow: '0 1px 6px rgba(0,0,0,0.3)', letterSpacing: '1px' }}>ACELERAR ▶</div>
        </>
      )}

      {/* Pausa */}
      {pausado && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <h2 style={{ color: 'var(--primary, #E91E8C)', margin: 0, fontSize: '24px', fontWeight: 800 }}>Pausa</h2>
          <p style={{ color: '#64748b', textAlign: 'center', fontSize: '14px', margin: '6px 24px 18px' }}>
            ¡Tómate un respiro!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '220px' }}>
            <button
              onClick={togglePausa}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 24px', background: 'var(--primary, #E91E8C)', color: 'white',
                border: 'none', borderRadius: '999px', fontWeight: 700, fontSize: '15px',
                cursor: 'pointer', boxShadow: '0 6px 16px rgba(233, 30, 140, 0.3)',
              }}
            >
              <Play size={18} fill="white" /> Reanudar
            </button>
            <button
              onClick={handleVolver}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 24px', background: 'white', color: 'var(--primary, #E91E8C)',
                border: '2px solid var(--primary, #E91E8C)', borderRadius: '999px',
                fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              }}
            >
              Volver atrás
            </button>
            <button
              onClick={handleSalir}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 24px', background: 'white', color: 'var(--primary, #E91E8C)',
                border: '2px solid var(--primary, #E91E8C)', borderRadius: '999px',
                fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              }}
            >
              Salir
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {fase === 'gameover' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'linear-gradient(160deg, #2b0b30 0%, #52185c 50%, #852296 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 40px' }}>
          <svg style={{ position: 'absolute', bottom: 0, width: '100%', opacity: 0.18 }} viewBox="0 0 400 200" preserveAspectRatio="none">
            <path d="M0,160 Q80,100 160,140 Q240,90 320,130 Q370,110 400,140 L400,200 L0,200Z" fill="#4CAF50" />
          </svg>
          {/* Tarjeta centrada con ancho máximo */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: '420px', gap: '12px' }}>
            <div style={{ fontSize: '52px', animation: 'hd-drop 0.5s cubic-bezier(.36,1.56,.64,1)' }}>{causaGameover === 'vuelco' ? '💥' : '⛽'}</div>
            <h2 style={{ color: '#fff', fontSize: '26px', fontWeight: 900, margin: 0, textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>{causaGameover === 'vuelco' ? '¡Vuelco!' : '¡Sin combustible!'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>{causaGameover === 'vuelco' ? 'El coche se volcó' : 'Se agotó el tiempo'}</p>

            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '20px', padding: '14px 40px', width: '100%' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Recorrido</div>
              <div style={{ color: '#E91E8C', fontSize: '44px', fontWeight: 900, lineHeight: 1 }}>{puntuacion}<span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}> m</span></div>
              {puntuacion >= record && puntuacion > 0 && <div style={{ color: '#FFD700', fontSize: '13px', fontWeight: 800, marginTop: '4px', animation: 'hd-pulse 0.8s ease-in-out infinite' }}>🏆 ¡Nuevo récord!</div>}
            </div>

            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>🏆 Récord: <strong style={{ color: '#FFD700' }}>{Math.max(record, puntuacion)} m</strong></div>

            <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={iniciarJuego} style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)', color: '#fff', border: 'none', borderRadius: '16px', padding: '13px 32px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 24px rgba(233,30,140,0.4)', flex: '1', minWidth: '130px', maxWidth: '200px' }}>Reintentar</button>
              <button onClick={handleVolver} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: '14px', padding: '13px 24px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flex: '1', minWidth: '130px', maxWidth: '200px' }}>Volver</button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay: girar el teléfono si está en vertical */}
      {isPortrait && fase !== 'inicio' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 500,
          background: 'linear-gradient(160deg, #2b0b30 0%, #52185c 50%, #852296 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '18px',
        }}>
          <div style={{ fontSize: '72px', animation: 'hd-rotate-phone 2.2s ease-in-out infinite' }}>📱</div>
          <p style={{ color: '#fff', fontSize: '20px', fontWeight: 800, textAlign: 'center', margin: 0 }}>
            Gira el teléfono
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', textAlign: 'center', margin: 0, maxWidth: '240px' }}>
            Hill Drive se juega en orientación horizontal
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              onClick={handleGirar}
              style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Girar 🔄
            </button>
            <button
              onClick={handleVolver}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '10px 24px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              ← Volver a juegos
            </button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        @keyframes hd-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.06);opacity:0.8} }
        @keyframes hd-drop  { 0%{transform:translateY(-30px) scale(0.7);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
        @keyframes hd-rotate-phone {
          0%,100% { transform:rotate(0deg) scale(1); }
          30%     { transform:rotate(-90deg) scale(1.1); }
          70%     { transform:rotate(-90deg) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
