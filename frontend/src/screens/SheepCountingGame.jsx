import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Moon, Sparkles, Volume2, VolumeX, RotateCcw, Trophy, Award } from 'lucide-react';
import { ApiService } from '../api';


// Sonido sintético relajante al contar una oveja usando Web Audio API
const playSoftChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Frecuencias pentatónicas relajantes (C5, D5, E5, G5, A5)
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00];
    const freq = notes[Math.floor(Math.random() * notes.length)];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {
    // Ignorar si el navegador restringe audio sin gesto previo
  }
};

export default function SheepCountingGame({ onSalir, onVolverAlListado, onGanarMonedas }) {
  const [count, setCount] = useState(0);
  const [targetCount] = useState(15);
  const [sheepList, setSheepList] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [rewardCoins, setRewardCoins] = useState(0);

  // Obtener la fecha local en formato YYYY-MM-DD
  const getLocalDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [alreadyRewardedToday, setAlreadyRewardedToday] = useState(() => {
    return localStorage.getItem('nuvia_sheep_last_reward_date') === getLocalDateStr();
  });

  const containerRef = useRef(null);
  const nextSheepId = useRef(1);

  // Crear una nueva oveja periódicamente que salta de derecha a izquierda
  useEffect(() => {
    if (completed) return;

    const interval = setInterval(() => {
      const id = nextSheepId.current++;
      const duration = 4.5 + Math.random() * 1.5; // Segundos para cruzar
      const size = 65 + Math.floor(Math.random() * 20); // Tamaño en px
      const fluffyType = Math.floor(Math.random() * 3); // Variación estética

      setSheepList(prev => [
        ...prev,
        {
          id,
          size,
          duration,
          fluffyType,
          startTime: Date.now(),
          counted: false,
        }
      ]);
    }, 2200);

    return () => clearInterval(interval);
  }, [completed]);

  // Limpiar ovejas que salieron de pantalla
  useEffect(() => {
    const cleaner = setInterval(() => {
      const now = Date.now();
      setSheepList(prev => prev.filter(s => now - s.startTime < s.duration * 1000 + 1000));
    }, 1000);
    return () => clearInterval(cleaner);
  }, []);

  const handleSheepClick = (id) => {
    const targetSheep = sheepList.find(s => s.id === id);
    if (!targetSheep || targetSheep.counted) return;

    setSheepList(prev =>
      prev.map(s => (s.id === id ? { ...s, counted: true } : s))
    );

    if (soundEnabled) playSoftChime();

    const newCount = count + 1;
    setCount(newCount);

    if (newCount >= targetCount && !completed) {
      setCompleted(true);

      const today = getLocalDateStr();
      const lastRewardDate = localStorage.getItem('nuvia_sheep_last_reward_date');

      let earned = 0;
      // Solo otorga monedas si NO ha sido recompensado hoy
      if (!alreadyRewardedToday && lastRewardDate !== today) {
        earned = 30 + Math.floor(Math.random() * 20);
        localStorage.setItem('nuvia_sheep_last_reward_date', today);
        setAlreadyRewardedToday(true);

        const curCoins = Number(localStorage.getItem('nuvia_user_coins') || 50);
        const nTotal = curCoins + earned;
        localStorage.setItem('nuvia_user_coins', String(nTotal));
        // Sin esto la moneda solo quedaba en este móvil y nunca llegaba a la
        // base de datos, así que otro dispositivo con la misma cuenta no la veía.
        ApiService.sumarMonedas(earned).catch(() => {});

        onGanarMonedas?.(earned);
      }

      setRewardCoins(earned);
    }
  };

  const reiniciarJuego = () => {
    setCount(0);
    setSheepList([]);
    setCompleted(false);
    setRewardCoins(0);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, #0B132B 0%, #1C2541 40%, #3A506B 80%, #2F3E46 100%)',
        zIndex: 99,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Estrellas titilantes de fondo */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${(i * 37) % 70}%`,
              left: `${(i * 53) % 95}%`,
              width: `${(i % 3) + 2}px`,
              height: `${(i % 3) + 2}px`,
              borderRadius: '50%',
              background: '#FFF',
              opacity: 0.3 + ((i % 5) * 0.15),
              animation: `twinkle ${(i % 3) + 2}s infinite alternate ease-in-out`
            }}
          />
        ))}
        
        {/* Luna / Nube llena brillante posicionado abajo del menú con el logo de Nuvia */}
        <div style={{
          position: 'absolute',
          top: '100px',
          right: '20px',
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #FFFDF0 0%, #F4F1DE 70%, #E0DBC5 100%)',
          boxShadow: '0 0 35px rgba(255, 253, 240, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1
        }}>
          <img
            src="/logo.png"
            alt="Logo Nuvia"
            style={{
              width: '38px',
              height: '38px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
            }}
          />
        </div>
      </div>

      {/* Header superior centrado */}
      <div style={{
        padding: '16px 12px 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 20
      }}>
        <button
          onClick={onSalir}
          style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '16px',
            padding: '0 14px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#FFF',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          <ChevronLeft size={18} /> Dormitorio
        </button>

        {/* Contador de ovejas */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '16px',
          padding: '0 16px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#FFF',
          fontWeight: 700,
          fontSize: '13px',
          flexShrink: 0,
          whiteSpace: 'nowrap'
        }}>
          <Moon size={16} color="#FFE66D" />
          <span>Ovejas: {count} / {targetCount}</span>
        </div>

        {/* Botón de Sonido */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '16px',
            padding: '0 12px',
            height: '38px',
            color: '#FFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Instrucciones flotantes */}
      {!completed && count === 0 && (
        <div style={{
          alignSelf: 'center',
          marginTop: '10px',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '8px 18px',
          color: '#E2E8F0',
          fontSize: '13px',
          fontWeight: 500,
          zIndex: 10,
          animation: 'bounce 2s infinite'
        }}>
          ✨ Toca las ovejitas mientras saltan para contarlas ✨
        </div>
      )}

      {/* Campo central donde saltan las ovejas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* Valla de madera en la parte inferior */}
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '130px',
          height: '70px',
          zIndex: 5,
          pointerEvents: 'none'
        }}>
          {/* Postes de madera */}
          <div style={{ position: 'absolute', left: 0, bottom: 0, width: '14px', height: '65px', background: '#8D5B4C', borderRadius: '4px 4px 0 0' }} />
          <div style={{ position: 'absolute', left: '55px', bottom: 0, width: '14px', height: '65px', background: '#8D5B4C', borderRadius: '4px 4px 0 0' }} />
          <div style={{ position: 'absolute', right: 0, bottom: 0, width: '14px', height: '65px', background: '#8D5B4C', borderRadius: '4px 4px 0 0' }} />
          {/* Tablas horizontales */}
          <div style={{ position: 'absolute', left: 0, top: '15px', width: '130px', height: '12px', background: '#A06C5B', borderRadius: '3px' }} />
          <div style={{ position: 'absolute', left: 0, top: '38px', width: '130px', height: '12px', background: '#A06C5B', borderRadius: '3px' }} />
        </div>

        {/* Suelo de hierba nocturna */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '110px',
          background: 'linear-gradient(180deg, #1E3A2B 0%, #0F2318 100%)',
          borderTop: '4px solid #2D5A43'
        }} />

        {/* Ovejas animadas */}
        {sheepList.map(s => (
          <div
            key={s.id}
            onClick={() => handleSheepClick(s.id)}
            style={{
              position: 'absolute',
              bottom: '90px',
              width: `${s.size}px`,
              height: `${s.size * 0.75}px`,
              cursor: s.counted ? 'default' : 'pointer',
              zIndex: s.counted ? 6 : 7,
              animation: `sheepJumpArc ${s.duration}s linear forwards`,
              filter: s.counted ? 'drop-shadow(0 0 12px #FFE66D)' : 'drop-shadow(0 6px 8px rgba(0,0,0,0.4))',
              transition: 'transform 0.15s ease'
            }}
          >
            {/* Cuerpo de oveja (Nube afelpada) */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              background: s.counted ? '#FFFDF0' : '#F8FAFCEE',
              borderRadius: '30px',
              border: s.counted ? '2px solid #F59E0B' : 'none'
            }}>
              {/* Círculos afelpados */}
              <div style={{ position: 'absolute', top: '-25%', left: '15%', width: '45%', height: '50%', background: 'inherit', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', top: '-15%', right: '20%', width: '40%', height: '45%', background: 'inherit', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', bottom: '-10%', left: '25%', width: '50%', height: '40%', background: 'inherit', borderRadius: '50%' }} />

              {/* Cabeza de la oveja */}
              <div style={{
                position: 'absolute',
                top: '15%',
                left: '-15%',
                width: '35%',
                height: '50%',
                background: '#334155',
                borderRadius: '50% 40% 40% 50%',
                display: 'flex',
                alignItems: 'center',
                justify: 'center'
              }}>
                {/* Ojo */}
                <div style={{ width: '4px', height: '4px', background: '#FFF', borderRadius: '50%', transform: 'translate(-2px, -2px)' }} />
                {/* Oreja */}
                <div style={{ position: 'absolute', top: '10%', right: '-20%', width: '35%', height: '40%', background: '#334155', borderRadius: '50%', transform: 'rotate(25deg)' }} />
              </div>

              {/* Patitas */}
              <div style={{ position: 'absolute', bottom: '-25%', left: '20%', width: '12%', height: '35%', background: '#334155', borderRadius: '3px' }} />
              <div style={{ position: 'absolute', bottom: '-25%', left: '40%', width: '12%', height: '35%', background: '#334155', borderRadius: '3px' }} />
              <div style={{ position: 'absolute', bottom: '-25%', right: '35%', width: '12%', height: '35%', background: '#334155', borderRadius: '3px' }} />
              <div style={{ position: 'absolute', bottom: '-25%', right: '15%', width: '12%', height: '35%', background: '#334155', borderRadius: '3px' }} />

              {/* Indicador de número si ya fue contada */}
              {s.counted && (
                <div style={{
                  position: 'absolute',
                  top: '-40%',
                  left: '30%',
                  background: '#F59E0B',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  borderRadius: '10px',
                  padding: '2px 8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                }}>
                  ✓
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de felicitación por completar */}
      {completed && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 7, 22, 0.85)',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          padding: '20px',
          zIndex: 50,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #2D1436 0%, #1A0B24 100%)',
            border: '1.5px solid rgba(232, 145, 200, 0.3)',
            borderRadius: '28px',
            padding: '30px 24px',
            width: '100%',
            maxWidth: '340px',
            textAlign: 'center',
            color: '#FFF',
            boxShadow: '0 24px 60px rgba(45, 20, 54, 0.6), 0 0 35px rgba(232, 145, 200, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* Círculo del Trofeo pixel-perfectamente centrado */}
            <div style={{
              width: '68px',
              height: '68px',
              margin: '0 0 18px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 25px rgba(245, 158, 11, 0.5)',
              flexShrink: 0
            }}>
              <Trophy size={34} color="#FFF" style={{ display: 'block' }} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: '#FDE047' }}>
              ¡Felices Sueños! 😴
            </h3>
            <p style={{ margin: '0 0 22px', fontSize: '14px', color: '#E9D5FF', lineHeight: 1.5 }}>
              Has contado todas las ovejitas. Tu mente está relajada y lista para descansar.
            </p>

            {/* Insignia de recompensa */}
            <div style={{
              background: rewardCoins > 0 ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.08)',
              border: rewardCoins > 0 ? '1px solid rgba(216, 180, 254, 0.25)' : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '18px',
              padding: '12px 18px',
              margin: '0 0 24px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color={rewardCoins > 0 ? '#F59E0B' : '#94A3B8'} />
                <span style={{ fontWeight: 800, fontSize: '15px', color: rewardCoins > 0 ? '#FDE047' : '#CBD5E1' }}>
                  +{rewardCoins} Monedas Ganadas
                </span>
              </div>
              {rewardCoins === 0 && (
                <span style={{ fontSize: '12px', color: '#A78BFA', fontWeight: 600, marginTop: '2px' }}>
                  ✨ Recompensa diaria ya obtenida hoy
                </span>
              )}
            </div>

            {/* Botones estilizados con la paleta de Nuvia */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button
                onClick={reiniciarJuego}
                style={{
                  background: 'linear-gradient(135deg, var(--primary, #b05bb5) 0%, #9333EA 100%)',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '14px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(176, 91, 181, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <RotateCcw size={16} /> Contar de nuevo
              </button>

              <button
                onClick={onSalir}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#F3E8FF',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  padding: '13px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Volver al Dormitorio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos CSS inline de animación para el arco de salto de la oveja */}
      <style>{`
        @keyframes sheepJumpArc {
          0% {
            left: 110%;
            transform: translateY(0px) rotate(0deg);
          }
          40% {
            transform: translateY(-160px) rotate(-10deg);
          }
          60% {
            transform: translateY(-170px) rotate(5deg);
          }
          100% {
            left: -30%;
            transform: translateY(0px) rotate(0deg);
          }
        }
        @keyframes twinkle {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 0.9; transform: scale(1.2); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
