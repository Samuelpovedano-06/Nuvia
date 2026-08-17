import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Play, Pause, ChevronLeft } from 'lucide-react';
import { ApiService } from '../api';
import AccesorioOverlay from '../components/AccesorioOverlay';
import { sumarMoneda, CoinIcon } from '../utils/coinHelper';
import { getOutfitSprite } from '../utils/outfitSprites';

const RECORD_KEY = 'nuvia_skyhop_record';
const JUEGO_ID   = 'sky_hop';
const TIMER_MAX  = 60000;
const STAR_BONUS = 3000;
const JUMP_MS    = 320;
const ROW_H      = 115;
const ARC_H      = 75;
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

// Safety-guaranteed path generator.
// Hard rule: every platform in prev row gets ≥1 reachable platform in the next row.
// Patterns switch every 2-4 rows. Anti-stuck: if the path hasn't moved in 4 rows, force a new direction.
// Doubles (30%, max 7 consecutive) are placed at OPPOSITE extremes, never adjacent.
function createRowGenerator() {
  let prev  = [1];
  let prevN = 3;

  // Patterns: 'l'=drift left, 'r'=drift right, 'mid'=toward center, 'rnd'=random each row
  const PATS = ['l', 'r', 'l', 'r', 'mid', 'rnd']; // weighted: drift more common
  let pat     = PATS[Math.floor(Math.random() * PATS.length)];
  let patStep = 0;
  let patLen  = Math.floor(Math.random() * 3) + 2; // 2–4 rows per pattern
  let dblStrk = 0;
  let history = []; // normalized positions [0..1] of last few single-platform rows

  function pickNewPat(current) {
    // Always pick something different
    let p;
    do { p = PATS[Math.floor(Math.random() * PATS.length)]; } while (p === current);
    return p;
  }

  function chooseDir(lc, rc, n) {
    const lv  = lc >= 0 && lc < n;
    const rv  = rc >= 0 && rc < n;
    if (!lv) return 'r';
    if (!rv) return 'l';
    const mid = (n - 1) / 2;

    // 15% wild-card: ignore the pattern and pick the opposite of what it'd normally pick
    // This prevents the path from being too predictable
    const wild = Math.random() < 0.15;

    let base;
    switch (pat) {
      case 'l':   base = 'l'; break;
      case 'r':   base = 'r'; break;
      case 'mid': base = Math.abs(lc - mid) <= Math.abs(rc - mid) ? 'l' : 'r'; break;
      default:    base = Math.random() < 0.5 ? 'l' : 'r'; break;
    }
    return wild ? (base === 'l' ? 'r' : 'l') : base;
  }

  return function makeRow(id) {
    const n    = id % 2 === 0 ? 3 : 4;
    const plat = () => {
      const r = Math.random();
      if (r < 0.28) return 'coin'; // 28% probabilidad de moneda
      if (r < 0.33) return 'star'; // 5% probabilidad de estrella boost
      return 'normal';
    };
    const slots = new Array(n).fill('cloud');
    const placed = new Set();

    // Anti-stuck: if normalized position hasn't varied in last 4 rows, force direction change
    if (history.length >= 4) {
      const min = Math.min(...history), max = Math.max(...history);
      if (max - min < 0.2) {
        // Stuck — pick an aggressive drift toward the opposite side
        const avg = (min + max) / 2;
        pat     = avg < 0.5 ? 'r' : 'l';
        patLen  = Math.floor(Math.random() * 2) + 2;
        patStep = 0;
        history = [];
      }
    }

    // MANDATORY: cover every prev platform
    for (const p of prev) {
      const lc = prevN === 3 ? p     : p - 1;
      const rc = prevN === 3 ? p + 1 : p;
      const lv = lc >= 0 && lc < n;
      const rv = rc >= 0 && rc < n;
      if ((lv && placed.has(lc)) || (rv && placed.has(rc))) continue;
      const d = chooseDir(lc, rc, n);
      placed.add(d === 'l' ? (lv ? lc : rc) : (rv ? rc : lc));
    }

    // OPTIONAL double (30%, max 7 consecutive, only if farthest reachable is non-adjacent)
    if (dblStrk < 7 && placed.size === 1 && Math.random() < 0.30) {
      const mainC = [...placed][0];
      let farthest = null, maxDist = 0;
      for (const p of prev) {
        for (const c of [prevN === 3 ? p : p - 1, prevN === 3 ? p + 1 : p]) {
          if (c >= 0 && c < n && !placed.has(c) && Math.abs(c - mainC) > maxDist) {
            farthest = c; maxDist = Math.abs(c - mainC);
          }
        }
      }
      if (farthest !== null && maxDist > 1) placed.add(farthest);
    }

    // Write slots
    for (const c of placed) slots[c] = plat();
    dblStrk = placed.size >= 2 ? dblStrk + 1 : 0;

    // Update history with normalized position of single-platform rows
    if (placed.size === 1) {
      history.push([...placed][0] / (n - 1));
      if (history.length > 6) history.shift();
    } else {
      history = []; // two-platform rows reset the stuck counter
    }

    // Advance pattern (short bursts, always change)
    patStep++;
    if (patStep >= patLen) {
      pat     = pickNewPat(pat);
      patLen  = Math.floor(Math.random() * 3) + 2;
      patStep = 0;
    }

    prev  = [...placed];
    prevN = n;
    return { id, n, slots };
  };
}

