import React, { useState, useEffect, useRef } from 'react';
import {
  Moon, Sun, Shirt, Volume2, VolumeX, Sparkles, X, Heart,
  Check, Play, Pause, CloudRain, Music, Wind, Bed, Calendar, Award, BookOpen
} from 'lucide-react';
import { CoinIcon } from '../utils/coinHelper';

// Lista de accesorios del Armario
export const ACCESORIOS = [
  { id: 'ninguno', nombre: 'Natural', icono: '✨', precio: 0, preview: null },
  { id: 'gorro_noche', nombre: 'Gorro Nocturno', icono: '🌙', precio: 30, color: '#A78BFA' },
  { id: 'antifaz', nombre: 'Antifaz de Seda', icono: '🕶️', precio: 45, color: '#F472B6' },
  { id: 'lazo_rosa', nombre: 'Lazo Coquette', icono: '🎀', precio: 50, color: '#FB7185' },
  { id: 'zapatillas_conejo', nombre: 'Zapatillas Conejo', icono: '🐰', precio: 60, color: '#FDE047' },
  { id: 'corona_flores', nombre: 'Corona Botánica', icono: '👑', precio: 80, color: '#34D399' },
];

// Generador de audio relajante sintético (Web Audio API)
class AmbientSynthPlayer {
  constructor() {
    this.ctx = null;
    this.noiseNode = null;
    this.oscNode = null;
    this.gainNode = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playRain() {
    this.stop();
    this.init();

    // Crear buffer de ruido rosa/blanco para lluvia
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.05;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filtro pasa-bajo para suavizar
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.15;

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start();
    this.noiseNode = whiteNoise;
    this.gainNode = gain;
    this.isPlaying = true;
  }

  playMelody() {
    this.stop();
    this.init();

    const notes = [261.63, 329.63, 392.00, 523.25, 440.00]; // Do, Mi, Sol, Do5, La
    let step = 0;

    this.intervalId = setInterval(() => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const freq = notes[step % notes.length];
      step++;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 2.5);
    }, 2800);

    this.isPlaying = true;
  }

  playWaves() {
    this.stop();
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);

    // Oscilar volumen imitando oleaje
    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();

    let waveUp = true;
    this.intervalId = setInterval(() => {
      if (!this.ctx) return;
      const targetGain = waveUp ? 0.12 : 0.02;
      gain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 3);
      waveUp = !waveUp;
    }, 3200);

    this.oscNode = osc;
    this.gainNode = gain;
    this.isPlaying = true;
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.noiseNode) {
      try { this.noiseNode.stop(); } catch (e) { }
    }
    if (this.oscNode) {
      try { this.oscNode.stop(); } catch (e) { }
    }
    this.isPlaying = false;
  }
}

const synthPlayer = new AmbientSynthPlayer();

