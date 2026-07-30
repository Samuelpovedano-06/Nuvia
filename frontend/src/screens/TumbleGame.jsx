import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { ApiService } from '../api';

const RECORD_KEY = 'nuvia_tumble_record';
const JUEGO_ID = 'tumble';

// ─────────────────────── Sprites ───────────────────────
const SP = {
  bg: '/juego/Sky_Jump/fondo_nubes.png',
  player: '/juego/mascota-idle.png',
};

// ─────────────────────── Jugador ───────────────────────
const PLAYER_W = 52;
const PLAYER_H = 52;
const MOVE_SPEED = 360;          // px/s lateral
const ROLL_DEG_PER_PX = 0.9;    // giro del sprite por píxel desplazado

const TILT_DEG_TO_PX = 19;
const TILT_DEADZONE = 2;

// ─────────────────────── Física de caída libre ──────────
const GRAVITY = 1000;     // px/s²
const TERMINAL_VY = 750;  // px/s máxima caída

// ──────── Auto-scroll: la pantalla sube sin parar ───────
const BASE_FALL_SPEED = 130;  // px/s velocidad inicial de subida
const MAX_FALL_SPEED = 500;   // px/s velocidad máxima
const SPEED_RAMP = 0.5;       // aumento de px/s por metro recorrido
const PX_PER_METER = 20;      // píxeles por metro (puntuación)
const CRUSH_MARGIN = PLAYER_H; // px por encima de pantalla antes de morir

// ─────────────────── Plataformas ────────────────────────
const ROW_SPACING_START = 160;
const ROW_SPACING_MIN = 100;
const ROW_SPACING_RAMP = 0.012;
const GAP_W_START = PLAYER_W * 1.2;
const GAP_W_MIN = PLAYER_W * 1.1;
const GAP_W_RAMP = 0.01;
const ROW_MARGIN = 10;
const PLATFORM_THICKNESS = 30;

const HAZARD_CHANCE_BASE = 0.18;
const HAZARD_CHANCE_MAX = 0.42;
const HAZARD_RAMP = 0.00005;
const HAZARD_SIZE = 30;
const HAZARD_CLEAR_W = PLAYER_W + 16;

const BUSH_CHANCE = 0.45;
const BG_PARALLAX = 0.5;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Genera una fila de plataforma con un hueco (y a veces un obstáculo dentro del hueco)
function spawnPlatformRow(worldY, W, distance) {
  const gapW = clamp(GAP_W_START - distance * GAP_W_RAMP, GAP_W_MIN, GAP_W_START);
  const gapLeft = ROW_MARGIN + Math.random() * Math.max(0, W - ROW_MARGIN * 2 - gapW);
  const gapRight = gapLeft + gapW;

  let hazard = null;
  const hazardChance = Math.min(HAZARD_CHANCE_MAX, HAZARD_CHANCE_BASE + distance * HAZARD_RAMP);
  if (Math.random() < hazardChance && gapW >= HAZARD_SIZE + HAZARD_CLEAR_W + 6) {
    const shape = Math.random() < 0.5 ? 'boulder' : 'log';
    const safeLeft = Math.random() < 0.5;
    const hx = safeLeft ? gapRight - HAZARD_SIZE / 2 - 3 : gapLeft + HAZARD_SIZE / 2 + 3;
    hazard = { x: hx, shape, size: HAZARD_SIZE, rot: (Math.random() - 0.5) * 0.4 };
  }

  const bushes = [];
  if (gapLeft > 44 && Math.random() < BUSH_CHANCE) {
    bushes.push({ x: 18 + Math.random() * (gapLeft - 36), size: 24 + Math.random() * 10 });
  }
  if (W - gapRight > 44 && Math.random() < BUSH_CHANCE) {
    bushes.push({ x: gapRight + 18 + Math.random() * (W - gapRight - 36), size: 24 + Math.random() * 10 });
  }

  return { worldY, gapLeft, gapRight, hazard, bushes };
}

