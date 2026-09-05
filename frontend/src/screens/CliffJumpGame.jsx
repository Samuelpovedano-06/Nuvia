import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Trophy } from 'lucide-react';
import { ApiService } from '../api';
import { sumarMoneda, CoinIcon } from '../utils/coinHelper';
import AccesorioOverlay from '../components/AccesorioOverlay';
import { getWalkSheet } from '../utils/walkSheet';
import { getOutfitSprite } from '../utils/outfitSprites';
import RankingModal from '../components/RankingModal';

const RECORD_KEY = 'nuvia_cliffjump_record';
const JUEGO_ID = 'cliff_jump';

// Layout
const PLAYER_W = 50;
const PLAYER_H = 58;
const PLAYER_X = 90;    // fixed screen X (center of player)
const GND_OFFSET = 165;  // px from screen bottom to ground surface (turf top)
const GND_VIS_H = 85;   // visual depth of terrain (unused in canvas draw, kept for reference)
const TURF_H = 14;   // green turf on top
const SPRITE_FOOT_OFFSET = 8;   // transparent px at bottom of mascot sprite

// Physics
const H_MAX = 70;
const T_VUELO = 0.62;
const G = (8 * H_MAX) / (T_VUELO ** 2);   // ≈ 2196 px/s² (normal gravity)
const G_HOLD = 1000;                              // lighter gravity while button held & rising
const VY0 = (4 * H_MAX) / T_VUELO;           // ≈ 677 px/s

// Speed
const BASE_SPEED = 180;
const MAX_SPEED = 580;
const SPEED_STEP = 8;    // per successful gap crossed

// Terrain
const GAP_MIN = 110;
const GAP_MAX = 290;
const GND_MIN = 90;
const GND_MAX = 380;
const INIT_GND = 380;

// Obstacles (compresas apiladas)
const OBS_W = 38;   // ancho del obstáculo
const COMP_H = 34;   // alto de la compresa
const OBS_H = COMP_H; // una sola compresa

const SP = {
  bg: '/juego/Sky_Jump/fondo_nubes.png',
  jump: '/juego/movimiento-mascota/satando/mascota-jump.png',
  fall: '/juego/movimiento-mascota/caida/mascota-caida.png',
};

// Sprite sheet de correr (mismo que la pantalla principal)
const WALK_COLS = 6;
const WALK_CELL = 70;   // px por celda en la sheet original
const WALK_INTERVAL = 60;   // ms por frame (más rápido que el paseo normal de 130 ms)

function makeTerrain() {
  const segs = [{ type: 'ground', x: 0, w: INIT_GND }];
  const obs = [];
  const coins = [];
  let x = INIT_GND;
  for (let i = 0; i < 260; i++) {
    const progress = Math.max(0, Math.min(1, (i - 50) / 100));
    const gapFloor = GAP_MIN + (GAP_MAX - GAP_MIN) * progress * 0.85;
    const gw = gapFloor + Math.random() * (GAP_MAX - gapFloor);
    segs.push({ type: 'gap', x, w: gw });
    x += gw;
    const pw = GND_MIN + Math.random() * (GND_MAX - GND_MIN);
    segs.push({ type: 'ground', x, w: pw });
    // Obstacle: from gap #5, 70% chance, only on platforms wide enough
    if (i >= 5 && pw >= GND_MAX * 0.7 && Math.random() < 0.7) {
      // Center the obstacle on the platform
      obs.push({ x: x + pw / 2 - OBS_W / 2 });
    } else if (i >= 2 && Math.random() < 0.12) {
      // Moneda poco común (12% probabilidad, valor 1)
      coins.push({ x: x + pw / 2, yOffset: 35 + Math.random() * 25, collected: false });
    }
    x += pw;
  }
  return { segs, obs, coins };
}

