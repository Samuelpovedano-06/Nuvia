import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bed, Bath, Gamepad2, Play, RefreshCw, Heart, Pause, X, Settings } from 'lucide-react';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';
import SkyJumpGame from './SkyJumpGame';
import SkyHopGame  from './SkyHopGame';

const JUEGO_ID = 'esquivar_compresas';
const RECORD_LOCAL_KEY = 'nuvia_esquivar_record';

const OvuloIcon = ({ size = 40, color = '#C084FC', opacity = 1 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ opacity }}>
    {/* Halo exterior (Zona Pelúcida) */}
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="0.5" strokeDasharray="2 1" opacity="0.5" />
    <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.2" opacity="0.8" />

    {/* Cuerpo del óvulo (Citoplasma) */}
    <circle cx="12" cy="12" r="6" fill={color} opacity="0.15" />

    {/* Núcleo con brillo */}
    <circle cx="12" cy="12" r="2.5" fill={color} opacity="0.4" stroke={color} strokeWidth="1" />
    <circle cx="11.2" cy="11.2" r="0.8" fill="white" opacity="0.9" />

    {/* Pequeños destellos de vitalidad */}
    <circle cx="17" cy="8" r="0.5" fill={color} />
    <circle cx="18.5" cy="12" r="0.7" fill={color} opacity="0.6" />
    <circle cx="7" cy="15" r="0.6" fill={color} opacity="0.8" />
  </svg>
);

// ─────────────────────── Habitaciones ───────────────────────
const HABITACIONES = [
  {
    id: 'sala',
    label: 'Jugar',
    icon: <Gamepad2 size={20} />,
    fondo: '/juego/sala.png',
    fondoFallback: 'linear-gradient(180deg, #FCE7F3 0%, #FBCFE8 60%, #F9A8D4 100%)',
  },
  {
    id: 'dormitorio',
    label: 'Dormitorio',
    icon: <Bed size={20} />,
    fondo: '/juego/dormitorio.png',
    fondoFallback: 'linear-gradient(180deg, #DDD6FE 0%, #C4B5FD 60%, #A78BFA 100%)',
  },
  {
    id: 'bano',
    label: 'Baño',
    icon: <Bath size={20} />,
    fondo: '/juego/bano.png',
    fondoFallback: 'linear-gradient(180deg, #BAE6FD 0%, #7DD3FC 60%, #38BDF8 100%)',
  },
];

// ─────────────────────── Sprites ───────────────────────
const SPRITE_IDLE = '/juego/mascota-idle.png';
const SPRITE_POR_SALTAR = '/juego/mascota-por-saltar.png';
const SPRITE_JUMP = '/juego/mascota-jump.png';
const SPRITE_CAIDA = '/juego/mascota-caida.png';
const SPRITE_COMPRESA = '/juego/compresa.png';
const SPRITE_FALLBACK = '/mascota-flotando.png';

// Tiempo de anticipación (frame "por saltar") antes del salto real
const DURACION_POR_SALTAR_MS = 140;
const DURACION_SALTO_MS = 600;

const MASCOTA_TAMANO = 140;        // tamaño en la habitación
const MASCOTA_TAMANO_JUEGO = 75;   // tamaño dentro del minijuego
const COMPRESA_TAMANO = 95;

