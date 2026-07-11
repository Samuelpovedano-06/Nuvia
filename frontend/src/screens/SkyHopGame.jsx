import React, { useState, useEffect, useRef, useCallback } from 'react';

const RECORD_KEY  = 'nuvia_skyhop_record';
const TIMER_MAX   = 60000;  // ms
const STAR_BONUS  = 8000;   // ms
const JUMP_MS     = 340;
const ROW_H       = 115;    // px between rows
const ARC_H       = 72;     // px arc peak
const LEFT_PCT    = 0.30;   // platform center X as fraction of container width
const RIGHT_PCT   = 0.70;
const BASE_Y_PCT  = 0.74;   // current row Y as fraction of container height (from top)
const PLAT_W      = 110;
const PLAT_H      = 34;
const CLOUD_W     = 140;
const CLOUD_H     = 44;
const PL_W        = 54;
const PL_H        = 64;

const SP = {
  idle:  '/juego/mascota-idle.png',
  jump:  '/juego/mascota-jump.png',
  fall:  '/juego/mascota-caida.png',
  plat:  '/juego/Sky_Jump/plataforma.png',
  cloud: '/juego/Sky_Jump/nube.png',
  star:  '/juego/Sky_Jump/estrella.png',
  bg:    '/juego/Sky_Jump/fondo_nubes.png',
};

// Each row has a left slot and right slot: 'normal' | 'cloud' | 'star'
// At least one slot must be a platform (not cloud)
function makeRow(id) {
  const leftType  = id < 3 ? 'normal' : (Math.random() < 0.22 ? 'cloud' : (Math.random() < 0.14 ? 'star' : 'normal'));
  let rightType;
  if (leftType === 'cloud') {
    rightType = Math.random() < 0.14 ? 'star' : 'normal'; // guarantee at least one platform
  } else {
    rightType = Math.random() < 0.22 ? 'cloud' : (Math.random() < 0.14 ? 'star' : 'normal');
  }
  return { id, left: leftType, right: rightType };
}

