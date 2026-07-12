import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { ApiService } from '../api';

const RECORD_KEY = 'nuvia_cliffjump_record';
const JUEGO_ID   = 'cliff_jump';

// Layout
const PLAYER_W   = 50;
const PLAYER_H   = 58;
const PLAYER_X   = 90;   // fixed screen X (center of player)
const GND_OFFSET = 50;   // px from screen bottom to ground surface
const GND_VIS_H  = 85;   // visual depth of terrain
const TURF_H     = 14;   // green turf on top

// Physics (parabolic jump formulas from description)
const H_MAX   = 135;
const T_VUELO = 0.70;
const G       = (8 * H_MAX) / (T_VUELO ** 2);  // ≈ 2204 px/s²
const VY0     = (4 * H_MAX) / T_VUELO;          // ≈ 771 px/s

// Speed
const BASE_SPEED = 180;
const MAX_SPEED  = 380;
const SPEED_STEP = 8;    // per successful gap crossed

// Terrain
const GAP_MIN  = 65;
const GAP_MAX  = 108;   // ≤ BASE_SPEED * T_VUELO = 126 → always clearable
const GND_MIN  = 110;
const GND_MAX  = 220;
const INIT_GND = 380;

const SP = {
  bg:   '/juego/Sky_Jump/fondo_nubes.png',
  idle: '/juego/mascota-idle.png',
  jump: '/juego/mascota-jump.png',
  fall: '/juego/mascota-caida.png',
};

function makeTerrain() {
  const s = [{ type: 'ground', x: 0, w: INIT_GND }];
  let x = INIT_GND;
  for (let i = 0; i < 260; i++) {
    const gw = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
    s.push({ type: 'gap', x, w: gw });
    x += gw;
    const pw = GND_MIN + Math.random() * (GND_MAX - GND_MIN);
    s.push({ type: 'ground', x, w: pw });
    x += pw;
  }
  return s;
}

