import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

const RECORD_KEY = 'nuvia_skyhop_record';
const TIMER_MAX  = 60000;
const STAR_BONUS = 8000;
const JUMP_MS    = 320;
const ROW_H      = 115;
const ARC_H      = 60;
const PL_W       = 54;
const PL_H       = 64;
const PLAT_W     = 100;
const PLAT_H     = 30;
const CLOUD_W    = 130;
const CLOUD_H    = 42;
const BASE_Y_PCT  = 0.72;
const FEET_OFFSET = 14; // moves player down so visual feet align with platform grass surface

// Column centers as fraction of container width, by row slot count
const SLOT_PCT = {
  3: [0.20, 0.50, 0.80],
  4: [0.13, 0.38, 0.62, 0.87],
};

const SP = {
  idle:  '/juego/mascota-idle.png',
  jump:  '/juego/mascota-jump.png',
  fall:  '/juego/mascota-caida.png',
  plat:  '/juego/Sky_Jump/plataforma.png',
  cloud: '/juego/Sky_Jump/nube.png',
  star:  '/juego/Sky_Jump/estrella.png',
  bg:    '/juego/Sky_Jump/fondo_nubes.png',
};

function getSlotX(col, n, cw) {
  return cw * SLOT_PCT[n][col];
}

// Row: n slots (3 or 4), exactly 2 adjacent platforms, rest clouds.
// 4-col rows ALWAYS use pairStart=1 (pair {1,2}) — the only pair reachable from any 3-col position.
// 3-col rows use pairStart 0 or 1 randomly — both are safe because alive players in 4-col are always at col 1 or 2.
function makeRow(id) {
  const n = id % 2 === 0 ? 3 : 4;
  const slots = new Array(n).fill('cloud');
  const pairStart = n === 4 ? 1 : Math.floor(Math.random() * 2);
  slots[pairStart]     = Math.random() < 0.15 ? 'star' : 'normal';
  slots[pairStart + 1] = Math.random() < 0.15 ? 'star' : 'normal';
  return { id, n, slots, pairStart };
}

