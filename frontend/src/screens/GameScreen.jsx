import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bed, Bath, Gamepad2, Play, RefreshCw, Heart, Pause, X, Settings, Zap } from 'lucide-react';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';
import SkyJumpGame   from './SkyJumpGame';
import SkyHopGame    from './SkyHopGame';
import FoodDropGame  from './FoodDropGame';
import CliffJumpGame from './CliffJumpGame';
import CliffDashGame from './CliffDashGame';
import TumbleGame      from './TumbleGame';
import HillDriveGame   from './HillDriveGame';
import DormitorioSection, { ACCESORIOS } from '../components/DormitorioSection';
import SheepCountingGame from './SheepCountingGame';
import AccesorioOverlay, { TrajeMarineroOverlay } from '../components/AccesorioOverlay';


import { sumarMoneda, CoinIcon } from '../utils/coinHelper';
import { getOutfitSprite } from '../utils/outfitSprites';

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
  const [enJuego,    setEnJuego]    = useState(false);
  const [enSkyJump,  setEnSkyJump]  = useState(false);
  const [enSkyHop,   setEnSkyHop]   = useState(false);
  const [enFoodDrop,   setEnFoodDrop]   = useState(false);
  const [enCliffJump,  setEnCliffJump]  = useState(false);
  const [enCliffDash,  setEnCliffDash]  = useState(false);
  const [enTumble,     setEnTumble]     = useState(false);
  const [enHillDrive,  setEnHillDrive]  = useState(false);
  const [enSheepCounting, setEnSheepCounting] = useState(false);
  const [modoNoche, setModoNoche] = useState(false);
  const [accesorioEquipado, setAccesorioEquipado] = useState(() => localStorage.getItem('nuvia_mascot_outfit') || 'ninguno');
  const [userCoins, setUserCoins] = useState(() => Number(localStorage.getItem('nuvia_user_coins') || 50));
  const [userEnergy, setUserEnergy] = useState(() => Number(localStorage.getItem('nuvia_mascot_energy') || 75));
  const [accesorioLado, setAccesorioLado] = useState(() => localStorage.getItem('nuvia_accesorio_lado') || 'derecha');

  useEffect(() => {
    const syncStats = () => {
      setUserCoins(Number(localStorage.getItem('nuvia_user_coins') || 50));
      setUserEnergy(Number(localStorage.getItem('nuvia_mascot_energy') || 75));
      setAccesorioLado(localStorage.getItem('nuvia_accesorio_lado') || 'derecha');
      setAccesorioEquipado(localStorage.getItem('nuvia_mascot_outfit') || 'ninguno');
    };

    window.addEventListener('nuvia_coins_updated', syncStats);
    window.addEventListener('nuvia_energy_updated', syncStats);
    window.addEventListener('nuvia_accesorio_lado_updated', syncStats);
    window.addEventListener('nuvia_outfit_synced', syncStats);
    const interval = setInterval(syncStats, 1500);

    return () => {
      window.removeEventListener('nuvia_coins_updated', syncStats);
      window.removeEventListener('nuvia_energy_updated', syncStats);
      window.removeEventListener('nuvia_accesorio_lado_updated', syncStats);
      window.removeEventListener('nuvia_outfit_synced', syncStats);
      clearInterval(interval);
    };
  }, []);
  const [mostrarJuegos, setMostrarJuegos] = useState(false);
  const [mostrarPorcentajeEnergia, setMostrarPorcentajeEnergia] = useState(false);
  const [mostrarColisiones, setMostrarColisiones] = useState(false);
  const [tiltSensPct, setTiltSensPct] = useState(() => Number(localStorage.getItem('nuvia_tilt_sens') || 50));
  const [showAjustes, setShowAjustes] = useState(false);


  const { user } = useContext(AuthContext);

  // Mantiene fresca la marca de tiempo de "última actividad" mientras GameScreen esté
  // montado (incluye estar dentro de cualquier minijuego), no solo cuando se ve el
  // Dormitorio. Si no se refresca aquí, al volver de un minijuego DormitorioSection
  // recalcula la energía creyendo que el tiempo jugado fue tiempo fuera de la app,
  // y guarda ese valor erróneo en la base de datos.
  useEffect(() => {
    localStorage.setItem('nuvia_last_energy_timestamp', String(Date.now()));
    const interval = setInterval(() => {
      localStorage.setItem('nuvia_last_energy_timestamp', String(Date.now()));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const inAnyGame = enJuego || enSkyJump || enSkyHop || enFoodDrop || enCliffJump || enCliffDash || enTumble || enHillDrive || enSheepCounting;


  useEffect(() => {
    onGameActiveChange?.(inAnyGame);
  }, [inAnyGame]);

  // Botón físico "atrás" del móvil: salir del juego limpiamente para que la barra inferior reaparezca
  useEffect(() => {
    if (!inAnyGame) return;
    window.history.pushState({ nuviaGame: true }, '');
    const onPop = () => {
      setEnJuego(false);
      setEnSkyJump(false);
      setEnSkyHop(false);
      setEnFoodDrop(false);
      setEnCliffJump(false);
      setEnCliffDash(false);
      setEnTumble(false);
      setEnHillDrive(false);
      setEnSheepCounting(false);
      setMostrarJuegos(true);

    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [inAnyGame]);

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

  const consumirEnergia = (cantidad = 15) => {
    const cur = Number(localStorage.getItem('nuvia_mascot_energy') || 75);
    const next = Math.max(0, cur - cantidad);
    localStorage.setItem('nuvia_mascot_energy', String(next));
    localStorage.setItem('nuvia_last_energy_timestamp', String(Date.now()));
    setUserEnergy(next);
    // Se guarda directo en el servidor aquí (no solo al volver al Dormitorio)
    // para que la energía gastada en cualquier minijuego viaje entre dispositivos.
    ApiService.guardarEnergia(next).catch(() => {});
  };

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
      fondos['durmiendo'] = await check('/juego/durmiendo.png');
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

  const fondoUrl = (() => {
    if (habitacionId === 'dormitorio' && modoNoche) {
      return fondoOk['durmiendo'] ? '/juego/durmiendo.png' : habitacion.fondo;
    }
    return fondoOk[habitacionId] ? habitacion.fondo : null;
  })();
  // La ropa equipada va dibujada directamente en variantes de cada pose
  // (mascota-idle-rayas.png, mascota-jump-rayas.png, ...) en vez de un
  // emoji flotando encima.
  const spriteIdleActual = getOutfitSprite('idle', SPRITE_IDLE);
  const spriteActual = (() => {
    if (faseSalto === 'por_saltar') return spriteOk.porSaltar ? SPRITE_POR_SALTAR : (spriteOk.idle ? spriteIdleActual : SPRITE_FALLBACK);
    if (faseSalto === 'saltando') return spriteOk.jump ? getOutfitSprite('jump', SPRITE_JUMP) : SPRITE_FALLBACK;
    return spriteOk.idle ? spriteIdleActual : SPRITE_FALLBACK;
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

  if (enFoodDrop) {
    return (
      <FoodDropGame
        onSalir={() => setEnFoodDrop(false)}
        onVolverAlListado={() => { setEnFoodDrop(false); setMostrarJuegos(true); }}
        mostrarColisiones={mostrarColisiones}
        globalSensPct={tiltSensPct}
        onGlobalSensChange={(v) => { setTiltSensPct(v); localStorage.setItem('nuvia_tilt_sens', String(v)); }}
      />
    );
  }

  if (enCliffJump) {
    return (
      <CliffJumpGame
        onSalir={() => setEnCliffJump(false)}
        onVolverAlListado={() => { setEnCliffJump(false); setMostrarJuegos(true); }}
        mostrarColisiones={mostrarColisiones}
      />
    );
  }

  if (enCliffDash) {
    return (
      <CliffDashGame
        onSalir={() => setEnCliffDash(false)}
        onVolverAlListado={() => { setEnCliffDash(false); setMostrarJuegos(true); }}
        mostrarColisiones={mostrarColisiones}
      />
    );
  }

  if (enTumble) {
    return (
      <TumbleGame
        onSalir={() => setEnTumble(false)}
        onVolverAlListado={() => { setEnTumble(false); setMostrarJuegos(true); }}
        mostrarColisiones={mostrarColisiones}
        globalSensPct={tiltSensPct}
      />
    );
  }

  if (enHillDrive) {
    return (
      <HillDriveGame
        onSalir={() => setEnHillDrive(false)}
        onVolverAlListado={() => { setEnHillDrive(false); setMostrarJuegos(true); }}
      />
    );
  }

  if (enSheepCounting) {
    return (
      <SheepCountingGame
        onSalir={() => {
          setUserCoins(Number(localStorage.getItem('nuvia_user_coins') || 50));
          setEnSheepCounting(false);
        }}
        onVolverAlListado={() => {
          setUserCoins(Number(localStorage.getItem('nuvia_user_coins') || 50));
          setEnSheepCounting(false);
          setMostrarJuegos(true);
        }}
        onGanarMonedas={(cant) => {
          setUserCoins(prev => prev + cant);
        }}
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
        padding: '12px 16px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        position: 'relative',
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.85)', border: 'none',
            borderRadius: '14px', padding: '0 14px',
            display: 'flex', alignItems: 'center', gap: '5px',
            color: 'var(--primary)', cursor: 'pointer', fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: '13px',
            height: '42px',
          }}
        >
          <ChevronLeft size={18} /> Volver
        </button>

        {/* Selector de habitaciones */}
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          padding: '4px',
          display: 'flex', gap: '3px',
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
                  padding: '6px 10px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '50px',
                  fontWeight: 600,
                  fontSize: '10px',
                }}
              >
                {h.icon}
                <span>{h.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Marcadores Estilo Pou con Colores y Logo de Nuvia (Debajo de 'Volver', arriba a la izquierda - Visible en TODAS las vistas) */}
      <div style={{
        position: 'absolute',
        top: '66px',
        left: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        zIndex: 10
      }}>
        {/* Monedas Estilo Pou */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F3E8FF 100%)',
            border: '3px solid #000000',
            boxShadow: '0 3px 0 #000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            flexShrink: 0
          }}>
            <img
              src="/logo.png"
              alt="Nuvia Logo"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <span style={{
            fontSize: '16px',
            fontWeight: 900,
            color: '#FFFFFF',
            textShadow: '1px 1px 0 #000000, -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 0 0 #000000, -1px 0 0 #000000, 0 1px 0 #000000, 0 -1px 0 #000000',
            fontFamily: 'system-ui, sans-serif',
            marginTop: '2px'
          }}>
            {userCoins}
          </span>
        </div>

        {/* Estadística de Energía Estilo Pou */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', position: 'relative' }}>
          <div
            onClick={() => setMostrarPorcentajeEnergia(v => !v)}
            title="Toca para ver el porcentaje de energía"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#2D1436',
              border: '3px solid #000000',
              boxShadow: '0 3px 0 #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden',
              flexShrink: 0
            }}
          >
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${userEnergy}%`,
              background: userEnergy > 50
                ? 'linear-gradient(180deg, #EC4899 0%, #A855F7 100%)'
                : 'linear-gradient(180deg, #EF4444 0%, #F59E0B 100%)',
              transition: 'height 0.5s ease-in-out'
            }} />

            <span style={{
              fontSize: '20px',
              color: '#FFFFFF',
              position: 'relative',
              zIndex: 2,
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))'
            }}>
              ⚡
            </span>
          </div>

          {mostrarPorcentajeEnergia && (
            <span style={{
              fontSize: '14px',
              fontWeight: 900,
              color: '#FFFFFF',
              textShadow: '1px 1px 0 #000000, -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 0 0 #000000, -1px 0 0 #000000, 0 1px 0 #000000, 0 -1px 0 #000000',
              fontFamily: 'system-ui, sans-serif',
              marginTop: '2px',
              animation: 'fadeIn 0.15s ease-out'
            }}>
              {userEnergy}%
            </span>
          )}
        </div>
      </div>

      {/* Zona principal con la mascota */}
      {(() => {
        const isDurmiendoEnCama = habitacionId === 'dormitorio' && modoNoche;
        if (isDurmiendoEnCama) {
          // Con la luz apagada (modo sueño) se muestra la imagen durmiendo.png donde Nuvia ya está durmiendo en la cama
          return <div style={{ flex: 1 }} />;
        }
        return (
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: habitacionId === 'dormitorio' ? '165px' : '120px',
            position: 'relative'
          }}>
            {/* Contenedor animado de la mascota + su accesorio */}
            <div
              onClick={onMascotaClick}
              style={{
                position: 'relative',
                display: 'inline-block',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserDrag: 'none',
                animation: faseSalto === 'saltando'
                  ? `mascota-juego-salto ${DURACION_SALTO_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`
                  : faseSalto === 'por_saltar'
                    ? 'mascota-juego-prep 0.14s ease-out forwards'
                    : 'mascota-juego-idle 2.5s ease-in-out infinite',
              }}
            >
              <img
                src={spriteActual}
                alt="Nuvia"
                style={{
                  width: `${MASCOTA_TAMANO}px`,
                  height: `${MASCOTA_TAMANO}px`,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.25))',
                }}
              />

              {/* Accesorio equipado perfectamente posicionado en Nuvia */}
              {accesorioEquipado && accesorioEquipado !== 'ninguno' && (() => {
                const acc = ACCESORIOS.find(a => a.id === accesorioEquipado);
                if (!acc) return null;

                if (acc.id === 'zapatillas_conejo') {
                  return (
                    <>
                      <div style={{
                        position: 'absolute',
                        bottom: '14px',
                        left: '36px',
                        fontSize: '22px',
                        pointerEvents: 'none',
                        zIndex: 5,
                        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))',
                        transform: 'scaleX(-1)'
                      }}>
                        🐰
                      </div>
                      <div style={{
                        position: 'absolute',
                        bottom: '14px',
                        right: '36px',
                        fontSize: '22px',
                        pointerEvents: 'none',
                        zIndex: 5,
                        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))'
                      }}>
                        🐰
                      </div>
                    </>
                  );
                }

                if (acc.id === 'traje_marinero') {
                  return <TrajeMarineroOverlay width={86} height={56} top="70px" />;
                }

                // La camiseta de rayas va dibujada directamente en mascota-idle-rayas.png
                if (acc.id === 'camiseta_rayas') return null;

                // El conjunto de invierno solo tiene arte propio para caminar
                // (mascota-walk-invierno.png); en la pose quieta se superpone
                // el gorro como icono, igual que corona_flores.
                if (acc.id === 'conjunto_invierno') {
                  return (
                    <img
                      src="/conjunto-invierno-icono.png"
                      alt=""
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '34px',
                        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))',
                        pointerEvents: 'none',
                        zIndex: 5,
                      }}
                    />
                  );
                }

                let positionStyle = { top: '2px', left: '50%', transform: 'translateX(-50%)', fontSize: '34px' };
                if (acc.id === 'antifaz') {
                  positionStyle = { top: '2px', left: '50%', transform: 'translateX(-50%)', fontSize: '78px' };
                } else if (acc.id === 'lazo_rosa') {
                  if (accesorioLado === 'izquierda') {
                    positionStyle = { top: '20px', left: '22px', fontSize: '32px', transform: 'rotate(-10deg)' };
                  } else {
                    positionStyle = { top: '20px', right: '22px', fontSize: '32px', transform: 'rotate(10deg)' };
                  }
                } else if (acc.id === 'corona_flores') {
                  positionStyle = { top: '-6px', left: '50%', transform: 'translateX(-50%)', fontSize: '34px' };
                }

                return (
                  <div style={{
                    position: 'absolute',
                    ...positionStyle,
                    filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))',
                    pointerEvents: 'none',
                    zIndex: 5,
                  }}>
                    {acc.icono}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Sección del Dormitorio (Lámpara, Armario, Sonidos, Té, Ovejitas) */}
      {habitacionId === 'dormitorio' && (
        <DormitorioSection
          modoNoche={modoNoche}
          setModoNoche={setModoNoche}
          onAbrirContarOvejas={() => {
            setEnSheepCounting(true);
          }}
          equiparAccesorio={(accId) => {
            setAccesorioEquipado(accId);
            localStorage.setItem('nuvia_mascot_outfit', accId);
          }}
          accesorioEquipado={accesorioEquipado}
          userCoins={userCoins}
          setUserCoins={setUserCoins}
        />
      )}


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
        <Overlay style={{ overflowY: 'auto', paddingBottom: '70px', justifyContent: 'flex-start' }}>
          <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
            <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '20px' }}>Minijuegos</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setShowAjustes(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'white', border: '1.5px solid var(--primary)', borderRadius: '10px', padding: '5px 10px', fontSize: '12px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                <Settings size={14} /> Ajustes
              </button>
              <button onClick={() => setMostrarJuegos(false)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
                <X size={26} />
              </button>
            </div>
          </div>

          {showAjustes && (
            <div style={{ padding: '10px 20px 0', width: '100%', maxWidth: '360px' }}>
              <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '14px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>Sensibilidad al inclinar (todos los juegos)</span>
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

          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 16px', padding: '12px 20px 20px', width: '100%', maxWidth: '380px'
          }}>
            {/* Juego 1: Esquiva-compresas */}
            <div
              onClick={() => { consumirEnergia(15); setMostrarJuegos(false); setEnJuego(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '6px' }}
            >
              <img
                src="/juego/caratula-esquiva.png"
                alt="Esquiva-compresas"
                style={{ width: '90px', height: '90px', borderRadius: '20px', objectFit: 'cover', boxShadow: '0 6px 16px rgba(0,0,0,0.13)', border: '1.5px solid #ddd6fe' }}
              />
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px', textAlign: 'center', lineHeight: 1.18 }}>
                Esquiva<br />compresas
              </span>
            </div>

            {/* Juego 2: Sky Jump */}
            <div
              onClick={() => { consumirEnergia(15); setMostrarJuegos(false); setEnSkyJump(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '6px' }}
            >
              <div style={{
                width: '90px', height: '90px', borderRadius: '20px',
                background: 'linear-gradient(180deg, #BAE6FD 0%, #FBCFE8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(0,0,0,0.13)', border: '1.5px solid #ddd6fe', overflow: 'hidden',
              }}>
                <img src="/juego/Sky_Jump/plataforma.png" alt="" style={{ width: '70%', height: '70%', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }} onError={(e) => { e.currentTarget.outerHTML = '☁️'; }} />
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px', textAlign: 'center', lineHeight: 1.18 }}>
                Sky Jump
              </span>
            </div>

            {/* Juego 3: Sky Hop */}
            <div
              onClick={() => { consumirEnergia(15); setMostrarJuegos(false); setEnSkyHop(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '6px' }}
            >
              <div style={{
                width: '90px', height: '90px', borderRadius: '20px',
                background: 'linear-gradient(180deg, #BAE6FD 0%, #E0F2FE 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(0,0,0,0.13)', border: '1.5px solid #ddd6fe', overflow: 'hidden',
              }}>
                <img src="/juego/Sky_Jump/nube.png" alt="" style={{ width: '80%', height: '55%', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }} />
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px', textAlign: 'center', lineHeight: 1.18 }}>
                Sky Hop
              </span>
            </div>

            {/* Juego 4: Food Drop */}
            <div
              onClick={() => { consumirEnergia(15); setMostrarJuegos(false); setEnFoodDrop(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '6px' }}
            >
              <div style={{
                width: '90px', height: '90px', borderRadius: '20px',
                background: 'linear-gradient(180deg, #FDF2F8 0%, #FCE7F3 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(0,0,0,0.13)', border: '1.5px solid #fbcfe8', overflow: 'hidden',
              }}>
                <img src="/juego/Food_Drop/chocolate.png" alt="" style={{ width: '60%', height: '60%', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}
                     onError={e => { e.currentTarget.outerHTML = '<span style="font-size:36px">🍫</span>'; }} />
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px', textAlign: 'center', lineHeight: 1.18 }}>
                Food Drop
              </span>
            </div>

            {/* Juego 5: Cliff Jump */}
            <div
              onClick={() => { consumirEnergia(15); setMostrarJuegos(false); setEnCliffJump(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '6px' }}
            >
              <div style={{
                width: '90px', height: '90px', borderRadius: '20px',
                background: 'linear-gradient(180deg, #5b8fd4 0%, #87ceeb 60%, #a8d8f0 100%)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.13)', border: '1.5px solid #bae6fd',
                overflow: 'hidden', position: 'relative',
              }}>
                {/* Mascota saltando */}
                <img src="/juego/mascota-jump.png" alt=""
                  style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', width: '44px', height: '44px', objectFit: 'contain', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))', zIndex: 2 }}
                  onError={e => { e.currentTarget.style.display = 'none'; }} />
                {/* Plataforma izquierda */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '42%', zIndex: 1 }}>
                  <div style={{ height: '9px', background: 'linear-gradient(180deg,#72c242,#4a9a28)', borderRadius: '3px 0 0 0' }} />
                  <div style={{ height: '20px', background: 'linear-gradient(180deg,#9b6b3a,#6b4020)' }} />
                </div>
                {/* Plataforma derecha */}
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '42%', zIndex: 1 }}>
                  <div style={{ height: '9px', background: 'linear-gradient(180deg,#72c242,#4a9a28)', borderRadius: '0 3px 0 0' }} />
                  <div style={{ height: '20px', background: 'linear-gradient(180deg,#9b6b3a,#6b4020)' }} />
                </div>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px', textAlign: 'center', lineHeight: 1.18 }}>
                Cliff Jump
              </span>
            </div>

            {/* Juego 6: Cliff Dash */}
            <div
              onClick={() => { consumirEnergia(15); setMostrarJuegos(false); setEnCliffDash(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '6px' }}
            >
              <div style={{
                width: '90px', height: '90px', borderRadius: '20px',
                background: 'linear-gradient(180deg, #b5479a 0%, #d66b93 60%, #f3a8d8 100%)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.13)', border: '1.5px solid #f3c6e6',
                overflow: 'hidden', position: 'relative',
              }}>
                {/* Cielo */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#87d9f5,#b8e9fa)' }} />
                {/* 3 carriles horizontales apilados */}
                <div style={{ position: 'absolute', top: '24px', left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg,#ffd35c,#ffa733)' }} />
                <div style={{ position: 'absolute', top: '24px', left: 0, right: 0, height: '2.5px', background: '#3fae1f' }} />
                <div style={{ position: 'absolute', top: '48px', left: 0, right: 0, height: '2.5px', background: '#3fae1f' }} />
                <div style={{ position: 'absolute', top: '72px', left: 0, right: 0, height: '2.5px', background: '#3fae1f' }} />
                {/* Compresa obstáculo */}
                <img src="/juego/compresa.png" alt=""
                  style={{ position: 'absolute', top: '8px', right: '10px', width: '20px', height: '18px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                  onError={e => { e.currentTarget.style.display = 'none'; }} />
                {/* Mascota */}
                <img src="/juego/mascota-idle.png" alt=""
                  style={{ position: 'absolute', top: '48px', left: '14px', width: '28px', height: '28px', objectFit: 'contain', transform: 'translateY(-100%)', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))', zIndex: 2 }}
                  onError={e => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px', textAlign: 'center', lineHeight: 1.18 }}>
                Cliff Dash
              </span>
            </div>

            {/* Juego 7: Tumble */}
            <div
              onClick={() => { consumirEnergia(15); setMostrarJuegos(false); setEnTumble(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '6px' }}
            >
              <div style={{
                width: '90px', height: '90px', borderRadius: '20px',
                background: 'linear-gradient(180deg, #6fc9ec 0%, #a7e1f4 100%)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.13)', border: '1.5px solid #bae6fd',
                overflow: 'hidden', position: 'relative',
              }}>
                {/* Roca */}
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '20px', height: '18px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #9ca3af, #4b5563)' }} />
                {/* Tronco */}
                <div style={{ position: 'absolute', bottom: '14px', right: '7px', width: '26px', height: '11px', borderRadius: '6px', background: 'linear-gradient(180deg,#a0714a,#6b4020)' }} />
                {/* Mascota rodando */}
                <img src="/juego/mascota-idle.png" alt=""
                  style={{ position: 'absolute', top: '26px', left: '50%', width: '32px', height: '32px', objectFit: 'contain', transform: 'translateX(-50%) rotate(25deg)', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))', zIndex: 2 }}
                  onError={e => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px', textAlign: 'center', lineHeight: 1.18 }}>
                Tumble
              </span>
            </div>

            {/* Juego 8: Hill Drive */}
            <div
              onClick={() => { consumirEnergia(15); setMostrarJuegos(false); setEnHillDrive(true); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '6px' }}
            >
              <div style={{
                width: '90px', height: '90px', borderRadius: '20px',
                background: 'linear-gradient(180deg, #87ceeb 0%, #4CAF50 70%, #2E7D32 100%)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.13)', border: '1.5px solid #a5d6a7',
                overflow: 'hidden', position: 'relative',
              }}>
                {/* Cielo */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(180deg,#87ceeb,#c8e6f5)' }} />
                {/* Colinas onduladas en SVG */}
                <svg style={{ position: 'absolute', bottom: 0, width: '100%', height: '65%' }} viewBox="0 0 100 60" preserveAspectRatio="none">
                  <path d="M0,40 Q15,18 30,34 Q45,10 60,28 Q75,8 90,22 L100,30 L100,60 L0,60Z" fill="#4CAF50"/>
                  <path d="M0,50 Q20,35 40,45 Q60,32 80,42 L100,38 L100,60 L0,60Z" fill="#2E7D32"/>
                </svg>
                {/* Coche pixel en miniatura */}
                <div style={{ position: 'absolute', bottom: '26px', left: '24px', width: '40px', height: '18px', zIndex: 2 }}>
                  {/* Carrocería */}
                  <div style={{ position: 'absolute', bottom: '7px', left: 0, right: 0, height: '9px', background: 'linear-gradient(135deg,#E91E8C,#880E4F)', borderRadius: '5px 5px 2px 2px' }} />
                  {/* Techo */}
                  <div style={{ position: 'absolute', bottom: '15px', left: '7px', right: '7px', height: '7px', background: '#F48FB1', borderRadius: '4px 4px 0 0' }} />
                  {/* Rueda trasera */}
                  <div style={{ position: 'absolute', bottom: '1px', right: '3px', width: '9px', height: '9px', borderRadius: '50%', background: '#1a1a1a', border: '1.5px solid #78909C' }} />
                  {/* Rueda delantera */}
                  <div style={{ position: 'absolute', bottom: '1px', left: '3px', width: '9px', height: '9px', borderRadius: '50%', background: '#1a1a1a', border: '1.5px solid #78909C' }} />
                </div>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px', textAlign: 'center', lineHeight: 1.18 }}>
                Hill Drive
              </span>
            </div>
          </div>
          </div>
        </Overlay>
      )}

      <style>{`
        @keyframes mascota-durmiendo-cama {
          0%, 100% { transform: translateY(0) scale(1) rotate(-3deg); }
          50%      { transform: translateY(-4px) scale(1.02, 0.97) rotate(-3deg); }
        }
        @keyframes zzz-float-1 {
          0%, 100% { transform: translate(0, 0) scale(0.8); opacity: 0.3; }
          50%      { transform: translate(7px, -14px) scale(1.1); opacity: 1; }
        }
        @keyframes zzz-float-2 {
          0%, 100% { transform: translate(0, 0) scale(0.8); opacity: 0.2; }
          50%      { transform: translate(-6px, -16px) scale(1.1); opacity: 0.95; }
        }
        @keyframes zzz-float-3 {
          0%, 100% { transform: translate(0, 0) scale(0.8); opacity: 0.3; }
          50%      { transform: translate(9px, -18px) scale(1.25); opacity: 1; }
        }
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
  const [monedasPartida, setMonedasPartida] = useState(0);
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

      // Spawn de compresas / monedas (cadencia que aumenta con la puntuación)
      const cadencia = Math.max(450, 1200 - puntos * 8);  // ms entre spawns
      if (ts - ultimoSpawnRef.current > cadencia) {
        ultimoSpawnRef.current = ts;
        const esMoneda = Math.random() < 0.10; // 10% de probabilidad (poco común, valor 1)
        const x = Math.random() * (tamPantalla.w - COMPRESA_TAMANO);
        const vy = 0.18 + Math.random() * 0.12 + puntos * 0.002;  // px/ms
        obstaculosRef.current.push({
          id: idCounterRef.current++,
          type: esMoneda ? 'moneda' : 'compresa',
          x, y: tamPantalla.h,
          vy,
          w: esMoneda ? 28 : COMPRESA_TAMANO,
          h: esMoneda ? 28 : COMPRESA_TAMANO,
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
            if (o.type !== 'moneda') {
              setPuntos(p => p + 1);  // esquivada → punto
            }
            return false;
          }
          const margin = o.type === 'moneda' ? 4 : 12;
          const oBox = { x1: o.x + margin, y1: o.y + margin, x2: o.x + o.w - margin, y2: o.y + o.h - margin };
          const colision = !(pBox.x2 < oBox.x1 || pBox.x1 > oBox.x2 || pBox.y2 < oBox.y1 || pBox.y1 > oBox.y2);
          if (colision) {
            if (o.type === 'moneda') {
              sumarMoneda(1);
              setMonedasPartida(m => m + 1);
              return false; // recolectada
            } else {
              golpe = true;
              return false;
            }
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
    setMonedasPartida(0);
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary, #852296)', background: 'rgba(255,255,255,0.92)', padding: '2px 8px', borderRadius: '10px', fontSize: '13px', fontWeight: 800 }}>
            <CoinIcon size={16} /> {monedasPartida}
          </span>
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
        {/* Obstáculos y Monedas */}
        {obstaculosRef.current.map(o => (
          o.type === 'moneda' ? (
            <div
              key={o.id}
              style={{
                position: 'absolute',
                left: `${o.x}px`, top: `${o.y}px`,
                width: `${o.w}px`, height: `${o.h}px`,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F3E8FF 100%)',
                border: '1.5px solid #000000',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
                animation: 'bounce 1s infinite ease-in-out'
              }}
            >
              <img
                src="/logo.png"
                alt="Moneda"
                style={{ width: '20px', height: '20px', objectFit: 'contain' }}
              />
            </div>
          ) : spriteCompresa ? (
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
        <div style={{
          position: 'absolute',
          left: `${playerXRef.current - MASCOTA_TAMANO_JUEGO / 2}px`,
          top: '25%',
          width: `${MASCOTA_TAMANO_JUEGO}px`,
          height: `${MASCOTA_TAMANO_JUEGO}px`,
          pointerEvents: 'none',
        }}>
          <img
            src={spriteCaida}
            alt="Nuvia"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.25))',
            }}
          />
          <AccesorioOverlay size={29} />
        </div>

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
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #2b0b30 0%, #52185c 50%, #852296 100%)', zIndex: 200, padding: '16px 24px', overflowY: 'auto' }}>
            <svg style={{ position: 'absolute', bottom: 0, width: '100%', opacity: 0.22 }} viewBox="0 0 400 200" preserveAspectRatio="none">
              <path d="M0,150 Q50,80 100,130 Q150,60 200,110 Q250,50 300,100 Q350,70 400,120 L400,200 L0,200Z" fill="#ec4899" />
              <path d="M0,170 Q60,120 120,150 Q180,100 240,140 Q300,110 360,150 L400,160 L400,200 L0,200Z" fill="#be185d" />
            </svg>
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '38px', marginBottom: '2px' }}>⚡</div>
              <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.5px', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>Esquiva-compresas</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 12px' }}>¡Mueve a Nuvia y esquiva las compresas que caen!</p>
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '14px', padding: '10px 14px', marginBottom: '14px', textAlign: 'left', width: '100%' }}>
                {[
                  ['👉', 'Controles', 'Mueve a Nuvia con el dedo o acelerómetro'],
                  ['⚡', 'Objetivo', 'Cada compresa esquivada suma 1 punto'],
                  ['❤️', 'Vidas', '¡Cuidado! Tienes 3 vidas en total']
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
              {recordLocal > 0 && <div style={{ color: '#FFD700', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>🏆 Récord: {recordLocal}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '240px' }}>
                <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
                  <button onClick={empezar} style={{ background: 'linear-gradient(135deg,#E91E8C,#9C27B0)', color: '#fff', border: 'none', borderRadius: '14px', padding: '11px 0', fontSize: '15px', fontWeight: 800, cursor: 'pointer', width: '100%', maxWidth: '200px', boxShadow: '0 8px 32px rgba(233,30,140,0.5)' }}>▶ Jugar</button>
                  <button onClick={onVolverAlListado} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '11px 0', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%', maxWidth: '200px' }}>← Volver</button>
                </div>
                <button onClick={() => setShowAjustes(v => !v)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '9px 0', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Settings size={14} /> {showAjustes ? 'Cerrar ajustes' : 'Ajustes de sensibilidad'}
                </button>
                {showAjustes && <PanelSens gPct={globalSensPct ?? 50} onG={onGlobalSensChange} sPct={specificSensPct} onS={(v) => { setSpecificSensPct(v); localStorage.setItem('nuvia_compresas_specific_sens', String(v)); }} useS={useSpecific} onToggleS={() => { const n = !useSpecific; setUseSpecific(n); localStorage.setItem('nuvia_compresas_use_specific', String(n)); }} label="Compresas" />}
              </div>
            </div>
          </div>
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

const Overlay = ({ children, style = {} }) => (
  <div style={{
    position: 'fixed', inset: 0,
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
    ...style,
  }}>
    {children}
  </div>
);