export default function GameScreen({ onGameActiveChange }) {
  const navigate = useNavigate();
  const [habitacionId, setHabitacionId] = useState('sala');
  const [faseSalto, setFaseSalto] = useState('idle'); // 'idle' | 'por_saltar' | 'saltando'
  const [spriteOk, setSpriteOk] = useState({ idle: null, porSaltar: null, jump: null, caida: null, compresa: null });
  const [fondoOk, setFondoOk] = useState({});
  const [enJuego, setEnJuego] = useState(false);
  const [enSkyJump, setEnSkyJump] = useState(false);
  const [enSkyHop,  setEnSkyHop]  = useState(false);
  const [mostrarJuegos, setMostrarJuegos] = useState(false);
  const [mostrarColisiones, setMostrarColisiones] = useState(false);
  const [tiltSensPct, setTiltSensPct] = useState(() => Number(localStorage.getItem('nuvia_tilt_sens') || 50));
  const [showAjustes, setShowAjustes] = useState(false);

  const { user } = useContext(AuthContext);

  useEffect(() => {
    onGameActiveChange?.(enJuego || enSkyJump || enSkyHop);
  }, [enJuego, enSkyJump, enSkyHop]);

  useEffect(() => {
    ApiService.getPublicStatus()
      .then(res => {
        if (res && res.mostrar_colisiones && user?.rol === 'admin') {
          setMostrarColisiones(true);
        } else {
          setMostrarColisiones(false);
        }
      })
      .catch(err => console.error("Error al obtener config de colisiones:", err));
  }, [user]);

  const habitacion = HABITACIONES.find(h => h.id === habitacionId) || HABITACIONES[0];

  useEffect(() => {
    const check = (src) => new Promise(res => {
      const img = new Image();
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = src;
    });
    (async () => {
      const [idle, porSaltar, jump, caida, compresa] = await Promise.all([
        check(SPRITE_IDLE), check(SPRITE_POR_SALTAR), check(SPRITE_JUMP),
        check(SPRITE_CAIDA), check(SPRITE_COMPRESA)
      ]);
      setSpriteOk({ idle, porSaltar, jump, caida, compresa });
      const fondos = {};
      for (const h of HABITACIONES) {
        fondos[h.id] = await check(h.fondo);
      }
      setFondoOk(fondos);
    })();
  }, []);

  const onMascotaClick = () => {
    if (faseSalto !== 'idle') return;
    // Anticipación → salto → idle
    setFaseSalto('por_saltar');
    setTimeout(() => setFaseSalto('saltando'), DURACION_POR_SALTAR_MS);
    setTimeout(() => setFaseSalto('idle'), DURACION_POR_SALTAR_MS + DURACION_SALTO_MS);
  };

  const fondoUrl = fondoOk[habitacionId] ? habitacion.fondo : null;
  const spriteActual = (() => {
    if (faseSalto === 'por_saltar') return spriteOk.porSaltar ? SPRITE_POR_SALTAR : (spriteOk.idle ? SPRITE_IDLE : SPRITE_FALLBACK);
    if (faseSalto === 'saltando') return spriteOk.jump ? SPRITE_JUMP : SPRITE_FALLBACK;
    return spriteOk.idle ? SPRITE_IDLE : SPRITE_FALLBACK;
  })();

  // Si está jugando, mostramos solo el juego
  if (enJuego) {
    return (
      <EsquivarJuego
        onSalir={() => setEnJuego(false)}
        onVolverAlListado={() => {
          setEnJuego(false);
          setMostrarJuegos(true);
        }}
        spriteCaida={spriteOk.caida ? SPRITE_CAIDA : SPRITE_FALLBACK}
        spriteCompresa={spriteOk.compresa ? SPRITE_COMPRESA : null}
        mostrarColisiones={mostrarColisiones}
        globalSensPct={tiltSensPct}
        onGlobalSensChange={(v) => { setTiltSensPct(v); localStorage.setItem('nuvia_tilt_sens', String(v)); }}
      />
    );
  }

  if (enSkyJump) {
    return (
      <SkyJumpGame
        onSalir={() => setEnSkyJump(false)}
        onVolverAlListado={() => { setEnSkyJump(false); setMostrarJuegos(true); }}
        mostrarColisiones={mostrarColisiones}
        globalSensPct={tiltSensPct}
        onGlobalSensChange={(v) => { setTiltSensPct(v); localStorage.setItem('nuvia_tilt_sens', String(v)); }}
      />
    );
  }

  if (enSkyHop) {
    return (
      <SkyHopGame
        onSalir={() => setEnSkyHop(false)}
        onVolverAlListado={() => { setEnSkyHop(false); setMostrarJuegos(true); }}
        mostrarColisiones={mostrarColisiones}
      />
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: habitacion.fondoFallback,
      display: 'flex', flexDirection: 'column',
      zIndex: 1,
      overflow: 'hidden',
    }}>
      {/* Capa de fondo ampliada para que no queden huecos en las esquinas */}
      {fondoUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `url(${fondoUrl}) center/cover no-repeat`,
          transform: 'scale(1.35)',
          zIndex: -1,
        }} />
      )}

      {/* Header con botón volver + selector de habitaciones */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.8)', border: 'none',
            borderRadius: '12px', padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: '6px',
            color: 'var(--primary)', cursor: 'pointer', fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <ChevronLeft size={18} /> Volver
        </button>
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          padding: '6px',
          display: 'flex', gap: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}>
          {HABITACIONES.map(h => {
            const activa = h.id === habitacionId;
            return (
              <button
                key={h.id}
                onClick={() => setHabitacionId(h.id)}
                style={{
                  background: activa ? 'var(--primary)' : 'transparent',
                  color: activa ? 'white' : 'var(--text-light)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '8px 12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '56px',
                  fontWeight: 600,
                  fontSize: '11px',
                }}
              >
                {h.icon}
                <span>{h.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zona principal con la mascota */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: '120px',
      }}>
        <img
          src={spriteActual}
          alt="Nuvia"
          onClick={onMascotaClick}
          style={{
            width: `${MASCOTA_TAMANO}px`,
            height: `${MASCOTA_TAMANO}px`,
            objectFit: 'contain',
            cursor: 'pointer',
            userSelect: 'none',
            WebkitUserDrag: 'none',
            filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.25))',
            animation: faseSalto === 'saltando'
              ? `mascota-juego-salto ${DURACION_SALTO_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`
              : faseSalto === 'por_saltar'
                ? 'mascota-juego-prep 0.14s ease-out forwards'
                : 'mascota-juego-idle 2.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Botón interactivo sobre la caja morada (diseño de cubo 3D) */}
      {habitacionId === 'sala' && (
        <button
          onClick={() => setMostrarJuegos(true)}
          style={{
            position: 'absolute',
            top: '49%', left: '22%',
            width: 'calc(18% + 6px)', height: '14%',
            background: 'none', border: 'none',
            cursor: 'pointer',
            zIndex: 2,
            WebkitTapHighlightColor: 'transparent',
            transformStyle: 'preserve-3d',
            transform: 'perspective(2000px) rotateX(70deg) rotateZ(47deg)',
          }}
        >
          {/* Efecto de onda expansiva en perspectiva */}
          <div style={{
            position: 'absolute', inset: 0,
            borderLeft: 'none',
            borderBottom: '2px solid #ffffff',
            borderTop: 'none',
            borderRight: '2px solid #ffffff',
            borderRadius: '6px',
            transformOrigin: 'top left',
            animation: 'wave-animation 2s infinite cubic-bezier(0.36, 0.07, 0.19, 0.97)',
            pointerEvents: 'none',
          }} />
        </button>
      )}

      {/* Selector de Juegos */}
      {mostrarJuegos && (
        <Overlay>
          <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 0' }}>
            <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '22px' }}>Minijuegos</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setShowAjustes(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'white', border: '1.5px solid var(--primary)', borderRadius: '10px', padding: '6px 12px', fontSize: '13px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                <Settings size={14} /> Ajustes
              </button>
              <button onClick={() => setMostrarJuegos(false)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
                <X size={28} />
              </button>
            </div>
          </div>

          {showAjustes && (
            <div style={{ padding: '14px 24px 0', width: '100%', maxWidth: '400px' }}>
              <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>Sensibilidad al inclinar (todos los juegos)</span>
                <input
                  type="range" min="1" max="100" step="1"
                  value={tiltSensPct}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTiltSensPct(v);
                    localStorage.setItem('nuvia_tilt_sens', String(v));
                  }}
                  className="custom-range"
                  style={{ '--value': `${tiltSensPct}%` }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-light)' }}>
                  <span>Lento</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{tiltSensPct}%</span>
                  <span>Rápido</span>
                </div>
              </div>
            </div>
          )}

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', padding: '20px 24px 30px', width: '100%', maxWidth: '400px'
          }}>
            {/* Juego 1: Esquiva-compresas */}
            <div
              onClick={() => { setMostrarJuegos(false); setEnJuego(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '10px' }}
            >
              <img
                src="/juego/caratula-esquiva.png"
                alt="Esquiva-compresas"
                style={{ width: '100px', height: '100px', borderRadius: '22px', objectFit: 'cover', boxShadow: '0 8px 16px rgba(0,0,0,0.15)', border: '1.5px solid #ddd6fe' }}
              />
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px', textAlign: 'center', lineHeight: 1.2 }}>
                Esquiva<br />compresas
              </span>
            </div>

            {/* Juego 2: Sky Jump */}
            <div
              onClick={() => { setMostrarJuegos(false); setEnSkyJump(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '10px' }}
            >
              <div style={{
                width: '100px', height: '100px', borderRadius: '22px',
                background: 'linear-gradient(180deg, #BAE6FD 0%, #FBCFE8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)', border: '1.5px solid #ddd6fe', overflow: 'hidden',
              }}>
                <img src="/juego/Sky_Jump/plataforma.png" alt="" style={{ width: '70%', height: '70%', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }} onError={(e) => { e.currentTarget.outerHTML = '☁️'; }} />
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px', textAlign: 'center', lineHeight: 1.2 }}>
                Sky Jump
              </span>
            </div>

            {/* Juego 3: Sky Hop */}
            <div
              onClick={() => { setMostrarJuegos(false); setEnSkyHop(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '10px' }}
            >
              <div style={{
                width: '100px', height: '100px', borderRadius: '22px',
                background: 'linear-gradient(180deg, #BAE6FD 0%, #E0F2FE 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)', border: '1.5px solid #ddd6fe', overflow: 'hidden',
              }}>
                <img src="/juego/Sky_Jump/nube.png" alt="" style={{ width: '80%', height: '55%', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }} />
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px', textAlign: 'center', lineHeight: 1.2 }}>
                Sky Hop
              </span>
            </div>
          </div>
        </Overlay>
      )}

      <style>{`
        @keyframes mascota-juego-idle {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes mascota-juego-prep {
          0%   { transform: translateY(0) scaleY(1); }
          100% { transform: translateY(6px) scaleY(0.92); }
        }
        @keyframes mascota-juego-salto {
          0%   { transform: translateY(6px) scaleY(0.92); }
          15%  { transform: translateY(-30px) scale(1.04); }
          40%  { transform: translateY(-95px) scale(1.05); }
          70%  { transform: translateY(-70px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes wave-animation {
          0%   { transform: scale(0.95) translateZ(2px); opacity: 1; }
          100% { transform: scale(1.25) translateZ(2px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}


// ─── Panel sensibilidad reutilizable ───
function PanelSens({ gPct, onG, sPct, onS, useS, onToggleS, label }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Sección general — desactivada visualmente cuando hay específica activa */}
      <div style={{ opacity: useS ? 0.35 : 1, pointerEvents: useS ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>General</span>
          {useS && <span style={{ fontSize: '10px', color: 'var(--text-light)', fontStyle: 'italic' }}>no activa aquí</span>}
        </div>
        <input type="range" min="1" max="100" step="1" value={gPct} onChange={(e) => onG?.(Number(e.target.value))} className="custom-range" style={{ '--value': `${gPct}%` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-light)' }}>
          <span>Lento</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{gPct}%</span><span>Rápido</span>
        </div>
      </div>
      {/* Toggle específica */}
      <button onClick={onToggleS} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: useS ? 'var(--primary)' : 'white', color: useS ? 'white' : 'var(--primary)', border: '1.5px solid var(--primary)', borderRadius: '10px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
        {useS ? '✓ ' : ''}Específica {label}
      </button>
      {useS && <>
        <input type="range" min="1" max="100" step="1" value={sPct} onChange={(e) => onS(Number(e.target.value))} className="custom-range" style={{ '--value': `${sPct}%` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-light)' }}>
          <span>Lento</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{sPct}%</span><span>Rápido</span>
        </div>
      </>}
    </div>
  );
}

// ─────────────────────── Mini-juego: Esquivar compresas ───────────────────────
function EsquivarJuego({ onSalir, onVolverAlListado, spriteCaida, spriteCompresa, mostrarColisiones, globalSensPct, onGlobalSensChange }) {
  const areaRef = useRef(null);
  const [tamPantalla, setTamPantalla] = useState({ w: 360, h: 600 });
  const [estado, setEstado] = useState('inicio');  // 'inicio' | 'jugando' | 'pausa' | 'gameover'
  const [puntos, setPuntos] = useState(0);
  const [vidas, setVidas] = useState(3);
  const [recordLocal, setRecordLocal] = useState(() => Number(localStorage.getItem(RECORD_LOCAL_KEY) || 0));

  // Al montar, sincroniza con el récord del servidor (gana el mayor de los dos)
  useEffect(() => {
    (async () => {
      const records = await ApiService.getRecordsJuego();
      const enServidor = Number(records?.[JUEGO_ID] || 0);
      const enLocal = Number(localStorage.getItem(RECORD_LOCAL_KEY) || 0);
      const mejor = Math.max(enServidor, enLocal);
      setRecordLocal(mejor);
      localStorage.setItem(RECORD_LOCAL_KEY, String(mejor));
      // Si el local era mayor que el del servidor, sincroniza hacia arriba
      if (enLocal > enServidor) {
        ApiService.guardarRecordJuego(JUEGO_ID, enLocal);
      }
    })();
  }, []);

  // Estado del jugador y obstáculos en refs (para que el loop no se reinicie)
  const playerXRef = useRef(180);     // px desde el centro del player
  const playerVxRef = useRef(0);
  const obstaculosRef = useRef([]);   // [{ x, y, vy, w, h, id }]
  const ultimoSpawnRef = useRef(0);
  const ultimoTickRef = useRef(0);
  const idCounterRef = useRef(1);
  const tiltRef = useRef(0);
  const [specificSensPct, setSpecificSensPct] = useState(() => Number(localStorage.getItem('nuvia_compresas_specific_sens') || 50));
  const [useSpecific, setUseSpecific] = useState(() => localStorage.getItem('nuvia_compresas_use_specific') === 'true');
  const [showAjustes, setShowAjustes] = useState(false);
  const sensRef = useRef((useSpecific ? Number(localStorage.getItem('nuvia_compresas_specific_sens') || 50) : (globalSensPct ?? 50)));
  useEffect(() => {
    sensRef.current = useSpecific ? specificSensPct : (globalSensPct ?? 50);
  }, [globalSensPct, specificSensPct, useSpecific]);

  // Para forzar re-render del DOM con la posición actual sin reiniciar el loop
  const [, setRerender] = useState(0);

  // Medir el área de juego
  useEffect(() => {
    const medir = () => {
      if (areaRef.current) {
        const r = areaRef.current.getBoundingClientRect();
        setTamPantalla({ w: r.width, h: r.height });
        playerXRef.current = r.width / 2;
      }
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  // Escuchar acelerómetro / giroscopio
  useEffect(() => {
    const handleOrientation = (e) => {
      // gamma es la inclinación izq/der en grados (-90 a 90)
      tiltRef.current = e.gamma || 0;
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // Loop principal del juego
  useEffect(() => {
    if (estado !== 'jugando') return;
    let raf;
    const loop = (ts) => {
      if (!ultimoTickRef.current) ultimoTickRef.current = ts;
      const dt = Math.min(50, ts - ultimoTickRef.current);  // limitar dt para evitar saltos
      ultimoTickRef.current = ts;

      // Spawn de compresas (cadencia que aumenta con la puntuación)
      const cadencia = Math.max(450, 1200 - puntos * 8);  // ms entre spawns
      if (ts - ultimoSpawnRef.current > cadencia) {
        ultimoSpawnRef.current = ts;
        const x = Math.random() * (tamPantalla.w - COMPRESA_TAMANO);
        const vy = 0.18 + Math.random() * 0.12 + puntos * 0.002;  // px/ms
        obstaculosRef.current.push({
          id: idCounterRef.current++,
          x, y: tamPantalla.h,
          vy,
          w: COMPRESA_TAMANO, h: COMPRESA_TAMANO,
        });
      }

      // Controles: acelerómetro pisa el touch si hay
      if (Math.abs(tiltRef.current) > 2) {
        const TILT_FACTOR = 0.11 * Math.max(0.1, Math.min(2.0, sensRef.current / 50));
        const V_HORIZONTAL_MAX = 0.6;
        playerVxRef.current = Math.max(-V_HORIZONTAL_MAX, Math.min(V_HORIZONTAL_MAX, tiltRef.current * TILT_FACTOR));
      } else {
        playerVxRef.current *= 0.94;
      }

      // Aplicar movimiento
      playerXRef.current += playerVxRef.current * dt;
      playerXRef.current = Math.max(MASCOTA_TAMANO_JUEGO / 2, Math.min(tamPantalla.w - MASCOTA_TAMANO_JUEGO / 2, playerXRef.current));

      // Movimiento de obstáculos + colisiones
      const px = playerXRef.current;
      const py = tamPantalla.h * 0.25;
      const pw = MASCOTA_TAMANO_JUEGO * 0.6;
      const ph = MASCOTA_TAMANO_JUEGO * 0.8;
      const pBox = {
        x1: px - pw / 2, y1: py + (MASCOTA_TAMANO_JUEGO - ph) / 2,
        x2: px + pw / 2, y2: py + (MASCOTA_TAMANO_JUEGO + ph) / 2,
      };

      let golpe = false;
      obstaculosRef.current = obstaculosRef.current
        .map(o => ({ ...o, y: o.y - o.vy * dt }))
        .filter(o => {
          if (o.y < -o.h) {
            setPuntos(p => p + 1);  // esquivada → punto
            return false;
          }
          const oBox = { x1: o.x + 12, y1: o.y + 25, x2: o.x + o.w - 12, y2: o.y + o.h - 25 };
          const colision = !(pBox.x2 < oBox.x1 || pBox.x1 > oBox.x2 || pBox.y2 < oBox.y1 || pBox.y1 > oBox.y2);
          if (colision) {
            golpe = true;
            return false;
          }
          return true;
        });

      if (golpe) {
        setVidas(v => {
          const nv = v - 1;
          if (nv <= 0) {
            setEstado('gameover');
          }
          return nv;
        });
      }

      setRerender(r => r + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [estado, tamPantalla.w, tamPantalla.h, puntos]);

  // Guardar récord al hacer gameover: local + servidor
  useEffect(() => {
    if (estado === 'gameover' && puntos > recordLocal) {
      setRecordLocal(puntos);
      localStorage.setItem(RECORD_LOCAL_KEY, String(puntos));
      ApiService.guardarRecordJuego(JUEGO_ID, puntos);
    }
  }, [estado, puntos, recordLocal]);

  const empezar = () => {
    obstaculosRef.current = [];
    ultimoSpawnRef.current = 0;
    ultimoTickRef.current = 0;
    playerXRef.current = tamPantalla.w / 2;
    playerVxRef.current = 0;
    setPuntos(0);
    setVidas(3);
    setEstado('jugando');
  };

  const togglePausa = () => {
    if (estado === 'jugando') {
      setEstado('pausa');
    } else if (estado === 'pausa') {
      ultimoTickRef.current = 0; // Para que no dé un salto al reanudar
      setEstado('jugando');
    }
  };

  // Controles: arrastrar o pulsar para mover al jugador
  const onTouch = (e) => {
    if (estado !== 'jugando') return;
    const t = e.touches ? e.touches[0] : e;
    if (!areaRef.current) return;
    const r = areaRef.current.getBoundingClientRect();
    const x = t.clientX - r.left;
    const diff = x - playerXRef.current;
    const V_HORIZONTAL_MAX = 0.6;
    playerVxRef.current = Math.max(-V_HORIZONTAL_MAX, Math.min(V_HORIZONTAL_MAX, diff * 0.009));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(180deg, #DDD6FE 0%, #A78BFA 100%)',
      display: 'flex', flexDirection: 'column',
      zIndex: 1,
      userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: estado === 'inicio' ? 'none' : 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={onSalir}
          style={{
            background: 'rgba(255,255,255,0.9)', border: 'none',
            borderRadius: '12px', padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: '6px',
            color: 'var(--primary)', cursor: 'pointer', fontWeight: 600,
          }}
        >
          <ChevronLeft size={18} /> Salir
        </button>
        <div style={{
          background: 'rgba(255,255,255,0.92)', padding: '6px 12px',
          borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px',
          fontWeight: 700, color: 'var(--primary)',
        }}>
          {(estado === 'jugando' || estado === 'pausa') && (
            <button onClick={togglePausa} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--primary)' }}>
              {estado === 'pausa' ? <Play size={20} fill="var(--primary)" /> : <Pause size={20} fill="var(--primary)" />}
            </button>
          )}
          <span>🎯 {puntos}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            {Array.from({ length: vidas }).map((_, i) => (
              <Heart key={i} size={16} fill="#F6416C" color="#F6416C" />
            ))}
            {Array.from({ length: Math.max(0, 3 - vidas) }).map((_, i) => (
              <Heart key={`e-${i}`} size={16} color="#FBCFE8" />
            ))}
          </span>
        </div>
      </div>

      <div
        ref={areaRef}
        onTouchStart={onTouch}
        onTouchMove={onTouch}
        onMouseDown={onTouch}
        onMouseMove={(e) => { if (e.buttons === 1) onTouch(e); }}
        style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        {/* Compresas */}
        {/* Compresas */}
        {obstaculosRef.current.map(o => (
          spriteCompresa ? (
            <img
              key={o.id}
              src={spriteCompresa}
              alt=""
              style={{
                position: 'absolute',
                left: `${o.x}px`, top: `${o.y}px`,
                width: `${o.w}px`, height: `${o.h}px`,
                objectFit: 'contain',
                pointerEvents: 'none',
                filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.2))',
              }}
            />
          ) : (
            <div
              key={o.id}
              style={{
                position: 'absolute',
                left: `${o.x}px`, top: `${o.y}px`,
                width: `${o.w}px`, height: `${o.h}px`,
                background: 'white',
                borderRadius: '12px',
                border: '2px solid #F472B6',
                pointerEvents: 'none',
              }}
            />
          )
        ))}

        {/* Jugador */}
        <img
          src={spriteCaida}
          alt="Nuvia"
          style={{
            position: 'absolute',
            left: `${playerXRef.current - MASCOTA_TAMANO_JUEGO / 2}px`,
            top: '25%',
            width: `${MASCOTA_TAMANO_JUEGO}px`,
            height: `${MASCOTA_TAMANO_JUEGO}px`,
            objectFit: 'contain',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.25))',
          }}
        />

        {/* Hitbox del Jugador */}
        {mostrarColisiones && (
          <div
            style={{
              position: 'absolute',
              left: `${playerXRef.current - (MASCOTA_TAMANO_JUEGO * 0.6) / 2}px`,
              top: `${(tamPantalla.h * 0.25) + (MASCOTA_TAMANO_JUEGO * 0.1)}px`,
              width: `${MASCOTA_TAMANO_JUEGO * 0.6}px`,
              height: `${MASCOTA_TAMANO_JUEGO * 0.8}px`,
              border: '2px dashed #EF4444',
              background: 'rgba(239, 68, 68, 0.25)',
              pointerEvents: 'none',
              zIndex: 999,
              borderRadius: '4px',
            }}
          />
        )}

        {/* Hitbox de las Compresas */}
        {mostrarColisiones && obstaculosRef.current.map(o => (
          <div
            key={`hitbox-${o.id}`}
            style={{
              position: 'absolute',
              left: `${o.x + 12}px`,
              top: `${o.y + 25}px`,
              width: `${o.w - 24}px`,
              height: `${o.h - 50}px`,
              border: '2px dashed #EF4444',
              background: 'rgba(239, 68, 68, 0.25)',
              pointerEvents: 'none',
              zIndex: 999,
              borderRadius: '4px',
            }}
          />
        ))}

        {/* Pantalla de inicio */}
        {estado === 'inicio' && (
          <Overlay>
            <h2 style={{ color: 'var(--primary)', margin: 0 }}>Esquiva-compresas</h2>
            <p style={{ color: 'var(--text-light)', textAlign: 'center', fontSize: '14px', margin: '8px 24px 18px' }}>
              Mueve a Nuvia con el dedo y esquiva las compresas que caen.
              Cada una esquivada te da un punto. ¡Tienes 3 vidas!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px', width: '100%', maxWidth: '220px' }}>
              <button onClick={empezar} style={{ ...botonPrincipal, justifyContent: 'center' }}>
                <Play size={18} fill="white" /> Empezar
              </button>
              <button onClick={onVolverAlListado} style={{ ...botonPrincipal, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
                Volver atrás
              </button>
              <button onClick={() => setShowAjustes(v => !v)} style={{ ...botonPrincipal, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
                <Settings size={16} /> {showAjustes ? 'Cerrar ajustes' : 'Ajustes'}
              </button>
              {showAjustes && <PanelSens gPct={globalSensPct ?? 50} onG={onGlobalSensChange} sPct={specificSensPct} onS={(v) => { setSpecificSensPct(v); localStorage.setItem('nuvia_compresas_specific_sens', String(v)); }} useS={useSpecific} onToggleS={() => { const n = !useSpecific; setUseSpecific(n); localStorage.setItem('nuvia_compresas_use_specific', String(n)); }} label="Compresas" />}
            </div>
            {recordLocal > 0 && (
              <p style={{ marginTop: '14px', fontSize: '13px', color: 'var(--text-light)' }}>
                Récord: <strong style={{ color: 'var(--primary)' }}>{recordLocal}</strong>
              </p>
            )}
          </Overlay>
        )}

        {/* Pantalla de pausa */}
        {estado === 'pausa' && (
          <Overlay>
            <h2 style={{ color: 'var(--primary)', margin: 0 }}>Pausa</h2>
            <p style={{ color: 'var(--text-light)', textAlign: 'center', fontSize: '14px', margin: '8px 24px 18px' }}>
              Tómate un respiro.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px', width: '100%', maxWidth: '240px' }}>
              <button onClick={togglePausa} style={{ ...botonPrincipal, justifyContent: 'center' }}>
                <Play size={18} fill="white" /> Reanudar
              </button>
              <button onClick={() => setShowAjustes(v => !v)} style={{ ...botonPrincipal, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
                <Settings size={16} /> {showAjustes ? 'Cerrar ajustes' : 'Ajustes'}
              </button>
              {showAjustes && <PanelSens gPct={globalSensPct ?? 50} onG={onGlobalSensChange} sPct={specificSensPct} onS={(v) => { setSpecificSensPct(v); localStorage.setItem('nuvia_compresas_specific_sens', String(v)); }} useS={useSpecific} onToggleS={() => { const n = !useSpecific; setUseSpecific(n); localStorage.setItem('nuvia_compresas_use_specific', String(n)); }} label="Compresas" />}
              <button onClick={onVolverAlListado} style={{ ...botonPrincipal, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
                Volver atrás
              </button>
              <button onClick={onSalir} style={{ ...botonPrincipal, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
                Salir
              </button>
            </div>
          </Overlay>
        )}

        {/* Pantalla de game over */}
        {estado === 'gameover' && (
          <Overlay>
            <h2 style={{ color: 'var(--primary)', margin: 0 }}>¡Ay! 💔</h2>
            <p style={{ color: 'var(--text-light)', textAlign: 'center', fontSize: '14px', margin: '8px 24px 4px' }}>
              Has esquivado <strong style={{ color: 'var(--primary)' }}>{puntos}</strong> compresas.
            </p>
            {puntos >= recordLocal && puntos > 0 && (
              <p style={{ margin: 0, fontSize: '13px', color: '#F6416C', fontWeight: 700 }}>
                ¡Nuevo récord!
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px', width: '100%', maxWidth: '240px' }}>
              <button onClick={empezar} style={{ ...botonPrincipal, justifyContent: 'center' }}>
                <RefreshCw size={18} /> Otra vez
              </button>
              <button onClick={() => setShowAjustes(v => !v)} style={{ ...botonPrincipal, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
                <Settings size={16} /> {showAjustes ? 'Cerrar ajustes' : 'Ajustes'}
              </button>
              {showAjustes && <PanelSens gPct={globalSensPct ?? 50} onG={onGlobalSensChange} sPct={specificSensPct} onS={(v) => { setSpecificSensPct(v); localStorage.setItem('nuvia_compresas_specific_sens', String(v)); }} useS={useSpecific} onToggleS={() => { const n = !useSpecific; setUseSpecific(n); localStorage.setItem('nuvia_compresas_use_specific', String(n)); }} label="Compresas" />}
              <button onClick={onVolverAlListado} style={{ ...botonPrincipal, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
                Volver atrás
              </button>
              <button onClick={onSalir} style={{ ...botonPrincipal, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
                Salir
              </button>
            </div>
          </Overlay>
        )}
      </div>
    </div>
  );
}

const botonPrincipal = {
  background: 'var(--primary)', color: 'white', border: 'none',
  borderRadius: '999px', padding: '12px 24px',
  fontSize: '15px', fontWeight: 700,
  display: 'flex', alignItems: 'center', gap: '8px',
  cursor: 'pointer',
  boxShadow: '0 6px 16px rgba(176, 91, 181, 0.4)',
};

const Overlay = ({ children }) => (
  <div style={{
    position: 'absolute', inset: 0,
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  }}>
    {children}
  </div>
);