export default function DormitorioSection({
  modoNoche,
  setModoNoche,
  onAbrirContarOvejas,
  equiparAccesorio,
  accesorioEquipado,
  userCoins,
  setUserCoins,
}) {
  const [showArmario, setShowArmario] = useState(false);
  const [showSonidos, setShowSonidos] = useState(false);
  const [showDiarioSueño, setShowDiarioSueño] = useState(false);

  // Sonido reproduciéndose actualmente: 'none' | 'rain' | 'melody' | 'waves'
  const [soundMode, setSoundMode] = useState('none');

  // Estado de autocuidado
  const [mostrarToastCare, setMostrarToastCare] = useState(null);
  const [corazones, setCorazones] = useState([]);
  const [comprados, setComprados] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nuvia_accesorios_comprados') || '["ninguno"]');
    } catch (e) {
      return ['ninguno'];
    }
  });

  // Persistir modoNoche en localStorage para el cálculo offline estilo Pou
  useEffect(() => {
    localStorage.setItem('nuvia_modo_noche', String(modoNoche));
  }, [modoNoche]);

  // Estado de Energía de la Mascota (con cálculo de tiempo transcurrido fuera de la app)
  const [energia, setEnergia] = useState(() => {
    const savedEnergy = Number(localStorage.getItem('nuvia_mascot_energy') || 75);
    const lastTimestamp = Number(localStorage.getItem('nuvia_last_energy_timestamp') || Date.now());
    const isNight = localStorage.getItem('nuvia_modo_noche') === 'true';

    const elapsedMs = Date.now() - lastTimestamp;
    let newEnergy = savedEnergy;

    if (elapsedMs > 0) {
      if (isNight) {
        // Estaba durmiendo fuera de la app: recarga +1% cada 30 segundos
        const gained = Math.floor(elapsedMs / 30000);
        newEnergy = Math.min(100, savedEnergy + gained);
      } else {
        // Estaba despierta fuera de la app: desgasta -1% cada 45 segundos
        const lost = Math.floor(elapsedMs / 45000);
        newEnergy = Math.max(0, savedEnergy - lost);
      }
    }

    localStorage.setItem('nuvia_mascot_energy', String(newEnergy));
    localStorage.setItem('nuvia_last_energy_timestamp', String(Date.now()));
    return newEnergy;
  });

  const [mostrarPorcentajeEnergia, setMostrarPorcentajeEnergia] = useState(false);

  // Mantener actualizada la marca de tiempo de última actividad
  useEffect(() => {
    localStorage.setItem('nuvia_last_energy_timestamp', String(Date.now()));
    const interval = setInterval(() => {
      localStorage.setItem('nuvia_last_energy_timestamp', String(Date.now()));
    }, 10000);
    return () => clearInterval(interval);
  }, [energia, modoNoche]);

  // Regeneración gradual de energía cuando el modo noche (dormir) está activo (+1% cada 30 segundos)
  useEffect(() => {
    if (!modoNoche) return;
    const timer = setInterval(() => {
      setEnergia(prev => {
        if (prev >= 100) return 100;
        const next = Math.min(100, prev + 1);
        localStorage.setItem('nuvia_mascot_energy', String(next));
        localStorage.setItem('nuvia_last_energy_timestamp', String(Date.now()));
        if (next === 100 && prev < 100) {
          lanzarCorazones('¡Nuvia durmió y recuperó el 100% de su energía! ⚡🌙 (+15 Monedas de despertar)');
          const nCoins = userCoins + 15;
          setUserCoins(nCoins);
          localStorage.setItem('nuvia_user_coins', String(nCoins));
        }
        return next;
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [modoNoche, userCoins]);

  // Desgaste gradual de energía mientras Nuvia está despierta (!modoNoche) (-1% cada 45 segundos)
  useEffect(() => {
    if (modoNoche) return;
    const timer = setInterval(() => {
      setEnergia(prev => {
        if (prev <= 0) return 0;
        const next = Math.max(0, prev - 1);
        localStorage.setItem('nuvia_mascot_energy', String(next));
        localStorage.setItem('nuvia_last_energy_timestamp', String(Date.now()));
        return next;
      });
    }, 45000);
    return () => clearInterval(timer);
  }, [modoNoche]);

  // Manejo de sonido sintetizado
  const toggleSound = (mode) => {
    if (soundMode === mode) {
      synthPlayer.stop();
      setSoundMode('none');
    } else {
      setSoundMode(mode);
      if (mode === 'rain') synthPlayer.playRain();
      if (mode === 'melody') synthPlayer.playMelody();
      if (mode === 'waves') synthPlayer.playWaves();
    }
  };

  useEffect(() => {
    return () => {
      synthPlayer.stop();
    };
  }, []);

  // Animación de corazones cuando cuidamos a la mascota y aumento de energía
  const lanzarCorazones = (mensaje, bonusEnergia = 15) => {
    setMostrarToastCare(mensaje);
    const id = Date.now();
    const nuevosCorazones = Array.from({ length: 5 }, (_, i) => ({
      id: `${id}-${i}`,
      left: 35 + Math.random() * 30,
      size: 16 + Math.random() * 14,
      delay: i * 0.1,
    }));
    setCorazones(nuevosCorazones);

    if (bonusEnergia > 0) {
      setEnergia(prev => {
        const next = Math.min(100, prev + bonusEnergia);
        localStorage.setItem('nuvia_mascot_energy', String(next));
        return next;
      });
    }

    setTimeout(() => {
      setMostrarToastCare(null);
      setCorazones([]);
    }, 2800);
  };

  const comprarOEquipar = (acc) => {
    if (comprados.includes(acc.id)) {
      equiparAccesorio(acc.id);
    } else {
      if (userCoins >= acc.precio) {
        const nCoins = userCoins - acc.precio;
        setUserCoins(nCoins);
        localStorage.setItem('nuvia_user_coins', String(nCoins));

        const nComprados = [...comprados, acc.id];
        setComprados(nComprados);
        localStorage.setItem('nuvia_accesorios_comprados', JSON.stringify(nComprados));

        equiparAccesorio(acc.id);
      } else {
        alert('¡No tienes suficientes monedas! Juega minijuegos para ganar más.');
      }
    }
  };

  // Estado de Diario de Sueño
  const [horasSueño, setHorasSueño] = useState(8);
  const [calidadSueño, setCalidadSueño] = useState('excelente');
  const [sueñoGuardado, setSueñoGuardado] = useState(false);

  const guardarDiario = () => {
    const today = new Date().toISOString().split('T')[0];
    const registro = {
      fecha: today,
      horas: horasSueño,
      calidad: calidadSueño,
      insomnio: calidadSueño === 'malo'
    };

    // Guardar exclusivamente en el historial de diario de salud local
    const prevLog = JSON.parse(localStorage.getItem('nuvia_registro_sueño_historial') || '[]');
    localStorage.setItem('nuvia_registro_sueño_historial', JSON.stringify([registro, ...prevLog]));
    localStorage.setItem('nuvia_registro_sueño_ultimo', JSON.stringify(registro));

    setSueñoGuardado(true);

    setTimeout(() => {
      setSueñoGuardado(false);
      setShowDiarioSueño(false);
    }, 1000);
  };

  return (
    <>


      {/* Superposición de Modo Noche (Capa Oscura Luz Apagada) */}
      {modoNoche && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.62)',
          backdropFilter: 'blur(1.5px)',
          zIndex: 2,
          pointerEvents: 'none',
          transition: 'all 0.6s ease'
        }}>
          {/* Estrellas decorativas de noche */}
          {[...Array(22)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${(i * 23) % 80}%`,
                left: `${(i * 47) % 90}%`,
                width: i % 3 === 0 ? '4px' : '3px',
                height: i % 3 === 0 ? '4px' : '3px',
                borderRadius: '50%',
                background: '#FFF',
                opacity: 0.65,
                boxShadow: '0 0 8px #FFF'
              }}
            />
          ))}
          {/* Cartel flotante Zzz saliendo de la mascota recostada en la cama */}
          <div style={{
            position: 'absolute',
            top: '48%',
            left: '43%',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 2px 10px rgba(167, 139, 250, 0.9))'
          }}>
            <div style={{
              color: '#DDD6FE',
              fontWeight: 900,
              fontSize: '26px',
              animation: 'floatZzz 3s infinite ease-in-out',
              textShadow: '0 0 12px #A78BFA, 0 0 24px #818CF8, 0 2px 4px rgba(0,0,0,0.8)'
            }}>
              Zzz
            </div>
          </div>
        </div>
      )}

      {/* Partículas de corazones flotantes */}
      {corazones.map(c => (
        <div
          key={c.id}
          style={{
            position: 'absolute',
            bottom: '220px',
            left: `${c.left}%`,
            zIndex: 10,
            pointerEvents: 'none',
            animation: `floatHeart 1.8s ease-out forwards`,
            animationDelay: `${c.delay}s`,
            color: '#FB7185'
          }}
        >
          <Heart size={c.size} fill="#FB7185" />
        </div>
      ))}

      {/* Toast de Cuidado */}
      {mostrarToastCare && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          border: '1.5px solid #F472B6',
          borderRadius: '20px',
          padding: '8px 18px',
          color: '#BE185D',
          fontWeight: 700,
          fontSize: '13px',
          zIndex: 12,
          boxShadow: '0 8px 20px rgba(244, 114, 182, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Sparkles size={16} color="#EC4899" />
          <span>{mostrarToastCare}</span>
        </div>
      )}

      {/* Marcadores Estilo Pou con Colores y Logo de Nuvia (Debajo de 'Volver', arriba a la izquierda) */}
      <div style={{
        position: 'absolute',
        top: '85px',
        left: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        zIndex: 10
      }}>
        {/* Monedas Estilo Pou: Círculo arriba con Logo de Nuvia y número de monedas DEBAJO */}
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
                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'block';
              }}
            />
          </div>
          <span style={{
            fontSize: '16px',
            fontWeight: 900,
            color: '#FFFFFF',
            WebkitTextStroke: '1.2px #000000',
            textShadow: '2px 2px 0 #000000, -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000',
            fontFamily: 'system-ui, sans-serif',
            marginTop: '2px'
          }}>
            {userCoins}
          </span>
        </div>

        {/* Estadística de Energía Estilo Pou: Cuadrado que baja su relleno y solo muestra porcentaje al hacer Click */}
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
            {/* Relleno de energía que sube o baja de abajo hacia arriba estilo Pou */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${energia}%`,
              background: energia > 50
                ? 'linear-gradient(180deg, #EC4899 0%, #A855F7 100%)'
                : 'linear-gradient(180deg, #EF4444 0%, #F59E0B 100%)',
              transition: 'height 0.5s ease-in-out'
            }} />

            {/* Icono de Rayo por encima del nivel de relleno */}
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

          {/* Porcentaje numérico: Solo aparece debajo al hacer CLICK */}
          {mostrarPorcentajeEnergia && (
            <span style={{
              fontSize: '14px',
              fontWeight: 900,
              color: '#FFFFFF',
              WebkitTextStroke: '1px #000000',
              textShadow: '2px 2px 0 #000000, -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000',
              fontFamily: 'system-ui, sans-serif',
              marginTop: '2px',
              animation: 'fadeIn 0.15s ease-out'
            }}>
              {energia}%
            </span>
          )}
        </div>
      </div>

      {/* BOTONES INTERACTIVOS DEL DORMITORIO (Barra Flotante de Acciones) */}
      <div style={{
        position: 'absolute',
        bottom: '95px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        padding: '8px 10px',
        borderRadius: '24px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1)',
        border: '1.5px solid rgba(255,255,255,0.8)',
        maxWidth: 'calc(100vw - 16px)',
        width: 'max-content',
        overflow: 'hidden'
      }}>
        {/* Botón Lámpara / Luz */}
        <button
          onClick={() => setModoNoche(!modoNoche)}
          title="Apagar/Encender Luz (Dormir)"
          style={{
            background: modoNoche ? '#312E81' : '#FEF3C7',
            color: modoNoche ? '#FDE047' : '#D97706',
            border: 'none',
            borderRadius: '16px',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '12px',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          {modoNoche ? <Moon size={17} /> : <Sun size={17} />}
          <span>Dormir</span>
        </button>



        {/* Botón Armario (Vestidor) */}
        <button
          onClick={() => setShowArmario(true)}
          title="Armario de Mascota"
          style={{
            background: '#FCE7F3',
            color: '#DB2777',
            border: 'none',
            borderRadius: '16px',
            padding: '8px 11px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '12px',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          <Shirt size={17} />
          <span>Armario</span>
        </button>

        {/* Botón Minijuego Contar Ovejitas */}
        <button
          onClick={onAbrirContarOvejas}
          title="Contar Ovejitas"
          style={{
            background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)',
            color: '#FFF',
            border: 'none',
            borderRadius: '16px',
            padding: '8px 11px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '12px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
          }}
        >
          <Bed size={17} />
          <span>Ovejitas</span>
        </button>
      </div>

      {/* MODAL: ARMARIO / VESTIDOR DE ACCESORIOS */}
      {showArmario && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shirt size={22} color="#DB2777" />
                <h3 style={{ margin: 0, color: '#831843', fontSize: '18px' }}>Armario de Nuvia</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#852296', background: 'rgba(255, 255, 255, 0.95)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <CoinIcon size={18} /> {userCoins} Monedas
                </span>
                <button onClick={() => setShowArmario(false)} style={closeBtnStyle}><X size={20} /></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px' }}>
              {ACCESORIOS.map(acc => {
                const esComprado = comprados.includes(acc.id);
                const esEquipado = accesorioEquipado === acc.id;

                return (
                  <div
                    key={acc.id}
                    onClick={() => comprarOEquipar(acc)}
                    style={{
                      background: esEquipado ? '#FCE7F3' : '#F8FAFC',
                      border: esEquipado ? '2px solid #EC4899' : '1.5px solid #E2E8F0',
                      borderRadius: '16px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '32px', marginBottom: '6px' }}>{acc.icono}</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>{acc.nombre}</span>

                    {esEquipado ? (
                      <span style={{ fontSize: '11px', color: '#DB2777', fontWeight: 800, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Check size={12} /> Equipado
                      </span>
                    ) : esComprado ? (
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
                        Usar
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#852296', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CoinIcon size={15} /> {acc.precio} Monedas
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPRODUCTOR DE SONIDOS RELAJANTES */}
      {showSonidos && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={22} color="#4338CA" />
                <h3 style={{ margin: 0, color: '#1E1B4B', fontSize: '18px' }}>Sonidos para Dormir</h3>
              </div>
              <button onClick={() => setShowSonidos(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', margin: '8px 0 16px' }}>
              Sonidos envolventes sintetizados para relajar tu mente antes de descansar.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Opción Lluvia */}
              <button
                onClick={() => toggleSound('rain')}
                style={soundOptionStyle(soundMode === 'rain')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CloudRain size={20} color="#0284C7" />
                  <span style={{ fontWeight: 700 }}>Lluvia Suave</span>
                </div>
                {soundMode === 'rain' ? <Pause size={18} color="#0284C7" /> : <Play size={18} color="#64748B" />}
              </button>

              {/* Opción Melodía 432 Hz */}
              <button
                onClick={() => toggleSound('melody')}
                style={soundOptionStyle(soundMode === 'melody')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Music size={20} color="#7C3AED" />
                  <span style={{ fontWeight: 700 }}>Melodía Calmante (432 Hz)</span>
                </div>
                {soundMode === 'melody' ? <Pause size={18} color="#7C3AED" /> : <Play size={18} color="#64748B" />}
              </button>

              {/* Opción Olas del Mar */}
              <button
                onClick={() => toggleSound('waves')}
                style={soundOptionStyle(soundMode === 'waves')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wind size={20} color="#059669" />
                  <span style={{ fontWeight: 700 }}>Olas de Mar Nocturnas</span>
                </div>
                {soundMode === 'waves' ? <Pause size={18} color="#059669" /> : <Play size={18} color="#64748B" />}
              </button>
            </div>

            {soundMode !== 'none' && (
              <button
                onClick={() => toggleSound(soundMode)}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  background: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Detener Audio
              </button>
            )}
          </div>
        </div>
      )}



      {/* ESTILOS CSS INLINE */}
      <style>{`
        @keyframes floatZzz {
          0% { transform: translateY(0px) scale(0.85); opacity: 0.4; }
          50% { transform: translateY(-28px) scale(1.1); opacity: 1; }
          100% { transform: translateY(-50px) scale(1.25); opacity: 0.1; }
        }
        @keyframes floatHeart {
          0% { transform: translateY(0) scale(0.5); opacity: 1; }
          100% { transform: translateY(-90px) scale(1.3); opacity: 0; }
        }
      `}</style>
    </>
  );
}

// Estilos de Modales
const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(6px)',
  zIndex: 90,
  display: 'flex',
  alignItems: 'center',
  justify: 'center',
  padding: '20px'
};

const modalCardStyle = {
  background: '#FFFFFF',
  borderRadius: '24px',
  padding: '22px 20px',
  width: '100%',
  maxWidth: '360px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  animation: 'fadeIn 0.2s ease-out'
};

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#64748B',
  cursor: 'pointer',
  padding: 0
};

const soundOptionStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  borderRadius: '16px',
  border: active ? '2px solid #6366F1' : '1.5px solid #E2E8F0',
  background: active ? '#EEF2FF' : '#F8FAFC',
  color: '#1E293B',
  cursor: 'pointer',
  transition: 'all 0.2s'
});