function genRows(count = 50) {
  const arr = [{ id: 0, n: 3, slots: ['normal', 'normal', 'normal'], pairStart: 0 }];
  for (let i = 1; i < count; i++) arr.push(makeRow(i));
  return arr;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export default function SkyHopGame({ onSalir, onVolverAlListado, mostrarColisiones = false }) {
  const [phase,     setPhase]     = useState('menu');
  const [rows,      setRows]      = useState(genRows);
  const [curRow,    setCurRow]    = useState(0);
  const [curCol,    setCurCol]    = useState(1);
  const [score,     setScore]     = useState(0);
  const [timer,     setTimer]     = useState(TIMER_MAX);
  const [sprite,    setSprite]    = useState('idle');
  const [starFlash, setStarFlash] = useState(false);
  const [landscape, setLandscape] = useState(() => window.innerWidth > window.innerHeight);
  const [record,    setRecord]    = useState(() => +(localStorage.getItem(RECORD_KEY) || 0));

  const wrapRef            = useRef(null); // outer wrapper, stable (not animated)
  const contRef            = useRef(null); // platforms container (gets translateY)
  const landscapeRef       = useRef(window.innerWidth > window.innerHeight);
  const playerRef          = useRef(null);
  const playerHitRef       = useRef(null); // debug hitbox mirror of playerRef
  const timerIntv          = useRef(null);
  const animReq            = useRef(null);
  const busyRef            = useRef(false);
  const pendingTransformReset = useRef(false);
  // Mutable mirrors
  const phaseRef  = useRef('menu');
  const rowsRef   = useRef(rows);
  const curRowRef = useRef(0);
  const curColRef = useRef(1);
  const timerRef  = useRef(TIMER_MAX);
  const scoreRef  = useRef(0);

  const syncPhase  = v => { phaseRef.current  = v; setPhase(v);  };
  const syncRows   = v => { rowsRef.current   = v; setRows(v);   };
  const syncCurRow = v => { curRowRef.current = v; setCurRow(v); };
  const syncCurCol = v => { curColRef.current = v; setCurCol(v); };
  const syncScore  = v => { scoreRef.current  = v; setScore(v);  };
  const syncTimer  = v => { timerRef.current  = v; setTimer(v);  };

  // Reset platform container transform after React re-renders new curRow positions (prevents 1-frame flicker)
  useLayoutEffect(() => {
    if (pendingTransformReset.current && contRef.current) {
      pendingTransformReset.current = false;
      contRef.current.style.transform = 'translateY(0)';
    }
  });

  // Exit fullscreen + unlock orientation on unmount
  useEffect(() => {
    return () => {
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) {}
      try { screen.orientation?.unlock?.(); } catch (_) {}
    };
  }, []);

  // Detect orientation changes and keep ref in sync
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

  const endGame = useCallback(() => {
    clearInterval(timerIntv.current);
    cancelAnimationFrame(animReq.current);
    busyRef.current = false;
    setSprite('fall');
    syncPhase('over');
  }, []);

  const exitFullscreen = () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) {}
    try { screen.orientation?.unlock?.(); } catch (_) {}
  };

  const handleExit = () => {
    exitFullscreen();
    (onVolverAlListado || onSalir)?.();
  };

  const handleGirar = async () => {
    try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch (_) {}
    try {
      await screen.orientation?.lock?.('landscape');
      setLandscape(true);
      landscapeRef.current = true;
    } catch (_) {}
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    timerIntv.current = setInterval(() => {
      const next = timerRef.current - 100;
      if (next <= 0) { syncTimer(0); endGame(); }
      else syncTimer(next);
    }, 100);
    return () => clearInterval(timerIntv.current);
  }, [phase, endGame]);

  useEffect(() => {
    if (phase !== 'over') return;
    const s = scoreRef.current;
    if (s > record) { setRecord(s); localStorage.setItem(RECORD_KEY, String(s)); }
  }, [phase]);

  const placePlayer = (col, row, cont) => {
    const pl = playerRef.current;
    if (!pl || !cont) return;
    const cw = cont.clientWidth;
    const ch = cont.clientHeight;
    const left = (getSlotX(col, row.n, cw) - PL_W / 2) + 'px';
    const top  = (ch * BASE_Y_PCT - PL_H + FEET_OFFSET) + 'px';
    pl.style.left = left;
    pl.style.top  = top;
    if (playerHitRef.current) { playerHitRef.current.style.left = left; playerHitRef.current.style.top = top; }
  };

  const startGame = async () => {
    try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch (_) {}
    try {
      await screen.orientation?.lock?.('landscape');
      setLandscape(true);
      landscapeRef.current = true;
    } catch (_) {}
    clearInterval(timerIntv.current);
    cancelAnimationFrame(animReq.current);
    pendingTransformReset.current = false;
    if (contRef.current) contRef.current.style.transform = 'translateY(0)';
    const fresh = genRows();
    syncRows(fresh);
    syncCurRow(0); syncCurCol(1);
    syncScore(0);  syncTimer(TIMER_MAX);
    setSprite('idle');
    busyRef.current = false;
    syncPhase('playing');
    requestAnimationFrame(() => placePlayer(1, fresh[0], contRef.current));
  };

  const handleJump = useCallback((dir) => {
    if (phaseRef.current !== 'playing' || busyRef.current) return;

    const nextIdx = curRowRef.current + 1;
    const nextRow = rowsRef.current[nextIdx];
    if (!nextRow) return;

    const curR = rowsRef.current[curRowRef.current];

    // Mapping:
    //   3→4: left = same col, right = col+1
    //   4→3: left = col-1,   right = same col
    let nextCol;
    if (curR.n === 3) {
      nextCol = dir === 'left' ? curColRef.current : curColRef.current + 1;
    } else {
      nextCol = dir === 'left' ? curColRef.current - 1 : curColRef.current;
    }

    // Out of bounds (empty zone) → fall
    if (nextCol < 0 || nextCol >= nextRow.n) {
      busyRef.current = true;
      setSprite('fall');
      setTimeout(endGame, 350);
      return;
    }

    // Capture type NOW before any state mutation
    const landedType = nextRow.slots[nextCol];

    busyRef.current = true;
    setSprite('jump');

    const pl   = playerRef.current;
    const cont = contRef.current;
    if (!pl || !cont) return;

    const cw     = cont.clientWidth;
    const ch     = cont.clientHeight;
    const fromX  = getSlotX(curColRef.current, curR.n, cw);
    const toX    = getSlotX(nextCol, nextRow.n, cw);
    const baseY  = ch * BASE_Y_PCT - PL_H + FEET_OFFSET;
    const startT = performance.now();

    const animate = now => {
      const raw  = Math.min((now - startT) / JUMP_MS, 1);
      const ease = easeInOut(raw);

      const pLeft = (fromX + (toX - fromX) * ease - PL_W / 2) + 'px';
      const pTop  = (baseY - Math.sin(raw * Math.PI) * ARC_H) + 'px';
      pl.style.left = pLeft;
      pl.style.top  = pTop;
      if (playerHitRef.current) { playerHitRef.current.style.left = pLeft; playerHitRef.current.style.top = pTop; }

      cont.style.transition = 'none';
      cont.style.transform  = `translateY(${ease * ROW_H}px)`;

      if (raw < 1) { animReq.current = requestAnimationFrame(animate); return; }

      // Jump complete — flag transform reset so useLayoutEffect resets it AFTER React re-renders new CSS positions (prevents 1-frame flicker)
      pendingTransformReset.current = true;
      syncCurRow(nextIdx);
      syncCurCol(nextCol);
      syncScore(scoreRef.current + 1);

      const snapL = (toX - PL_W / 2) + 'px';
      const snapT = baseY + 'px';
      pl.style.left = snapL;
      pl.style.top  = snapT;
      if (playerHitRef.current) { playerHitRef.current.style.left = snapL; playerHitRef.current.style.top = snapT; }

      if (landedType === 'cloud') {
        setSprite('fall');
        setTimeout(endGame, 400);
        return;
      }

      if (landedType === 'star') {
        syncTimer(Math.min(timerRef.current + STAR_BONUS, TIMER_MAX));
        setStarFlash(true);
        setTimeout(() => setStarFlash(false), 900);
        const updated = rowsRef.current.map((r, i) =>
          i !== nextIdx ? r : { ...r, slots: r.slots.map((s, j) => j === nextCol ? 'normal' : s) }
        );
        syncRows(updated);
      }

      setSprite('idle');
      busyRef.current = false;

      // Generate more rows
      const curr = rowsRef.current;
      if (curr.length - nextIdx < 15) {
        const lastId = curr[curr.length - 1].id;
        syncRows([...curr, ...Array.from({ length: 25 }, (_, i) => makeRow(lastId + i + 1))]);
      }
    };

    animReq.current = requestAnimationFrame(animate);
  }, [endGame]);

  // Tap detection on outer wrapper (not animated container)
  const handleTap = useCallback(e => {
    if (phaseRef.current !== 'playing') return;
    if (e.target.closest('button')) return;
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.touches?.[0]?.clientX ?? e.clientX;
    handleJump(cx - rect.left < rect.width / 2 ? 'left' : 'right');
  }, [handleJump]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTap, { passive: false });
    return () => el.removeEventListener('touchstart', handleTap);
  }, [handleTap]);

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowLeft')  handleJump('left');
      if (e.key === 'ArrowRight') handleJump('right');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleJump]);

  const visibleRows = [];
  for (let i = Math.max(0, curRow - 2); i <= curRow + 8; i++) {
    const r = rows[i];
    if (r) visibleRows.push({ r, slotDiff: i - curRow });
  }

  const timerPct = (timer / TIMER_MAX) * 100;
  const timerLow = timer < 10000;

  if (!landscape) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#87CEEB' }}>
        <img src={SP.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'relative', background: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: '28px 24px', textAlign: 'center', maxWidth: 260 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🔄</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--primary, #b05bb5)' }}>Gira el móvil</h3>
          <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>Sky Hop se juega en horizontal</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={handleExit} style={{ padding: '10px 18px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Volver</button>
            <button onClick={handleGirar} style={{ padding: '10px 18px', background: 'var(--primary, #b05bb5)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Girar 🔄</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      onClick={phase === 'playing' ? e => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (rect) handleJump(e.clientX - rect.left < rect.width / 2 ? 'left' : 'right');
      } : undefined}
      style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden', touchAction: 'none', userSelect: 'none' }}
    >
      <img src={SP.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />

      {/* Timer bar */}
      {phase === 'playing' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: 'rgba(0,0,0,0.18)', zIndex: 60 }}>
          <div style={{
            height: '100%', width: `${timerPct}%`,
            background: timerLow ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,var(--primary,#b05bb5),#F6416C)',
            transition: 'width 0.1s linear', borderRadius: '0 5px 5px 0',
            animation: timerLow ? 'timerBlink 0.5s ease-in-out infinite' : 'none',
          }} />
        </div>
      )}

      {phase === 'playing' && (
        <>
          <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 60, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '4px 14px', fontWeight: 800, fontSize: 20, color: '#1e293b' }}>{score}</div>
          <button onClick={e => { e.stopPropagation(); endGame(); }} style={{ position: 'absolute', top: 14, left: 12, zIndex: 70, background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: 10, padding: '5px 10px', fontWeight: 700, fontSize: 13, color: '#555', cursor: 'pointer' }}>✕</button>
        </>
      )}

      {/* Platforms container */}
      <div ref={contRef} style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
        {visibleRows.map(({ r, slotDiff }) =>
          r.slots.map((type, col) => {
            const isCloud = type === 'cloud';
            const isStar  = type === 'star';
            const w = isCloud ? CLOUD_W : PLAT_W;
            const h = isCloud ? CLOUD_H : PLAT_H;
            return (
              <div key={`${r.id}-${col}`} style={{
                position: 'absolute',
                left: `calc(${SLOT_PCT[r.n][col] * 100}% - ${w / 2}px)`,
                top:  `calc(${BASE_Y_PCT * 100}% - ${slotDiff * ROW_H}px)`,
                width: w, height: h,
              }}>
                <img src={isCloud ? SP.cloud : SP.plat} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                {isStar && (
                  <img src={SP.star} alt="" style={{
                    position: 'absolute', bottom: '100%', left: '50%',
                    transform: 'translateX(-50%)', marginBottom: 2,
                    width: 22, height: 22, objectFit: 'contain',
                    animation: 'starBob 1.2s ease-in-out infinite',
                  }} />
                )}
                {mostrarColisiones && isCloud && (
                  <div style={{ position: 'absolute', inset: 0, border: '2px solid #ef4444', boxSizing: 'border-box', pointerEvents: 'none' }} />
                )}
                {mostrarColisiones && !isCloud && (
                  <div style={{ position: 'absolute', top: 5, left: 15, right: 15, height: 2, background: '#22c55e', pointerEvents: 'none' }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Player */}
      {phase !== 'menu' && (
        <>
          <img ref={playerRef} src={sprite === 'jump' ? SP.jump : sprite === 'fall' ? SP.fall : SP.idle} alt=""
            style={{ position: 'absolute', width: PL_W, height: PL_H, objectFit: 'contain', zIndex: 20, pointerEvents: 'none' }} />
          {mostrarColisiones && (
            <div ref={playerHitRef} style={{ position: 'absolute', width: PL_W, height: PL_H, zIndex: 21, pointerEvents: 'none', boxSizing: 'border-box' }}>
              <div style={{ position: 'absolute', bottom: 9, left: 0, right: 0, height: 2, background: '#facc15' }} />
            </div>
          )}
        </>
      )}

      {starFlash && (
        <div style={{ position: 'absolute', top: '15%', left: '50%', background: 'rgba(255,215,0,0.95)', borderRadius: 12, padding: '6px 16px', fontWeight: 800, fontSize: 14, color: '#92400e', zIndex: 70, pointerEvents: 'none', animation: 'fadeUp 0.9s ease forwards' }}>
          +{STAR_BONUS / 1000}s
        </div>
      )}

      {(phase === 'menu' || phase === 'over') && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 24, padding: '22px 22px 16px', width: 'min(68%, 280px)', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.28)' }}>
            <img src={phase === 'over' ? SP.fall : SP.idle} alt="" style={{ width: 55, height: 62, objectFit: 'contain', marginBottom: 4 }} />
            <h2 style={{ margin: '0 0 4px', fontSize: 21, color: 'var(--primary, #b05bb5)', fontWeight: 800 }}>
              {phase === 'menu' ? 'Sky Hop' : '¡Se acabó!'}
            </h2>
            {phase === 'over' ? (
              <>
                <div style={{ fontSize: 44, fontWeight: 800, color: '#1e293b', margin: '6px 0 2px' }}>{score}</div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 14 }}>Mejor: {Math.max(score, record)}</div>
              </>
            ) : (
              <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.6, margin: '8px 0 14px' }}>
                Toca izquierda o derecha para saltar.<br />
                Las nubes te harán caer.<br />
                Las estrellas dan tiempo extra.
              </p>
            )}
            <button onClick={e => { e.stopPropagation(); startGame(); }} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,var(--primary,#b05bb5) 0%,#F6416C 100%)', color: 'white', border: 'none', borderRadius: 13, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 7, boxShadow: '0 4px 14px rgba(176,91,181,0.35)' }}>
              {phase === 'menu' ? 'Jugar' : 'Otra vez'}
            </button>
            <button onClick={e => { e.stopPropagation(); handleExit(); }} style={{ width: '100%', padding: '9px', background: 'transparent', color: '#94a3b8', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              Volver
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes starBob { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-5px)} }
        @keyframes fadeUp { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-32px)} }
        @keyframes timerBlink { 0%,100%{opacity:1} 50%{opacity:0.55} }
      `}</style>
    </div>
  );
}