function genRows(n = 40) {
  const arr = [{ id: 0, left: 'normal', right: 'normal' }];
  for (let i = 1; i < n; i++) arr.push(makeRow(i));
  return arr;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export default function SkyHopGame({ onSalir, onVolverAlListado }) {
  const [phase,     setPhase]     = useState('menu');
  const [rows,      setRows]      = useState(genRows);
  const [curRow,    setCurRow]    = useState(0);
  const [curSide,   setCurSide]   = useState('left');
  const [score,     setScore]     = useState(0);
  const [timer,     setTimer]     = useState(TIMER_MAX);
  const [sprite,    setSprite]    = useState('idle');
  const [starFlash, setStarFlash] = useState(false);
  const [record,    setRecord]    = useState(() => +(localStorage.getItem(RECORD_KEY) || 0));

  const rootRef    = useRef(null);
  const contRef    = useRef(null);
  const playerRef  = useRef(null);
  const timerIntv  = useRef(null);
  const animReq    = useRef(null);
  const busyRef    = useRef(false);
  // Mutable mirrors so closures stay fresh
  const phaseRef   = useRef('menu');
  const rowsRef    = useRef(rows);
  const curRowRef  = useRef(0);
  const curSideRef = useRef('left');
  const timerRef   = useRef(TIMER_MAX);
  const scoreRef   = useRef(0);

  const sp = (v, set) => { set(v); };
  const syncPhase = (v) => { phaseRef.current = v; setPhase(v); };
  const syncRows  = (v) => { rowsRef.current  = v; setRows(v);  };
  const syncCurRow  = (v) => { curRowRef.current  = v; setCurRow(v);  };
  const syncCurSide = (v) => { curSideRef.current = v; setCurSide(v); };
  const syncScore = (v) => { scoreRef.current  = v; setScore(v); };
  const syncTimer = (v) => { timerRef.current  = v; setTimer(v); };

  // Force landscape on mount
  useEffect(() => {
    const tryLock = async () => {
      try { await screen.orientation?.lock?.('landscape'); } catch (_) {}
    };
    tryLock();
    return () => {
      try { screen.orientation?.unlock?.(); } catch (_) {}
    };
  }, []);

  const endGame = useCallback(() => {
    clearInterval(timerIntv.current);
    cancelAnimationFrame(animReq.current);
    busyRef.current = false;
    setSprite('fall');
    syncPhase('over');
  }, []);

  // Countdown
  useEffect(() => {
    if (phase !== 'playing') return;
    timerIntv.current = setInterval(() => {
      const next = timerRef.current - 100;
      if (next <= 0) { syncTimer(0); endGame(); }
      else syncTimer(next);
    }, 100);
    return () => clearInterval(timerIntv.current);
  }, [phase, endGame]);

  // Record on game over
  useEffect(() => {
    if (phase !== 'over') return;
    const s = scoreRef.current;
    if (s > record) { setRecord(s); localStorage.setItem(RECORD_KEY, String(s)); }
  }, [phase]);

  // Place player at current platform after render
  const placePlayer = useCallback((side, cont) => {
    const pl = playerRef.current;
    if (!pl || !cont) return;
    const cw = cont.clientWidth;
    const ch = cont.clientHeight;
    const px = (side === 'left' ? cw * LEFT_PCT : cw * RIGHT_PCT) - PL_W / 2;
    const py = ch * BASE_Y_PCT - PL_H - PLAT_H + 4;
    pl.style.left = px + 'px';
    pl.style.top  = py + 'px';
  }, []);

  const startGame = () => {
    clearInterval(timerIntv.current);
    cancelAnimationFrame(animReq.current);
    const fresh = genRows();
    syncRows(fresh);
    syncCurRow(0);
    syncCurSide('left');
    syncScore(0);
    syncTimer(TIMER_MAX);
    setSprite('idle');
    busyRef.current = false;
    syncPhase('playing');
    // Place player on next frame after render
    requestAnimationFrame(() => placePlayer('left', contRef.current));
  };

  const handleJump = useCallback((dir) => {
    if (phaseRef.current !== 'playing' || busyRef.current) return;
    const nextR = rowsRef.current[curRowRef.current + 1];
    if (!nextR) return;

    busyRef.current = true;
    setSprite('jump');

    const pl   = playerRef.current;
    const cont = contRef.current;
    if (!pl || !cont) return;

    const cw = cont.clientWidth;
    const ch = cont.clientHeight;

    // Pixel positions
    const fromX = parseFloat(pl.style.left) + PL_W / 2;
    const toX   = (dir === 'left' ? cw * LEFT_PCT : cw * RIGHT_PCT);
    const baseY = ch * BASE_Y_PCT - PL_H - PLAT_H + 4;

    const startT = performance.now();

    const animate = (now) => {
      const raw  = Math.min((now - startT) / JUMP_MS, 1);
      const ease = easeInOut(raw);

      // Arc: X moves linearly, Y moves in a sine arc upward then back down
      const px = fromX + (toX - fromX) * ease - PL_W / 2;
      const py = baseY - Math.sin(raw * Math.PI) * ARC_H;

      pl.style.left = px + 'px';
      pl.style.top  = py + 'px';

      // Platforms scroll down simultaneously
      if (cont) {
        cont.style.transition = 'none';
        cont.style.transform  = `translateY(${ease * ROW_H}px)`;
      }

      if (raw < 1) {
        animReq.current = requestAnimationFrame(animate);
        return;
      }

      // Jump complete — snap
      if (cont) { cont.style.transform = 'translateY(0)'; }

      const newIdx  = curRowRef.current + 1;
      const landed  = rowsRef.current[newIdx][dir];

      syncCurRow(newIdx);
      syncCurSide(dir);
      syncScore(scoreRef.current + 1);

      // Reset player to exact platform position
      const fx = (dir === 'left' ? cw * LEFT_PCT : cw * RIGHT_PCT) - PL_W / 2;
      pl.style.left = fx + 'px';
      pl.style.top  = baseY + 'px';

      if (landed === 'cloud') {
        setSprite('fall');
        setTimeout(endGame, 400);
        return;
      }

      if (landed === 'star') {
        syncTimer(Math.min(timerRef.current + STAR_BONUS, TIMER_MAX));
        setStarFlash(true);
        setTimeout(() => setStarFlash(false), 900);
        // Consume the star
        const updated = rowsRef.current.map((r, i) =>
          i === newIdx ? { ...r, [dir]: 'normal' } : r
        );
        syncRows(updated);
      }

      setSprite('idle');
      busyRef.current = false;

      // Generate more rows if needed
      const curr = rowsRef.current;
      if (curr.length - newIdx < 15) {
        const lastId = curr[curr.length - 1].id;
        const extra  = Array.from({ length: 25 }, (_, i) => makeRow(lastId + i + 1));
        syncRows([...curr, ...extra]);
      }
    };

    animReq.current = requestAnimationFrame(animate);
  }, [endGame, placePlayer]);

  // Tap handler: left/right half of screen → jump
  const handleTap = useCallback((e) => {
    if (phaseRef.current !== 'playing') return;
    e.preventDefault();
    const el   = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const dir  = clientX - rect.left < rect.width / 2 ? 'left' : 'right';
    handleJump(dir);
  }, [handleJump]);

  // Register touch listener with passive:false on root
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTap, { passive: false });
    return () => el.removeEventListener('touchstart', handleTap);
  }, [handleTap]);

  // Keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowLeft')  handleJump('left');
      if (e.key === 'ArrowRight') handleJump('right');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleJump]);

  // Visible rows (current ± buffer)
  const visibleRows = [];
  for (let i = Math.max(0, curRow - 2); i <= curRow + 8; i++) {
    const r = rows[i];
    if (r) visibleRows.push({ r, slotDiff: i - curRow });
  }

  const timerPct = (timer / TIMER_MAX) * 100;
  const timerLow = timer < 10000;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <style>{`
        /* Force landscape via CSS when API not available */
        @media screen and (orientation: portrait) {
          .skyhop-root {
            width: 100vh !important;
            height: 100vw !important;
            transform: rotate(90deg) !important;
            transform-origin: center center !important;
            position: fixed !important;
            top: calc((100vh - 100vw) / 2) !important;
            left: calc((100vw - 100vh) / 2) !important;
          }
        }
        @keyframes starBob { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-5px)} }
        @keyframes fadeUp { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-32px)} }
        @keyframes timerBlink { 0%,100%{opacity:1} 50%{opacity:0.55} }
      `}</style>

      <div
        ref={rootRef}
        className="skyhop-root"
        onClick={phase === 'playing' ? handleTap : undefined}
        style={{ position: 'fixed', inset: 0, overflow: 'hidden', touchAction: 'none', userSelect: 'none' }}
      >
        {/* Background */}
        <img src={SP.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />

        {/* Timer progress bar */}
        {phase === 'playing' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: 'rgba(0,0,0,0.18)', zIndex: 60 }}>
            <div style={{
              height: '100%',
              width: `${timerPct}%`,
              background: timerLow
                ? 'linear-gradient(90deg, #ef4444, #f97316)'
                : 'linear-gradient(90deg, var(--primary, #b05bb5), #F6416C)',
              transition: 'width 0.1s linear',
              animation: timerLow ? 'timerBlink 0.5s ease-in-out infinite' : 'none',
              borderRadius: '0 6px 6px 0',
            }} />
          </div>
        )}

        {/* Score */}
        {phase === 'playing' && (
          <div style={{
            position: 'absolute', top: 16, right: 16, zIndex: 60,
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)',
            borderRadius: 14, padding: '4px 14px', fontWeight: 800, fontSize: 20, color: '#1e293b',
          }}>
            {score}
          </div>
        )}

        {/* Exit button */}
        {phase === 'playing' && (
          <button
            onClick={e => { e.stopPropagation(); endGame(); }}
            style={{
              position: 'absolute', top: 16, left: 12, zIndex: 70,
              background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)',
              border: 'none', borderRadius: 10, padding: '5px 10px',
              fontWeight: 700, fontSize: 13, color: '#555', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}

        {/* Platforms container (gets translateY for scroll animation) */}
        <div ref={contRef} style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          {visibleRows.map(({ r, slotDiff }) =>
            (['left', 'right']).map(side => {
              const type    = r[side];
              const isCloud = type === 'cloud';
              const isStar  = type === 'star';
              const w = isCloud ? CLOUD_W : PLAT_W;
              const h = isCloud ? CLOUD_H : PLAT_H;
              return (
                <div
                  key={`${r.id}-${side}`}
                  style={{
                    position: 'absolute',
                    left: `calc(${(side === 'left' ? LEFT_PCT : RIGHT_PCT) * 100}% - ${w / 2}px)`,
                    top: `calc(${BASE_Y_PCT * 100}% + ${slotDiff * ROW_H}px)`,
                    width: w, height: h,
                  }}
                >
                  <img src={isCloud ? SP.cloud : SP.plat} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  {isStar && (
                    <img src={SP.star} alt="" style={{
                      position: 'absolute', bottom: '100%', left: '50%',
                      transform: 'translateX(-50%)', marginBottom: 2,
                      width: 22, height: 22, objectFit: 'contain',
                      animation: 'starBob 1.2s ease-in-out infinite',
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Player (JS-controlled position) */}
        {phase !== 'menu' && (
          <img
            ref={playerRef}
            src={sprite === 'jump' ? SP.jump : sprite === 'fall' ? SP.fall : SP.idle}
            alt=""
            style={{
              position: 'absolute',
              width: PL_W, height: PL_H,
              objectFit: 'contain', zIndex: 20,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Star bonus toast */}
        {starFlash && (
          <div style={{
            position: 'absolute', top: '18%', left: '50%',
            background: 'rgba(255,215,0,0.95)', borderRadius: 12,
            padding: '6px 16px', fontWeight: 800, fontSize: 14,
            color: '#92400e', zIndex: 70, pointerEvents: 'none',
            animation: 'fadeUp 0.9s ease forwards',
          }}>
            +{STAR_BONUS / 1000}s
          </div>
        )}

        {/* Menu / Game Over */}
        {(phase === 'menu' || phase === 'over') && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 80,
            background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: 'white', borderRadius: 26, padding: '22px 22px 16px',
              width: 'min(75%, 300px)', textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
            }}>
              <img
                src={phase === 'over' ? SP.fall : SP.idle}
                alt=""
                style={{ width: 58, height: 66, objectFit: 'contain', marginBottom: 4 }}
              />
              <h2 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--primary, #b05bb5)', fontWeight: 800 }}>
                {phase === 'menu' ? 'Sky Hop' : '¡Se acabó!'}
              </h2>

              {phase === 'over' ? (
                <>
                  <div style={{ fontSize: 46, fontWeight: 800, color: '#1e293b', margin: '6px 0 2px' }}>{score}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16 }}>
                    Mejor: {Math.max(score, record)}
                  </div>
                </>
              ) : (
                <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.6, margin: '8px 0 16px' }}>
                  Toca izquierda o derecha para saltar.<br />
                  Las nubes te harán caer.<br />
                  Las estrellas añaden tiempo.
                </p>
              )}

              <button
                onClick={e => { e.stopPropagation(); startGame(); }}
                style={{
                  width: '100%', padding: '12px',
                  background: 'linear-gradient(135deg, var(--primary, #b05bb5) 0%, #F6416C 100%)',
                  color: 'white', border: 'none', borderRadius: 14,
                  fontWeight: 800, fontSize: 14, cursor: 'pointer',
                  marginBottom: 7, boxShadow: '0 4px 14px rgba(176,91,181,0.35)',
                }}
              >
                {phase === 'menu' ? 'Jugar' : 'Otra vez'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); (onVolverAlListado || onSalir)(); }}
                style={{
                  width: '100%', padding: '9px', background: 'transparent',
                  color: '#94a3b8', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                }}
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