export default function CliffJumpGame({ onSalir, onVolverAlListado, mostrarColisiones }) {
  const [phase,  setPhase]  = useState('menu');
  const [score,  setScore]  = useState(0);
  const [record, setRecord] = useState(() => +(localStorage.getItem(RECORD_KEY) || 0));

  const phaseRef    = useRef('menu');
  const scoreRef    = useRef(0);
  const cameraXRef  = useRef(0);
  const jumpHRef    = useRef(0);   // height above ground (px)
  const vyRef       = useRef(0);   // vertical velocity (+up)
  const groundedRef = useRef(true);
  const inJumpRef   = useRef(false);
  const wasGapRef   = useRef(false); // passed over a gap during current air phase
  const speedRef    = useRef(BASE_SPEED);
  const lastTRef    = useRef(null);
  const animRef     = useRef(null);
  const segsRef     = useRef([]);
  const areaRef     = useRef(null);
  const canvasRef   = useRef(null);
  const playerRef   = useRef(null);

  const syncPhase = v => { phaseRef.current = v; setPhase(v); };
  const syncScore = v => { scoreRef.current = v; setScore(v); };

  useEffect(() => {
    ApiService.getRecordsJuego().then(recs => {
      const sv   = Number(recs?.[JUEGO_ID] || 0);
      const loc  = Number(localStorage.getItem(RECORD_KEY) || 0);
      const best = Math.max(sv, loc);
      setRecord(best);
      localStorage.setItem(RECORD_KEY, String(best));
      if (loc > sv) ApiService.guardarRecordJuego(JUEGO_ID, loc);
    }).catch(() => {});
  }, []);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const endGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
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

  const drawTerrain = useCallback((W, H) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width  = W;
      canvas.height = H;
    }
    ctx.clearRect(0, 0, W, H);

    const camX    = cameraXRef.current;
    const groundY = H - GND_OFFSET - GND_VIS_H; // top of terrain from canvas top

    for (const seg of segsRef.current) {
      if (seg.type !== 'ground') continue;
      const sx = seg.x - camX;
      if (sx > W + 4 || sx + seg.w < -4) continue;

      // Dirt body
      const grad = ctx.createLinearGradient(0, groundY + TURF_H, 0, H);
      grad.addColorStop(0, '#9b6b3a');
      grad.addColorStop(1, '#6b4020');
      ctx.fillStyle = grad;
      ctx.fillRect(sx, groundY + TURF_H, seg.w, GND_VIS_H - TURF_H + GND_OFFSET);

      // Grass turf
      const grassGrad = ctx.createLinearGradient(0, groundY, 0, groundY + TURF_H);
      grassGrad.addColorStop(0, '#72c242');
      grassGrad.addColorStop(1, '#4a9a28');
      ctx.fillStyle = grassGrad;
      ctx.beginPath();
      ctx.roundRect(sx, groundY, seg.w, TURF_H, [4, 4, 0, 0]);
      ctx.fill();

      // Subtle dirt lines for texture
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fillRect(sx + 10, groundY + TURF_H + 14, seg.w - 20, 1);
      ctx.fillRect(sx + 20, groundY + TURF_H + 28, seg.w - 40, 1);
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

    // Scroll world
    cameraXRef.current += speedRef.current * dt;

    // Player world X (center point)
    const pwx = cameraXRef.current + PLAYER_X;

    // Current segment under player center
    const seg   = segsRef.current.find(s => pwx >= s.x && pwx < s.x + s.w);
    const onGnd = seg?.type === 'ground';

    if (groundedRef.current) {
      if (!onGnd) {
        // Walked into gap — fall
        groundedRef.current = false;
        inJumpRef.current   = false;
        wasGapRef.current   = true;
        vyRef.current       = 0;
      }
    } else {
      // Track if we've passed over a gap during this air phase
      if (!onGnd) wasGapRef.current = true;

      // Physics
      vyRef.current  -= G * dt;
      jumpHRef.current += vyRef.current * dt;

      if (jumpHRef.current <= 0) {
        if (onGnd) {
          // Landed successfully
          jumpHRef.current = 0;
          vyRef.current    = 0;
          groundedRef.current = true;
          if (inJumpRef.current && wasGapRef.current) {
            const ns = scoreRef.current + 1;
            syncScore(ns);
            speedRef.current = Math.min(BASE_SPEED + ns * SPEED_STEP, MAX_SPEED);
          }
          inJumpRef.current = false;
          wasGapRef.current = false;
        } else {
          // Below ground level AND over a gap → game over
          endGame();
          return;
        }
      }
    }

    // Draw terrain via canvas
    drawTerrain(W, H);

    // Update player DOM
    if (playerRef.current) {
      const bot = GND_OFFSET + Math.max(jumpHRef.current, 0);
      playerRef.current.style.bottom = bot + 'px';
      const want = groundedRef.current ? SP.idle : vyRef.current > 0 ? SP.jump : SP.fall;
      if (!playerRef.current.src.endsWith(want)) playerRef.current.src = want;
    }

    animRef.current = requestAnimationFrame(gameLoop);
  }, [drawTerrain, endGame]);

  const doJump = useCallback(() => {
    if (phaseRef.current !== 'playing' || !groundedRef.current) return;
    groundedRef.current = false;
    inJumpRef.current   = true;
    vyRef.current       = VY0;
    jumpHRef.current    = 1; // tiny offset to avoid immediate re-landing check
  }, []);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    segsRef.current = makeTerrain();
    cameraXRef.current  = 0;
    jumpHRef.current    = 0;
    vyRef.current       = 0;
    groundedRef.current = true;
    inJumpRef.current   = false;
    wasGapRef.current   = false;
    speedRef.current    = BASE_SPEED;
    lastTRef.current    = null;
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

  const btn    = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '999px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' };
  const btnSec = { ...btn, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)' };

  const Overlay = ({ children }) => (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      {children}
    </div>
  );

  return (
    <div
      ref={areaRef}
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}
      onPointerDown={e => { e.preventDefault(); doJump(); }}
    >
      {/* Background */}
      <img src={SP.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />

      {/* Terrain canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Player */}
      <img
        ref={playerRef}
        src={SP.idle}
        alt=""
        style={{ position: 'absolute', left: PLAYER_X - PLAYER_W / 2, bottom: GND_OFFSET, width: PLAYER_W, height: PLAYER_H, objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))', pointerEvents: 'none', zIndex: 20 }}
      />

      {mostrarColisiones && (
        <div style={{ position: 'absolute', left: PLAYER_X - PLAYER_W / 2, bottom: GND_OFFSET, width: PLAYER_W, height: PLAYER_H, border: '2px dashed #facc15', background: 'rgba(250,204,21,0.15)', pointerEvents: 'none', zIndex: 50 }} />
      )}

      {/* Score */}
      {phase === 'playing' && (
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.88)', borderRadius: 20, padding: '5px 18px', fontWeight: 800, fontSize: 20, color: 'var(--primary)', zIndex: 30, pointerEvents: 'none' }}>
          {score}
        </div>
      )}

      {/* Pause button */}
      {phase === 'playing' && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={togglePause}
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 30, background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Pause size={18} color="var(--primary)" />
        </button>
      )}

      {/* Menu */}
      {phase === 'menu' && (
        <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Cliff Jump</h2>
          <p style={{ color: '#64748b', textAlign: 'center', fontSize: 14, margin: '8px 24px 18px' }}>
            Toca la pantalla para saltar los precipicios.<br />
            ¡Cuantos más cruces, más rápido va!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 220 }}>
            <button onClick={startGame} style={btn}><Play size={18} fill="white" /> Empezar</button>
            <button onClick={onVolverAlListado} style={btnSec}>Volver atrás</button>
          </div>
          {record > 0 && <p style={{ marginTop: 14, fontSize: 13, color: '#64748b' }}>Récord: <strong style={{ color: 'var(--primary)' }}>{record}</strong></p>}
        </Overlay>
      )}

      {/* Paused */}
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

      {/* Game over */}
      {phase === 'over' && (
        <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>¡Juego terminado!</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '6px 0 4px' }}>
            Saltos: <strong style={{ color: 'var(--primary)', fontSize: 24 }}>{score}</strong>
          </p>
          {score > 0 && score >= record && <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13, margin: '0 0 10px' }}>¡Nuevo récord!</p>}
          {(score === 0 || score < record) && <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 10px' }}>Récord: <strong style={{ color: 'var(--primary)' }}>{record}</strong></p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 220 }}>
            <button onClick={startGame} style={btn}><Play size={18} fill="white" /> Jugar de nuevo</button>
            <button onClick={onVolverAlListado} style={btnSec}>Volver atrás</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