function genInitialRows(gen, count = 50) {
  const arr = [{ id: 0, n: 3, slots: ['normal', 'normal', 'normal'] }];
  for (let i = 1; i < count; i++) arr.push(gen(i));
  return arr;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export default function SkyHopGame({ onSalir, onVolverAlListado, mostrarColisiones = false }) {
  const pathGenRef = useRef(null);
  if (!pathGenRef.current) pathGenRef.current = createRowGenerator();

  const [phase, setPhase]     = useState('menu'); // 'menu' | 'playing' | 'paused' | 'over'
  const [rows, setRows]       = useState([]);
  const [curRow, setCurRow]   = useState(0);
  const [curCol, setCurCol]   = useState(1);
  const [score, setScore]     = useState(0);
  const [monedasPartida, setMonedasPartida] = useState(0);
  const [record, setRecord]   = useState(() => Number(localStorage.getItem(RECORD_KEY) || 0));
  const [timer, setTimer]     = useState(TIMER_MAX);
  const [sprite, setSprite]   = useState('idle');
  const [landscape, setLandscape] = useState(() => window.innerWidth > window.innerHeight);
  const [starFlash, setStarFlash] = useState(false);
  const [coinFlash, setCoinFlash] = useState(false);

  const wrapRef            = useRef(null); // outer wrapper, stable (not animated)
  const contRef            = useRef(null); // platforms container (gets translateY)
  const landscapeRef       = useRef(window.innerWidth > window.innerHeight);
  const playerRef          = useRef(null);
  const playerHitRef       = useRef(null); // debug hitbox mirror of playerRef
  const queuedDirRef       = useRef(null); // next jump direction queued during animation
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

  // Sync record with server on mount
  useEffect(() => {
    ApiService.getRecordsJuego().then(records => {
      const enServ = Number(records?.[JUEGO_ID] || 0);
      const enLoc  = Number(localStorage.getItem(RECORD_KEY) || 0);
      const mejor  = Math.max(enServ, enLoc);
      setRecord(mejor);
      localStorage.setItem(RECORD_KEY, String(mejor));
      if (enLoc > enServ) ApiService.guardarRecordJuego(JUEGO_ID, enLoc);
    }).catch(() => {});
  }, []);

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
    } catch (_) {}
    try { screen.orientation?.unlock?.(); } catch (_) {}
    window.dispatchEvent(new Event('resize'));
    await new Promise(r => setTimeout(r, 60));
  };

  const handleExit = async () => {
    await exitFullscreen();
    (onVolverAlListado || onSalir)?.();
  };

  const handleSalirExit = async () => {
    await exitFullscreen();
    onSalir?.();
  };

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') syncPhase('paused');
    else if (phaseRef.current === 'paused') syncPhase('playing');
  }, []);

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
    if (s > record) {
      setRecord(s);
      localStorage.setItem(RECORD_KEY, String(s));
      ApiService.guardarRecordJuego(JUEGO_ID, s);
    }
  }, [phase]);

  const placePlayer = useCallback((col, row, cont) => {
    const pl = playerRef.current;
    if (!pl || !cont) return;
    const cw = cont.clientWidth;
    const ch = cont.clientHeight;
    if (!cw || !ch) return;
    const left = (getSlotX(col, row.n, cw) - PL_W / 2) + 'px';
    const top  = (ch * BASE_Y_PCT - PL_H + FEET_OFFSET) + 'px';
    pl.style.left = left;
    pl.style.top  = top;
    if (playerHitRef.current) { playerHitRef.current.style.left = left; playerHitRef.current.style.top = top; }
  }, []);

  // Reposition player whenever phase or orientation changes (or container resizes)
  useEffect(() => {
    if (phase === 'playing' || phase === 'paused') {
      const reposition = () => {
        const r = rowsRef.current[curRowRef.current];
        if (r && contRef.current) {
          placePlayer(curColRef.current, r, contRef.current);
        }
      };
      reposition();
      const t1 = setTimeout(reposition, 60);
      const t2 = setTimeout(reposition, 200);
      const t3 = setTimeout(reposition, 500);
      window.addEventListener('resize', reposition);
      window.addEventListener('orientationchange', reposition);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        window.removeEventListener('resize', reposition);
        window.removeEventListener('orientationchange', reposition);
      };
    }
  }, [phase, landscape, placePlayer]);

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
    queuedDirRef.current = null;
    if (contRef.current) contRef.current.style.transform = 'translateY(0)';
    pathGenRef.current = createRowGenerator();
    const fresh = genInitialRows(pathGenRef.current);
    syncRows(fresh);
    syncCurRow(0); syncCurCol(1);
    syncScore(0);  setMonedasPartida(0); syncTimer(TIMER_MAX);
    setSprite('idle');
    busyRef.current = false;
    syncPhase('playing');
    requestAnimationFrame(() => placePlayer(1, fresh[0], contRef.current));
  };

  const handleJump = useCallback((dir) => {
    if (phaseRef.current !== 'playing') return;
    if (busyRef.current) { queuedDirRef.current = dir; return; }

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
      const pTop  = (baseY - Math.sin(ease * Math.PI) * ARC_H) + 'px';
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

      if (landedType === 'coin') {
        sumarMoneda(1);
        setMonedasPartida(prev => prev + 1);
        setCoinFlash(true);
        setTimeout(() => setCoinFlash(false), 900);
        const updated = rowsRef.current.map((r, i) =>
          i !== nextIdx ? r : { ...r, slots: r.slots.map((s, j) => j === nextCol ? 'normal' : s) }
        );
        syncRows(updated);
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
      const queued = queuedDirRef.current;
      queuedDirRef.current = null;

      // Generate more rows using the same path generator (maintains drift continuity)
      const curr = rowsRef.current;
      if (curr.length - nextIdx < 15) {
        const lastId = curr[curr.length - 1].id;
        syncRows([...curr, ...Array.from({ length: 25 }, (_, i) => pathGenRef.current(lastId + i + 1))]);
      }

      // Fire queued input immediately after animation completes
      if (queued) handleJump(queued);
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

  if (phase === 'menu') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #2b0b30 0%, #52185c 50%, #852296 100%)', padding: '16px 24px', overflowY: 'auto' }}>
        <svg style={{ position: 'absolute', bottom: 0, width: '100%', opacity: 0.22 }} viewBox="0 0 400 200" preserveAspectRatio="none">
          <path d="M0,150 Q50,80 100,130 Q150,60 200,110 Q250,50 300,100 Q350,70 400,120 L400,200 L0,200Z" fill="#38bdf8" />
          <path d="M0,170 Q60,120 120,150 Q180,100 240,140 Q300,110 360,150 L400,160 L400,200 L0,200Z" fill="#0284c7" />
        </svg>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '38px', marginBottom: '2px' }}>☁️</div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.5px', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>Sky Hop</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 12px' }}>¡Salta de plataforma en plataforma sin caerte!</p>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '14px', padding: '10px 14px', marginBottom: '14px', textAlign: 'left', width: '100%' }}>
            {[
              ['👈👉', 'Controles', 'Toca a la izquierda o derecha para saltar'],
              ['☁️', 'Cuidado nubes', 'Las nubes se rompen y te hacen caer'],
              ['⭐', 'Estrellas', 'Recógelas para ganar tiempo extra']
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
    );
  }

  if (!landscape) {
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
          Sky Hop se juega en orientación horizontal
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
      ref={wrapRef}
      onClick={phase === 'playing' ? e => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (rect) handleJump(e.clientX - rect.left < rect.width / 2 ? 'left' : 'right');
      } : undefined}
      style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden', touchAction: 'none', userSelect: 'none' }}
    >
      <img src={SP.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />

      {/* Timer bar */}
      {(phase === 'playing' || phase === 'paused') && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: 'rgba(0,0,0,0.18)', zIndex: 60 }}>
          <div style={{
            height: '100%', width: `${timerPct}%`,
            background: timerLow ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,var(--primary,#b05bb5),#F6416C)',
            transition: 'width 0.1s linear', borderRadius: '0 5px 5px 0',
            animation: timerLow && phase === 'playing' ? 'timerBlink 0.5s ease-in-out infinite' : 'none',
          }} />
        </div>
      )}

      {(phase === 'playing' || phase === 'paused') && (
        <>
          <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 60, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '4px 12px', fontWeight: 800, fontSize: 14, color: '#852296', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
              <CoinIcon size={16} /> {monedasPartida}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '4px 14px', fontWeight: 800, fontSize: 20, color: '#1e293b', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>{score}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); togglePause(); }} style={{ position: 'absolute', top: 14, left: 12, zIndex: 70, background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            {phase === 'paused' ? <Play size={18} fill="var(--primary,#b05bb5)" color="var(--primary,#b05bb5)" /> : <Pause size={18} fill="var(--primary,#b05bb5)" color="var(--primary,#b05bb5)" />}
          </button>
        </>
      )}

      {/* Tap divider line (collision debug) */}
      {mostrarColisiones && (phase === 'playing' || phase === 'paused') && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: 'rgba(239,68,68,0.6)', zIndex: 55, pointerEvents: 'none' }} />
      )}

      {/* Platforms container */}
      <div ref={contRef} style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
        {visibleRows.map(({ r, slotDiff }) =>
          r.slots.map((type, col) => {
            const isCloud = type === 'cloud';
            const isStar  = type === 'star';
            const isCoin  = type === 'coin';
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
                {isCoin && (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: '50%',
                    transform: 'translateX(-50%)', marginBottom: 2,
                    animation: 'starBob 1.2s ease-in-out infinite',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))'
                  }}>
                    <CoinIcon size={22} />
                  </div>
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
          <div ref={playerRef} style={{ position: 'absolute', left: 'calc(50% - 27px)', top: 'calc(72% - 50px)', width: PL_W, height: PL_H, zIndex: 20, pointerEvents: 'none' }}>
            <img src={sprite === 'jump' ? getOutfitSprite('jump', SP.jump) : sprite === 'fall' ? getOutfitSprite('caida', SP.fall) : getOutfitSprite('idle', SP.idle)} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            <AccesorioOverlay size={21} />
          </div>
          {mostrarColisiones && (
            <div ref={playerHitRef} style={{ position: 'absolute', left: 'calc(50% - 27px)', top: 'calc(72% - 50px)', width: PL_W, height: PL_H, zIndex: 21, pointerEvents: 'none', boxSizing: 'border-box' }}>
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

      {coinFlash && (
        <div style={{ position: 'absolute', top: '15%', left: '50%', background: 'rgba(255,255,255,0.95)', border: '1.5px solid #F472B6', borderRadius: 12, padding: '6px 16px', fontWeight: 800, fontSize: 14, color: '#BE185D', zIndex: 70, pointerEvents: 'none', animation: 'fadeUp 0.9s ease forwards', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(244,114,182,0.3)' }}>
          <CoinIcon size={16} /> +1 Moneda
        </div>
      )}

      {phase === 'paused' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: 'var(--primary, #b05bb5)', margin: 0 }}>Pausa</h2>
          <p style={{ color: '#64748b', textAlign: 'center', fontSize: 14, margin: '8px 24px 18px' }}>Juego en pausa. ¡Tómate un respiro!</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 240 }}>
            <button onClick={e => { e.stopPropagation(); togglePause(); }} style={{ background: 'var(--primary,#b05bb5)', color: 'white', border: 'none', borderRadius: 999, padding: '12px 24px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 6px 16px rgba(176,91,181,0.4)' }}>
              <Play size={16} fill="white" /> Reanudar
            </button>
            <button onClick={e => { e.stopPropagation(); handleExit(); }} style={{ background: 'white', color: 'var(--primary,#b05bb5)', border: '2px solid var(--primary,#b05bb5)', borderRadius: 999, padding: '12px 24px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              Volver atrás
            </button>
            <button onClick={e => { e.stopPropagation(); handleSalirExit(); }} style={{ background: 'white', color: 'var(--primary,#b05bb5)', border: '2px solid var(--primary,#b05bb5)', borderRadius: 999, padding: '12px 24px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              Salir
            </button>
          </div>
        </div>
      )}

      {phase === 'over' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 24, padding: '22px 22px 16px', width: 'min(68%, 280px)', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.28)' }}>
            <img src={SP.fall} alt="" style={{ width: 55, height: 62, objectFit: 'contain', marginBottom: 4 }} />
            <h2 style={{ margin: '0 0 4px', fontSize: 21, color: 'var(--primary, #b05bb5)', fontWeight: 800 }}>¡Se acabó!</h2>
            <div style={{ fontSize: 44, fontWeight: 800, color: '#1e293b', margin: '6px 0 2px' }}>{score}</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>Mejor: {Math.max(score, record)}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 13, fontWeight: 800, color: '#BE185D', background: '#FCE7F3', padding: '4px 10px', borderRadius: 10, marginBottom: 14 }}>
              <CoinIcon size={16} /> +{monedasPartida} Monedas
            </div>
            <button onClick={e => { e.stopPropagation(); startGame(); }} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,var(--primary,#b05bb5) 0%,#F6416C 100%)', color: 'white', border: 'none', borderRadius: 13, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 7, boxShadow: '0 4px 14px rgba(176,91,181,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Play size={14} fill="white" /> Otra vez
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