function drawObstacle(ctx, ob, y) {
  const s = ob.size;
  ctx.save();
  ctx.translate(ob.x, y);
  if (ob.shape === 'boulder') {
    const grad = ctx.createRadialGradient(-s * 0.15, -s * 0.15, s * 0.1, 0, 0, s * 0.6);
    grad.addColorStop(0, '#9ca3af');
    grad.addColorStop(1, '#4b5563');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.52, s * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (ob.shape === 'log') {
    ctx.rotate(ob.rot || 0);
    const w = s * 1.1, h = s * 0.5;
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, '#a0714a');
    grad.addColorStop(1, '#6b4020');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = '#c9a06a';
    ctx.beginPath();
    ctx.ellipse(-w / 2 + h * 0.35, 0, h * 0.32, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w / 2 - h * 0.35, 0, h * 0.32, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // bush
    ctx.fillStyle = '#4a9a28';
    for (const [dx, dy, r] of [[-s * 0.28, s * 0.06, s * 0.32], [s * 0.28, s * 0.06, s * 0.32], [0, -s * 0.18, s * 0.36]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.28, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTurf(ctx, left, right, y) {
  if (right <= left) return;
  const grad = ctx.createLinearGradient(0, y + 3, 0, y + PLATFORM_THICKNESS);
  grad.addColorStop(0, '#a0714a');
  grad.addColorStop(0.3, '#8c5e35');
  grad.addColorStop(1, '#6b4020');
  ctx.fillStyle = grad;
  ctx.fillRect(left, y + 3, right - left, PLATFORM_THICKNESS - 3);

  const grassGrad = ctx.createLinearGradient(0, y - 6, 0, y + 3);
  grassGrad.addColorStop(0, '#82d44e');
  grassGrad.addColorStop(0.5, '#5db832');
  grassGrad.addColorStop(1, '#3d9020');
  ctx.fillStyle = grassGrad;
  ctx.beginPath();
  ctx.roundRect(left, y - 6, right - left, 9, [4, 4, 0, 0]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(left + 2, y - 5, Math.max(0, right - left - 4), 2.5);
}

export default function TumbleGame({ onSalir, onVolverAlListado, mostrarColisiones, globalSensPct }) {
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [record, setRecord] = useState(() => +(localStorage.getItem(RECORD_KEY) || 0));
  const [deathReason, setDeathReason] = useState('critical');

  const phaseRef = useRef('menu');
  const scoreRef = useRef(0);

  // ── Auto-scroll: worldY del borde superior de la pantalla ──
  // screenY de cualquier objeto = objeto.worldY - scrollRef
  const scrollRef = useRef(0);

  // ── Jugador ─────────────────────────────────────────────────
  const playerXRef = useRef(180);
  const playerWorldYRef = useRef(0);  // Y del centro en mundo (↓ = positivo)
  const playerVYRef = useRef(0);       // velocidad vertical (↓ = positivo)
  const onGroundRef = useRef(false);
  const currentPlatformRef = useRef(null);
  const lateralOffsetRef = useRef(0); // desplazamiento lateral acumulado (con signo → giro)
  const rollAngleRef = useRef(0);

  const moveDirRef = useRef(0);
  const tiltRef = useRef(0);
  const sensFactorRef = useRef(1);
  const rowsRef = useRef([]);
  const nextRowWorldYRef = useRef(0);
  const lastTRef = useRef(null);
  const animRef = useRef(null);
  const showHitboxRef = useRef(mostrarColisiones);
  const bgRatioRef = useRef(1);

  const areaRef = useRef(null);
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const hitboxRef = useRef(null);
  const bgRef = useRef(null);

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
  useEffect(() => { showHitboxRef.current = mostrarColisiones; }, [mostrarColisiones]);
  useEffect(() => {
    sensFactorRef.current = Math.max(0.1, Math.min(2.0, (globalSensPct ?? 50) / 50));
  }, [globalSensPct]);

  useEffect(() => {
    const handle = e => { tiltRef.current = e.gamma || 0; };
    window.addEventListener('deviceorientation', handle);
    return () => window.removeEventListener('deviceorientation', handle);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { bgRatioRef.current = (img.naturalHeight / img.naturalWidth) || 1; };
    img.src = SP.bg;
  }, []);

  const endGame = useCallback(reason => {
    cancelAnimationFrame(animRef.current);
    setDeathReason(reason);
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

  // ── Dibuja la escena usando el scroll actual como "cámara" ──
  const drawScene = useCallback((W, H, scroll) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.clearRect(0, 0, W, H);

    for (const row of rowsRef.current) {
      const screenY = row.worldY - scroll;
      if (screenY < -60 || screenY > H + 60) continue;

      drawTurf(ctx, 0, row.gapLeft, screenY);
      drawTurf(ctx, row.gapRight, W, screenY);
      for (const b of row.bushes) drawObstacle(ctx, { x: b.x, size: b.size, shape: 'bush' }, screenY - 4);
      if (row.hazard) drawObstacle(ctx, row.hazard, screenY);

      if (showHitboxRef.current) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(row.gapLeft, screenY - PLATFORM_THICKNESS * 0.7, row.gapRight - row.gapLeft, PLATFORM_THICKNESS * 1.4);
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

    // ── Auto-scroll: la pantalla sube continuamente ─────────
    const meters = scrollRef.current / PX_PER_METER;
    const scrollSpeed = Math.min(MAX_FALL_SPEED, BASE_FALL_SPEED + meters * SPEED_RAMP);
    scrollRef.current += scrollSpeed * dt;

    // ── Movimiento lateral con WRAP-AROUND ───────────────────
    let lateralSpeed = moveDirRef.current * MOVE_SPEED;
    if (moveDirRef.current === 0 && Math.abs(tiltRef.current) > TILT_DEADZONE) {
      lateralSpeed = clamp(tiltRef.current * TILT_DEG_TO_PX * sensFactorRef.current, -MOVE_SPEED, MOVE_SPEED);
    }
    const dx = lateralSpeed * dt;
    let newX = playerXRef.current + dx;
    // Sale por la izquierda → entra por la derecha, y viceversa
    if (newX < PLAYER_W / 2) newX += W - PLAYER_W;
    if (newX > W - PLAYER_W / 2) newX -= W - PLAYER_W;
    playerXRef.current = newX;

    // Giro basado en desplazamiento lateral acumulado (con signo)
    // → derecha gira hacia adelante, izquierda hacia atrás; continúa al caer si hay input
    lateralOffsetRef.current += dx;
    rollAngleRef.current = (lateralOffsetRef.current * ROLL_DEG_PER_PX) % 360;

    const playerLeft = playerXRef.current - PLAYER_W / 2 * 0.75;
    const playerRight = playerXRef.current + PLAYER_W / 2 * 0.75;

    // ── Física ───────────────────────────────────────────────
    if (onGroundRef.current) {
      // El jugador está parado sobre una plataforma.
      // La plataforma es fija en mundo; la pantalla sube → el jugador SUBE en pantalla.
      const plat = currentPlatformRef.current;
      if (plat) {
        // ¿El jugador está sobre el hueco? → cae
        const overGap = playerLeft >= plat.gapLeft && playerRight <= plat.gapRight;
        if (overGap) {
          onGroundRef.current = false;
          playerVYRef.current = 0;
          currentPlatformRef.current = null;
        }
      }
    } else {
      // En el aire: aplica gravedad
      const prevWorldY = playerWorldYRef.current;
      playerVYRef.current = Math.min(playerVYRef.current + GRAVITY * dt, TERMINAL_VY);
      playerWorldYRef.current += playerVYRef.current * dt;

      const prevBottom = prevWorldY + PLAYER_H / 2;
      const currBottom = playerWorldYRef.current + PLAYER_H / 2;

      // Detección de cruce de plataforma: frame-accurate
      for (const row of rowsRef.current) {
        if (playerVYRef.current <= 0) break;                          // solo si cae hacia abajo
        if (prevBottom > row.worldY + PLATFORM_THICKNESS) continue;   // ya estaba debajo
        if (currBottom < row.worldY) continue;                        // aún no llega

        const overGap = playerLeft >= row.gapLeft && playerRight <= row.gapRight;
        if (overGap) {
          // Pasa por el hueco: comprueba obstáculo
          if (row.hazard) {
            const h = row.hazard;
            const xPad = PLAYER_W / 2 * 0.55;
            if (playerRight > h.x - h.size / 2 - xPad && playerLeft < h.x + h.size / 2 + xPad) {
              endGame('critical'); return;
            }
          }
          // Continúa cayendo sin interrumpir
        } else {
          // Aterrizaje sobre la parte sólida
          onGroundRef.current = true;
          playerVYRef.current = 0;
          playerWorldYRef.current = row.worldY - PLAYER_H / 2;
          currentPlatformRef.current = row;
        }
        break; // una sola plataforma por frame
      }
    }

    // ── Muerte: la pantalla alcanza al jugador ───────────────
    // screenY = worldY - scroll  →  negativo = por encima de pantalla
    const playerScreenY = playerWorldYRef.current - scrollRef.current;
    if (playerScreenY < -CRUSH_MARGIN) {
      endGame('crushed'); return;
    }

    // ── Genera nuevas plataformas por debajo ─────────────────
    while (nextRowWorldYRef.current <= scrollRef.current + H + 40) {
      rowsRef.current.push(spawnPlatformRow(nextRowWorldYRef.current, W, scrollRef.current));
      const spacing = Math.max(ROW_SPACING_MIN, ROW_SPACING_START - scrollRef.current * ROW_SPACING_RAMP);
      nextRowWorldYRef.current += spacing;
    }

    // ── Puntuación: metros ───────────────────────────────────
    const newScore = Math.floor(scrollRef.current / PX_PER_METER);
    if (newScore !== scoreRef.current) syncScore(newScore);

    // ── Dibuja ───────────────────────────────────────────────
    drawScene(W, H, scrollRef.current);

    // ── Actualiza sprite del jugador ─────────────────────────
    if (playerRef.current) {
      playerRef.current.style.left = playerXRef.current + 'px';
      playerRef.current.style.top = playerScreenY + 'px';
      playerRef.current.style.transform = `translate(-50%, -50%) rotate(${rollAngleRef.current}deg)`;
    }
    if (hitboxRef.current) {
      hitboxRef.current.style.left = playerXRef.current + 'px';
      hitboxRef.current.style.top = playerScreenY + 'px';
    }
    if (bgRef.current) {
      const tileH = W * bgRatioRef.current;
      const off = tileH > 0 ? (scrollRef.current * BG_PARALLAX) % tileH : 0;
      bgRef.current.style.backgroundPositionY = `${-off}px`;
    }

    // ── Limpia plataformas que ya subieron muy por encima ────
    rowsRef.current = rowsRef.current.filter(
      row => row === currentPlatformRef.current || row.worldY > scrollRef.current - 120
    );

    animRef.current = requestAnimationFrame(gameLoop);
  }, [drawScene, endGame]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    const area = areaRef.current;
    const W = area?.clientWidth || 360;
    const H = area?.clientHeight || 600;

    scrollRef.current = 0;

    // Primera plataforma: en el cuarto superior de la pantalla
    // worldY = screenY (porque scroll = 0 al inicio)
    const firstPlatWorldY = H * 0.28;
    const firstPlat = spawnPlatformRow(firstPlatWorldY, W, 0);
    rowsRef.current = [firstPlat];
    currentPlatformRef.current = firstPlat;

    // Coloca al jugador en la sección sólida izquierda de la primera plataforma
    playerXRef.current = Math.max(PLAYER_W / 2 + 12, firstPlat.gapLeft / 2);
    playerWorldYRef.current = firstPlatWorldY - PLAYER_H / 2;
    playerVYRef.current = 0;
    onGroundRef.current = true;

    lateralOffsetRef.current = 0;
    rollAngleRef.current = 0;

    nextRowWorldYRef.current = firstPlatWorldY + ROW_SPACING_START;
    lastTRef.current = null;
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

  return (
    <div
      ref={areaRef}
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', userSelect: 'none', touchAction: 'none', background: '#a7e1f4' }}
      onPointerDown={e => {
        e.preventDefault();
        if (phaseRef.current !== 'playing' || !areaRef.current) return;
        const rect = areaRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        moveDirRef.current = relX < rect.width / 2 ? -1 : 1;
      }}
      onPointerUp={() => { moveDirRef.current = 0; }}
      onPointerLeave={() => { moveDirRef.current = 0; }}
      onPointerCancel={() => { moveDirRef.current = 0; }}
    >
      {/* Fondo de nubes con scroll */}
      <div ref={bgRef} style={{ position: 'absolute', inset: 0, backgroundImage: `url('${SP.bg}')`, backgroundRepeat: 'repeat-y', backgroundSize: '100% auto', pointerEvents: 'none' }} />

      {/* Canvas: plataformas + obstáculos */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Jugador */}
      <div
        ref={playerRef}
        style={{
          position: 'absolute',
          left: playerXRef.current,
          top: playerWorldYRef.current - scrollRef.current,
          width: PLAYER_W, height: PLAYER_H,
          backgroundImage: `url('${SP.player}')`, backgroundSize: 'contain',
          backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))',
          pointerEvents: 'none', zIndex: 20,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {mostrarColisiones && (
        <div ref={hitboxRef} style={{ position: 'absolute', left: playerXRef.current, top: playerWorldYRef.current - scrollRef.current, width: PLAYER_W, height: PLAYER_H, transform: 'translate(-50%, -50%)', border: '2px dashed #facc15', background: 'rgba(250,204,21,0.15)', pointerEvents: 'none', zIndex: 50 }} />
      )}

      {/* Puntuación */}
      {phase === 'playing' && (
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.88)', borderRadius: 20, padding: '5px 18px', fontWeight: 800, fontSize: 20, color: 'var(--primary)', zIndex: 30, pointerEvents: 'none' }}>
          {score} m
        </div>
      )}

      {/* Botón pausa */}
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
        <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Tumble</h2>
          <p style={{ color: '#64748b', textAlign: 'center', fontSize: 14, margin: '8px 24px 18px' }}>
            Rueda por las plataformas tocando izquierda o derecha.<br />
            Cuando estés sobre el hueco, ¡caerás a la siguiente!<br />
            La pantalla sube sin parar — ¡no dejes que te pille!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 220 }}>
            <button onClick={startGame} style={btn}><Play size={18} fill="white" /> Empezar</button>
            <button onClick={onVolverAlListado} style={btnSec}>Volver atrás</button>
          </div>
          {record > 0 && <p style={{ marginTop: 14, fontSize: 13, color: '#64748b' }}>Récord: <strong style={{ color: 'var(--primary)' }}>{record} m</strong></p>}
        </Overlay>
      )}

      {/* Pausa */}
      {phase === 'paused' && (
        <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Pausa</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '6px 0 14px' }}>¡Tómate un respiro!</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 220 }}>
            <button onClick={togglePause} style={btn}><Play size={18} fill="white" /> Reanudar</button>
            <button onClick={onVolverAlListado} style={btnSec}>Volver atrás</button>
          </div>
        </Overlay>
      )}

      {/* Fin de juego */}
      {phase === 'over' && (
        <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>
            {deathReason === 'crushed' ? '¡Te ha pillado la pantalla!' : '¡Has chocado!'}
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '6px 0 4px' }}>
            Distancia: <strong style={{ color: 'var(--primary)', fontSize: 24 }}>{score} m</strong>
          </p>
          {score > 0 && score >= record && <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13, margin: '0 0 10px' }}>¡Nuevo récord!</p>}
          {(score === 0 || score < record) && <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 10px' }}>Récord: <strong style={{ color: 'var(--primary)' }}>{record} m</strong></p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 220 }}>
            <button onClick={startGame} style={btn}><Play size={18} fill="white" /> Jugar de nuevo</button>
            <button onClick={onVolverAlListado} style={btnSec}>Volver atrás</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
