import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Play, Pause, Settings } from 'lucide-react';
import { ApiService } from '../api';

function PanelSens({ gPct, onG, sPct, onS, useS, onToggleS }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ opacity: useS ? 0.35 : 1, pointerEvents: useS ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>General</span>
          {useS && <span style={{ fontSize: 10, color: 'var(--text-light)', fontStyle: 'italic' }}>no activa aquí</span>}
        </div>
        <input type="range" min="1" max="100" step="1" value={gPct} onChange={e => onG?.(Number(e.target.value))} className="custom-range" style={{ '--value': `${gPct}%` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-light)' }}>
          <span>Lento</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{gPct}%</span><span>Rápido</span>
        </div>
      </div>
      <button onClick={onToggleS} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: useS ? 'var(--primary)' : 'white', color: useS ? 'white' : 'var(--primary)', border: '1.5px solid var(--primary)', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        {useS ? '✓ ' : ''}Específica Food Drop
      </button>
      {useS && <>
        <input type="range" min="1" max="100" step="1" value={sPct} onChange={e => onS(Number(e.target.value))} className="custom-range" style={{ '--value': `${sPct}%` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-light)' }}>
          <span>Lento</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{sPct}%</span><span>Rápido</span>
        </div>
      </>}
    </div>
  );
}

const RECORD_KEY = 'nuvia_fooddrop_record';
const JUEGO_ID = 'food_drop';
const MAX_MISSES = 8;
const PLAYER_W = 72;
const PLAYER_H = 82;
const OBJ_W = 58;
const OBJ_H = 58;
const PLAYER_BOT = 24;

const FOOD_ITEMS = [
  { sprite: '/juego/Food_Drop/chocolate.png', tip: 'El chocolate negro reduce los calambres' },
  { sprite: '/juego/Food_Drop/fresa.png', tip: 'Las fresas aportan hierro y antioxidantes' },
  { sprite: '/juego/Food_Drop/platano.png', tip: 'El plátano reduce los calambres musculares' },
  { sprite: '/juego/Food_Drop/aguacate.png', tip: 'El aguacate tiene magnesio antiinflamatorio' },
];
const BAD_ITEMS = [
  { sprite: '/juego/Food_Drop/alcohol.png', tip: '¡El alcohol empeora los calambres!' },
  { sprite: '/juego/Food_Drop/snack.png', tip: '¡Los snacks procesados aumentan la inflamación!' },
];

const SP = {
  idle: '/juego/mascota-idle.png',
  catch: '/juego/mascota-caida.png',
  bg: '/juego/Food_Drop/fondo.png',
};

let _objId = 0;

function dropSpeed(score) { return Math.min(6.5 + Math.floor(score / 5) * 0.5, 14); }
function spawnMs(score) { return Math.max(2600 - Math.floor(score / 5) * 100, 950); }

export default function FoodDropGame({ onSalir, onVolverAlListado, mostrarColisiones = false, globalSensPct, onGlobalSensChange }) {
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [record, setRecord] = useState(() => +(localStorage.getItem(RECORD_KEY) || 0));
  const [tip, setTip] = useState(null);
  const [objects, setObjects] = useState([]);
  const [specificPct, setSpecificPct] = useState(() => Number(localStorage.getItem('nuvia_fooddrop_specific_sens') || 50));
  const [useSpecific, setUseSpecific] = useState(() => localStorage.getItem('nuvia_fooddrop_use_specific') === 'true');
  const [showAjustes, setShowAjustes] = useState(false);

  const phaseRef = useRef('menu');
  const scoreRef = useRef(0);
  const missesRef = useRef(0);
  const playerXRef = useRef(0);
  const targetXRef = useRef(0);
  const sensPctRef = useRef(50); // kept in sync via useEffect below
  const objectsRef = useRef([]);
  const areaRef = useRef(null);
  const playerRef = useRef(null);
  const animRef = useRef(null);
  const spawnTRef = useRef(null);
  const tipTRef = useRef(null);

  const syncPhase = v => { phaseRef.current = v; setPhase(v); };
  const syncScore = v => { scoreRef.current = v; setScore(v); };
  const syncMisses = v => { missesRef.current = v; setMisses(v); };

  // Keep sensPctRef in sync with whichever sensitivity is active
  useEffect(() => {
    sensPctRef.current = useSpecific ? specificPct : (globalSensPct ?? 50);
  }, [globalSensPct, specificPct, useSpecific]);

  // Sync record with server on mount
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

  // Center player after first render
  useLayoutEffect(() => {
    if (areaRef.current && playerRef.current) {
      const x = areaRef.current.clientWidth / 2;
      playerXRef.current = x;
      targetXRef.current = x;
      playerRef.current.style.left = (x - PLAYER_W / 2) + 'px';
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    clearTimeout(spawnTRef.current);
    clearTimeout(tipTRef.current);
  }, []);

  const showTip = useCallback((text) => {
    clearTimeout(tipTRef.current);
    setTip(text);
    tipTRef.current = setTimeout(() => setTip(null), 2200);
  }, []);

  const endGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    clearTimeout(spawnTRef.current);
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

  const scheduleSpawn = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const area = areaRef.current;
    if (!area) return;
    const w = area.clientWidth;
    const isBad = Math.random() < 0.25;
    const pool = isBad ? BAD_ITEMS : FOOD_ITEMS;
    const item = pool[Math.floor(Math.random() * pool.length)];
    const x = OBJ_W / 2 + Math.random() * (w - OBJ_W);
    objectsRef.current = [
      ...objectsRef.current,
      { id: ++_objId, x, y: -OBJ_H, type: isBad ? 'bad' : 'food', sprite: item.sprite, tip: item.tip },
    ];
    spawnTRef.current = setTimeout(scheduleSpawn, spawnMs(scoreRef.current));
  }, []);

  const gameLoop = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const area = areaRef.current;
    if (!area) { animRef.current = requestAnimationFrame(gameLoop); return; }

    // Lerp player toward target when sensitivity < 100%
    if (sensPctRef.current < 100) {
      const α = Math.max(0.04, (sensPctRef.current / 100) * 0.96);
      const newX = playerXRef.current + (targetXRef.current - playerXRef.current) * α;
      playerXRef.current = newX;
      if (playerRef.current) playerRef.current.style.left = (newX - PLAYER_W / 2) + 'px';
    }

    const h = area.clientHeight;
    const speed = dropSpeed(scoreRef.current);
    const px = playerXRef.current;
    const pTop = h - PLAYER_BOT - PLAYER_H;

    let scored = false;
    let missed = 0;
    let over = false;
    let tipText = null;

    const next = objectsRef.current
      .map(o => ({ ...o, y: o.y + speed }))
      .filter(o => {
        const oL = o.x - OBJ_W / 2, oR = o.x + OBJ_W / 2;
        const oT = o.y, oB = o.y + OBJ_H;
        const pL = px - PLAYER_W / 2, pR = px + PLAYER_W / 2;

        if (oR > pL && oL < pR && oB > pTop && oT < pTop + PLAYER_H) {
          if (o.type === 'bad') { over = true; tipText = o.tip; }
          else { scored = true; tipText = o.tip; }
          return false;
        }
        if (o.y > h) {
          if (o.type === 'food') missed++;
          return false;
        }
        return true;
      });

    objectsRef.current = next;
    setObjects([...next]);

    if (scored) {
      syncScore(scoreRef.current + 1);
      if (playerRef.current) {
        playerRef.current.src = SP.catch;
        setTimeout(() => { if (playerRef.current) playerRef.current.src = SP.idle; }, 280);
      }
    }
    if (missed > 0) {
      const nm = missesRef.current + missed;
      syncMisses(nm);
      if (nm >= MAX_MISSES) over = true;
    }
    if (tipText) showTip(tipText);
    if (over) { endGame(); return; }

    animRef.current = requestAnimationFrame(gameLoop);
  }, [endGame, showTip]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    clearTimeout(spawnTRef.current);
    objectsRef.current = [];
    setObjects([]);
    syncScore(0);
    syncMisses(0);
    setTip(null);
    const area = areaRef.current;
    if (area) {
      const x = area.clientWidth / 2;
      playerXRef.current = x;
      targetXRef.current = x;
      if (playerRef.current) {
        playerRef.current.style.left = (x - PLAYER_W / 2) + 'px';
        playerRef.current.src = SP.idle;
      }
    }
    syncPhase('playing');
    spawnTRef.current = setTimeout(scheduleSpawn, 1200);
    animRef.current = requestAnimationFrame(gameLoop);
  }, [scheduleSpawn, gameLoop]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      cancelAnimationFrame(animRef.current);
      clearTimeout(spawnTRef.current);
      syncPhase('paused');
    } else if (phaseRef.current === 'paused') {
      syncPhase('playing');
      spawnTRef.current = setTimeout(scheduleSpawn, spawnMs(scoreRef.current));
      animRef.current = requestAnimationFrame(gameLoop);
    }
  }, [scheduleSpawn, gameLoop]);

  const handleMove = useCallback((clientX) => {
    if (phaseRef.current !== 'playing') return;
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const x = Math.max(PLAYER_W / 2, Math.min(rect.width - PLAYER_W / 2, clientX - rect.left));
    targetXRef.current = x;
    // At 100% sensitivity: snap directly (zero latency)
    if (sensPctRef.current >= 100) {
      playerXRef.current = x;
      if (playerRef.current) playerRef.current.style.left = (x - PLAYER_W / 2) + 'px';
    }
  }, []);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const onTS = e => { e.preventDefault(); handleMove(e.touches[0].clientX); };
    const onTM = e => { e.preventDefault(); handleMove(e.touches[0].clientX); };
    const onMD = e => handleMove(e.clientX);
    const onMM = e => { if (e.buttons === 1) handleMove(e.clientX); };
    area.addEventListener('touchstart', onTS, { passive: false });
    area.addEventListener('touchmove', onTM, { passive: false });
    area.addEventListener('mousedown', onMD);
    area.addEventListener('mousemove', onMM);
    return () => {
      area.removeEventListener('touchstart', onTS);
      area.removeEventListener('touchmove', onTM);
      area.removeEventListener('mousedown', onMD);
      area.removeEventListener('mousemove', onMM);
    };
  }, [handleMove]);

  const btn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '999px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' };
  const btnSec = { ...btn, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${SP.bg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#FCE7F3', zIndex: 0 }} />

      {/* Game area */}
      <div ref={areaRef} style={{ position: 'absolute', inset: 0, zIndex: 10 }}>

        {/* Falling objects */}
        {objects.map(o => (
          <div key={o.id} style={{ position: 'absolute', left: o.x - OBJ_W / 2, top: o.y, width: OBJ_W, height: OBJ_H, pointerEvents: 'none' }}>
            <img
              src={o.sprite}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))' }}
            />
            {mostrarColisiones && (
              <div style={{ position: 'absolute', inset: 0, border: `2px dashed ${o.type === 'bad' ? '#ef4444' : '#22c55e'}`, background: o.type === 'bad' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', pointerEvents: 'none' }} />
            )}
          </div>
        ))}

        {/* Table with tablecloth */}
        <div style={{ position: 'absolute', bottom: 0, left: -4, right: -4, height: PLAYER_BOT + 10, zIndex: 15, pointerEvents: 'none', background: 'linear-gradient(180deg,#f5c2e0 0%,#eda8d0 100%)', borderRadius: '8px 8px 0 0', boxShadow: '0 -3px 10px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.45)' }}>
          {/* cloth folds */}
          <div style={{ position: 'absolute', top: 0, left: '20%', width: 1, bottom: 0, background: 'rgba(200,80,140,0.15)' }} />
          <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, bottom: 0, background: 'rgba(200,80,140,0.15)' }} />
          <div style={{ position: 'absolute', top: 0, left: '80%', width: 1, bottom: 0, background: 'rgba(200,80,140,0.15)' }} />
          {/* bottom trim */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(180,60,120,0.2)', borderRadius: '0 0 6px 6px' }} />
          {/* shadow on floor */}
          <div style={{ position: 'absolute', bottom: -12, left: '8%', right: '8%', height: 6, background: 'rgba(0,0,0,0.1)', borderRadius: '50%', filter: 'blur(4px)' }} />
        </div>

        {/* Player */}
        <img
          ref={playerRef}
          src={SP.idle}
          alt=""
          style={{ position: 'absolute', bottom: PLAYER_BOT, width: PLAYER_W, height: PLAYER_H, objectFit: 'contain', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.22))', pointerEvents: 'none', zIndex: 20 }}
          onError={e => e.currentTarget.style.display = 'none'}
        />
        {mostrarColisiones && (
          <div style={{ position: 'absolute', bottom: PLAYER_BOT, left: playerXRef.current - PLAYER_W / 2, width: PLAYER_W, height: PLAYER_H, border: '2px dashed #facc15', background: 'rgba(250,204,21,0.15)', pointerEvents: 'none', zIndex: 50 }} />
        )}
      </div>

      {/* HUD */}
      {(phase === 'playing' || phase === 'paused') && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 60 }}>
          <button
            onClick={e => { e.stopPropagation(); togglePause(); }}
            style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            {phase === 'paused'
              ? <Play size={18} fill="var(--primary,#b05bb5)" color="var(--primary,#b05bb5)" />
              : <Pause size={18} fill="var(--primary,#b05bb5)" color="var(--primary,#b05bb5)" />}
          </button>

          <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '4px 14px', fontWeight: 800, fontSize: 20, color: '#1e293b' }}>
            {score}
          </div>

          {/* Miss counter — rellena de derecha a izquierda */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '6px 10px' }}>
            {Array.from({ length: MAX_MISSES }).map((_, i) => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i >= MAX_MISSES - misses ? '#cbd5e1' : '#F6416C', transition: 'background 0.2s' }} />
            ))}
          </div>
        </div>
      )}

      {/* Tip popup — acotado para no salirse */}
      {tip && (
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.96)', borderRadius: 14, padding: '8px 16px', fontWeight: 700, fontSize: 13, color: 'var(--primary,#b05bb5)', zIndex: 70, pointerEvents: 'none', maxWidth: '75vw', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', animation: 'fdTip 2.2s ease forwards' }}>
          💡 {tip}
        </div>
      )}

      {/* Menu overlay */}
      {phase === 'menu' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: 'var(--primary,#b05bb5)', margin: 0 }}>Food Drop</h2>
          <p style={{ color: '#64748b', textAlign: 'center', fontSize: '14px', margin: '8px 24px 18px' }}>
            Atrapa los alimentos saludables y esquiva los dañinos.<br />
            Si pierdes 8 comidas o coges algo malo, ¡se acabó!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '240px' }}>
            <button onClick={startGame} style={{ ...btn, justifyContent: 'center' }}><Play size={16} fill="white" /> Empezar</button>
            <button onClick={onVolverAlListado} style={{ ...btnSec, justifyContent: 'center' }}>Volver atrás</button>
            <button onClick={() => setShowAjustes(v => !v)} style={{ ...btnSec, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Settings size={14} /> {showAjustes ? 'Cerrar ajustes' : 'Ajustes'}
            </button>
            {showAjustes && (
              <PanelSens
                gPct={globalSensPct ?? 50}
                onG={onGlobalSensChange}
                sPct={specificPct}
                onS={v => { setSpecificPct(v); localStorage.setItem('nuvia_fooddrop_specific_sens', String(v)); }}
                useS={useSpecific}
                onToggleS={() => { const n = !useSpecific; setUseSpecific(n); localStorage.setItem('nuvia_fooddrop_use_specific', String(n)); }}
              />
            )}
          </div>
          {record > 0 && <p style={{ marginTop: '14px', fontSize: '13px', color: '#64748b' }}>Récord: <strong style={{ color: 'var(--primary,#b05bb5)' }}>{record}</strong></p>}
        </div>
      )}

      {/* Pause overlay */}
      {phase === 'paused' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
          <h2 style={{ color: 'var(--primary,#b05bb5)', margin: '0 0 4px' }}>Pausa</h2>
          <p style={{ color: '#64748b', textAlign: 'center', fontSize: 14, margin: '0 0 14px' }}>¡Tómate un respiro!</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 240 }}>
            <button onClick={togglePause} style={btn}><Play size={16} fill="white" /> Reanudar</button>
            <button onClick={() => setShowAjustes(v => !v)} style={{ ...btnSec, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Settings size={14} /> {showAjustes ? 'Cerrar ajustes' : 'Ajustes'}
            </button>
            {showAjustes && (
              <PanelSens
                gPct={globalSensPct ?? 50}
                onG={onGlobalSensChange}
                sPct={specificPct}
                onS={v => { setSpecificPct(v); localStorage.setItem('nuvia_fooddrop_specific_sens', String(v)); }}
                useS={useSpecific}
                onToggleS={() => { const n = !useSpecific; setUseSpecific(n); localStorage.setItem('nuvia_fooddrop_use_specific', String(n)); }}
              />
            )}
            <button onClick={onVolverAlListado} style={btnSec}>Volver atrás</button>
            <button onClick={onSalir} style={btnSec}>Salir</button>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {phase === 'over' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 24, padding: '24px 24px 16px', width: 'min(82%,300px)', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <img src={SP.catch} alt="" style={{ width: 60, height: 68, objectFit: 'contain', marginBottom: 6 }} onError={e => e.currentTarget.style.display = 'none'} />
            <h2 style={{ margin: '0 0 4px', color: 'var(--primary,#b05bb5)', fontWeight: 800 }}>¡Se acabó!</h2>
            <div style={{ fontSize: 46, fontWeight: 800, color: '#1e293b', margin: '6px 0 2px' }}>{score}</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16 }}>Récord: {Math.max(score, record)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <button onClick={startGame} style={btn}><Play size={14} fill="white" /> Otra vez</button>
              <button onClick={onVolverAlListado} style={btnSec}>Volver atrás</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fdTip {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          75%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-16px); }
        }
      `}</style>
    </div>
  );
}
