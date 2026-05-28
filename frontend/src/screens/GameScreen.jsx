import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bed, Bath, Gamepad2 } from 'lucide-react';

// ─────────────────────── Habitaciones ───────────────────────
// Para cada habitación: fondo, color de "bottom" para la base, e icono para el
// selector inferior. Las imágenes deben ir en /public/juego/<archivo>.
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

// ─────────────────────── Mascota ───────────────────────
// Sprite del salto/idle (de frente). Cuando me pases los sprites los meto aquí.
// Si el sprite no carga, se usa la mascota actual de la app como fallback.
const SPRITE_IDLE = '/juego/mascota-idle.png';
const SPRITE_JUMP = '/juego/mascota-jump.png';
const SPRITE_FALLBACK = '/mascota-flotando.png';

// Tamaño base de la mascota en la habitación (px)
const MASCOTA_TAMANO = 140;

export default function GameScreen() {
  const navigate = useNavigate();
  const [habitacionId, setHabitacionId] = useState('sala');
  const [saltando, setSaltando] = useState(false);
  const [spriteOk, setSpriteOk] = useState({ idle: null, jump: null });
  const [fondoOk, setFondoOk] = useState({});

  const habitacion = HABITACIONES.find(h => h.id === habitacionId) || HABITACIONES[0];

  // Comprueba qué assets están disponibles para usar fallback si no
  useEffect(() => {
    const check = (src) => new Promise(res => {
      const img = new Image();
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = src;
    });
    (async () => {
      const idle = await check(SPRITE_IDLE);
      const jump = await check(SPRITE_JUMP);
      setSpriteOk({ idle, jump });
      const fondos = {};
      for (const h of HABITACIONES) {
        fondos[h.id] = await check(h.fondo);
      }
      setFondoOk(fondos);
    })();
  }, []);

  // Pulsar a la mascota → saltito
  const onMascotaClick = () => {
    if (saltando) return;
    setSaltando(true);
    setTimeout(() => setSaltando(false), 600);
  };

  const fondoUrl = fondoOk[habitacionId] ? habitacion.fondo : null;
  const spriteActual = saltando
    ? (spriteOk.jump ? SPRITE_JUMP : SPRITE_FALLBACK)
    : (spriteOk.idle ? SPRITE_IDLE : SPRITE_FALLBACK);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: fondoUrl ? `url(${fondoUrl}) center/cover no-repeat` : habitacion.fondoFallback,
      display: 'flex', flexDirection: 'column',
      zIndex: 1,
    }}>
      {/* Header con botón volver */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.0)',
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
        {/* Selector de habitaciones tipo Pou (ahora en el header) */}
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
            animation: saltando
              ? 'mascota-juego-salto 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'mascota-juego-idle 2.5s ease-in-out infinite',
          }}
        />
      </div>


      <style>{`
        @keyframes mascota-juego-idle {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes mascota-juego-salto {
          0%   { transform: translateY(0) scale(1); }
          40%  { transform: translateY(-90px) scale(1.05); }
          70%  { transform: translateY(-70px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