export default function CliffJumpGame({ onSalir, onVolverAlListado, mostrarColisiones }) {
  const [phase, setPhase] = useState('menu');
  const [showRanking, setShowRanking] = useState(false);
  const [score, setScore] = useState(0);
  const [monedasPartida, setMonedasPartida] = useState(0);
  const [record, setRecord] = useState(() => +(localStorage.getItem(RECORD_KEY) || 0));

  const phaseRef = useRef('menu');
  const scoreRef = useRef(0);
  const cameraXRef = useRef(0);
  const jumpHRef = useRef(0);   // height above ground (px)
  const vyRef = useRef(0);   // vertical velocity (+up)
  const groundedRef = useRef(true);
  const inJumpRef = useRef(false);
  const wasGapRef = useRef(false); // passed over a gap during current air phase
  const jumpsLeftRef = useRef(2);     // double jump counter
  const holdingRef = useRef(false); // button held → lighter gravity while rising
  const speedRef = useRef(BASE_SPEED);
  const lastTRef = useRef(null);
  const animRef = useRef(null);
  const segsRef = useRef([]);
  const obsRef = useRef([]);
  const coinsRef = useRef([]);
  const compImgRef = useRef(null);
  const logoImgRef = useRef(null);
  const showHitboxRef = useRef(mostrarColisiones);
  const areaRef = useRef(null);
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const hitboxRef = useRef(null);
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

  useEffect(() => { showHitboxRef.current = mostrarColisiones; }, [mostrarColisiones]);

  useEffect(() => {
    const img = new Image();
    img.src = '/juego/compresa.png';
    compImgRef.current = img;

    const logoImg = new Image();
    logoImg.src = '/logo.png';
    logoImgRef.current = logoImg;
  }, []);

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
      canvas.width = W;
      canvas.height = H;
    }
    ctx.clearRect(0, 0, W, H);

    const camX = cameraXRef.current;
    // groundY = top of turf surface from canvas top = where the player stands
    const groundY = H - GND_OFFSET;

    // Death line drawn FIRST so terrain blocks cover it where there's ground
    if (showHitboxRef.current) {
      ctx.save();
      ctx.setLineDash([10, 7]);
      ctx.strokeStyle = 'rgba(220,40,40,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 50);
      ctx.lineTo(W, groundY + 50);
      ctx.stroke();
      ctx.restore();
    }

    for (const seg of segsRef.current) {
      if (seg.type !== 'ground') continue;
      const sx = seg.x - camX;
      if (sx > W + 4 || sx + seg.w < -4) continue;

      // Dirt body
      const dirtH = H - groundY - TURF_H;
      const grad = ctx.createLinearGradient(0, groundY + TURF_H, 0, groundY + TURF_H + dirtH);
      grad.addColorStop(0, '#a0714a');
      grad.addColorStop(0.3, '#8c5e35');
      grad.addColorStop(1, '#6b4020');
      ctx.fillStyle = grad;
      ctx.fillRect(sx, groundY + TURF_H, seg.w, dirtH);

      // Side shadow on left edge for 3-D look
      const shadow = ctx.createLinearGradient(sx, 0, sx + Math.min(8, seg.w), 0);
      shadow.addColorStop(0, 'rgba(0,0,0,0.18)');
      shadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadow;
      ctx.fillRect(sx, groundY + TURF_H, Math.min(8, seg.w), dirtH);

      // Grass turf
      const grassGrad = ctx.createLinearGradient(0, groundY, 0, groundY + TURF_H);
      grassGrad.addColorStop(0, '#82d44e');
      grassGrad.addColorStop(0.5, '#5db832');
      grassGrad.addColorStop(1, '#3d9020');
      ctx.fillStyle = grassGrad;
      ctx.beginPath();
      ctx.roundRect(sx, groundY, seg.w, TURF_H, [4, 4, 0, 0]);
      ctx.fill();

      // Thin highlight on top of grass
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(sx + 2, groundY + 1, seg.w - 4, 3);
    }

    // Draw obstacles (two compresas stacked)
    const img = compImgRef.current;
    for (const ob of obsRef.current) {
      const ox = ob.x - camX;
      if (ox > W + 10 || ox + OBS_W < -10) continue;
      const obsTop = groundY - OBS_H;
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, ox, obsTop, OBS_W, COMP_H);
      } else {
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(ox, obsTop, OBS_W, OBS_H);
      }

      // Hitbox del obstáculo (solo en modo colisiones)
      if (showHitboxRef.current) {
        const hx = ox + 4;
        const hw = OBS_W - 8;
        const hy = groundY - (OBS_H - 8);
        const hh = OBS_H - 8;
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(250,204,21,0.18)';
        ctx.fillRect(hx, hy, hw, hh);
        ctx.strokeRect(hx, hy, hw, hh);
        ctx.restore();
      }
    }
    // Draw coins
    if (coinsRef.current) {
      const logoImg = logoImgRef.current;
      for (const coin of coinsRef.current) {
        if (coin.collected) continue;
        const cx = coin.x - camX;
        if (cx < -20 || cx > W + 20) continue;
        const cy = groundY - coin.yOffset;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
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
          ctx.drawImage(logoImg, cx - 9, cy - 9, 18, 18);
        }
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

    // Scroll world
    cameraXRef.current += speedRef.current * dt;

    // Check coin collection
    const pwx = cameraXRef.current + PLAYER_X;
    const playerY = jumpHRef.current;
    if (coinsRef.current) {
      for (const coin of coinsRef.current) {
        if (!coin.collected && Math.abs(pwx - coin.x) < 28 && Math.abs(playerY - (coin.yOffset - 10)) < 35) {
          coin.collected = true;
          sumarMoneda(1);
          setMonedasPartida(m => m + 1);
        }
      }
    }

    // Current segment under player center
    const seg = segsRef.current.find(s => pwx >= s.x && pwx < s.x + s.w);
    const onGnd = seg?.type === 'ground';

    if (groundedRef.current) {
      if (!onGnd) {
        // Walked into gap — fall (allow 1 emergency jump)
        groundedRef.current = false;
        inJumpRef.current = false;
        wasGapRef.current = true;
        vyRef.current = 0;
        // jumpsLeftRef stays at 2 — falling off a platform doesn't consume jumps
      }
    } else {
      // Track if we've passed over a gap during this air phase
      if (!onGnd) wasGapRef.current = true;

      // Variable gravity: lighter while holding AND still rising
      const grav = (holdingRef.current && vyRef.current > 0) ? G_HOLD : G;
      vyRef.current -= grav * dt;
      jumpHRef.current += vyRef.current * dt;

      if (jumpHRef.current <= 0 && onGnd) {
        // Landed successfully
        jumpHRef.current = 0;
        vyRef.current = 0;
        groundedRef.current = true;
        jumpsLeftRef.current = 2;
        if (inJumpRef.current && wasGapRef.current) {
          const ns = scoreRef.current + 1;
          syncScore(ns);
          speedRef.current = Math.min(BASE_SPEED + ns * SPEED_STEP, MAX_SPEED);
        }
        inJumpRef.current = false;
        wasGapRef.current = false;
      } else if (jumpHRef.current <= -50) {
        // Fallen 50 px below ground surface → game over (matches death line)
        endGame();
        return;
      }
    }

    // Obstacle collision — front hit kills, landing on top (jumpH ≥ OBS_H - 8) es seguro
    const playerLeft = PLAYER_X - PLAYER_W / 2 + 6;
    const playerRight = PLAYER_X + PLAYER_W / 2 - 6;
    for (const ob of obsRef.current) {
      const ox = ob.x - cameraXRef.current;
      if (playerRight > ox + 4 && playerLeft < ox + OBS_W - 4 && jumpHRef.current < OBS_H - 8) {
        endGame();
        return;
      }
    }

    // Draw terrain via canvas
    drawTerrain(W, H);

    // Update player DOM
    // Subtract SPRITE_FOOT_OFFSET so the visible feet land exactly on the turf surface
    const playerBot = GND_OFFSET - SPRITE_FOOT_OFFSET + jumpHRef.current;
    if (playerRef.current) {
      playerRef.current.style.bottom = playerBot + 'px';
      if (groundedRef.current) {
        const now = performance.now();
        if (now - lastWalkTRef.current >= WALK_INTERVAL) {
          walkFrameRef.current = (walkFrameRef.current + 1) % WALK_COLS;
          lastWalkTRef.current = now;
        }
        const fx = walkFrameRef.current * PLAYER_W;
        playerRef.current.style.backgroundImage = `url('${getWalkSheet()}')`;
        playerRef.current.style.backgroundSize = `${WALK_COLS * PLAYER_W}px ${2 * PLAYER_H}px`;
        playerRef.current.style.backgroundPosition = `-${fx}px 0px`;
      } else {
        const src = vyRef.current > 0 ? getOutfitSprite('jump', SP.jump) : getOutfitSprite('caida', SP.fall);
        playerRef.current.style.backgroundImage = `url('${src}')`;
        playerRef.current.style.backgroundSize = 'contain';
        playerRef.current.style.backgroundPosition = 'center';
      }
    }
    if (hitboxRef.current) {
      hitboxRef.current.style.bottom = playerBot + 'px';
    }

    animRef.current = requestAnimationFrame(gameLoop);
  }, [drawTerrain, endGame]);

  const doJump = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    if (jumpsLeftRef.current <= 0) return;
    jumpsLeftRef.current--;
    groundedRef.current = false;
    inJumpRef.current = true;
    vyRef.current = VY0;
    jumpHRef.current = Math.max(jumpHRef.current, 1); // keep height on double jump
    holdingRef.current = true;
  }, []);

  const stopHold = useCallback(() => {
    holdingRef.current = false;
  }, []);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    const { segs, obs, coins } = makeTerrain();
    segsRef.current = segs;
    obsRef.current = obs;
    coinsRef.current = coins;
    cameraXRef.current = 0;
    jumpHRef.current = 0;
    vyRef.current = 0;
    groundedRef.current = true;
    inJumpRef.current = false;
    wasGapRef.current = false;
    jumpsLeftRef.current = 2;
    holdingRef.current = false;
    speedRef.current = BASE_SPEED;
    lastTRef.current = null;
    syncScore(0);
    setMonedasPartida(0);
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
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}
      onPointerDown={e => { e.preventDefault(); doJump(); }}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
    >
      {/* Background */}
      <img src={SP.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />

      {/* Terrain canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Player */}
      <div
        ref={playerRef}
        style={{
          position: 'absolute', left: PLAYER_X - PLAYER_W / 2, bottom: GND_OFFSET - SPRITE_FOOT_OFFSET,
          width: PLAYER_W, height: PLAYER_H,
          backgroundImage: `url('${SP.jump}')`, backgroundSize: 'contain',
          backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))', pointerEvents: 'none', zIndex: 20,
        }}
      >
        <AccesorioOverlay size={20} />
      </div>

      {mostrarColisiones && (
        <div ref={hitboxRef} style={{ position: 'absolute', left: PLAYER_X - PLAYER_W / 2, bottom: GND_OFFSET - SPRITE_FOOT_OFFSET, width: PLAYER_W, height: PLAYER_H, border: '2px dashed #facc15', background: 'rgba(250,204,21,0.15)', pointerEvents: 'none', zIndex: 50 }} />
      )}

      {/* Score */}
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
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #2b0b30 0%, #52185c 50%, #852296 100%)', zIndex: 200, padding: '16px 24px', overflowY: 'auto' }}>
          <svg style={{ position: 'absolute', bottom: 0, width: '100%', opacity: 0.22 }} viewBox="0 0 400 200" preserveAspectRatio="none">
            <path d="M0,150 Q50,80 100,130 Q150,60 200,110 Q250,50 300,100 Q350,70 400,120 L400,200 L0,200Z" fill="#5b8fd4" />
            <path d="M0,170 Q60,120 120,150 Q180,100 240,140 Q300,110 360,150 L400,160 L400,200 L0,200Z" fill="#3b72b8" />
          </svg>
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '38px', marginBottom: '2px' }}>⛰️</div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.5px', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>Cliff Jump</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 12px' }}>¡Toca la pantalla para saltar los precipicios!</p>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '14px', padding: '10px 14px', marginBottom: '14px', textAlign: 'left', width: '100%' }}>
              {[
                ['👆', 'Toca la pantalla', 'Para realizar un salto'],
                ['✌️', 'Doble salto', 'Toca de nuevo en el aire para saltar más lejos'],
                ['⚡', 'Velocidad', 'Cuantos más precipicios cruces, ¡más rápido va!']
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
              <button onClick={onVolverAlListado} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '11px 0', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%', maxWidth: '200px' }}>← Volver</button>
            </div>
            <button onClick={() => setShowRanking(true)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '9px 0', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: '10px', width: '100%', maxWidth: '200px' }}>
              <Trophy size={14} /> Ver ranking
            </button>
          </div>
        </div>
      )}
      {showRanking && <RankingModal juego={JUEGO_ID} nombreJuego="Cliff Jump" onClose={() => setShowRanking(false)} />}

      {/* Paused */}
      {phase === 'paused' && (
        <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Pausa</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '6px 0 14px' }}>¡Tómate un respiro!</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 220 }}>
            <button onClick={togglePause} style={btn}><Play size={18} fill="white" /> Reanudar</button>
            <button onClick={onVolverAlListado} style={btnSec}>Volver atrás</button>
            <button onClick={onSalir} style={btnSec}>Salir</button>
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
