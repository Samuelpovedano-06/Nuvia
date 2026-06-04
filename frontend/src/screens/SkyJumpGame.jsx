import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, RefreshCw, Pause } from 'lucide-react';
import { ApiService } from '../api';

const JUEGO_ID = 'sky_jump';
const RECORD_LOCAL_KEY = 'nuvia_skyjump_record';

// ─────────────────────── Sprites ───────────────────────
const SP = {
  player_idle: '/juego/mascota-idle.png',
  player_jump: '/juego/mascota-jump.png',
  player_caida: '/juego/mascota-caida.png',
  plataforma: '/juego/Sky_Jump/plataforma.png',
  plataforma_portal: '/juego/Sky_Jump/plataforma_portal.png',
  nube: '/juego/Sky_Jump/nube.png',
  estrella: '/juego/Sky_Jump/estrella.png',
  flor: '/juego/Sky_Jump/flor.png',
  enemigo: '/juego/Sky_Jump/enemigo.png',
  portal: '/juego/Sky_Jump/portal.png',
  avion: '/juego/compresa.png',
  fondo_plantas: '/juego/Sky_Jump/fondo_plantas.png',
  fondo_nubes: '/juego/Sky_Jump/fondo_nubes.png',
  fondo_nubes_1: '/juego/Sky_Jump/fondo_nubes_1.png',
  fondo_nubes_2: '/juego/Sky_Jump/fondo_nubes_2.png',
  fondo_nubes_portal: '/juego/Sky_Jump/fondo_nubes_portal.png',
  fondo_nubes_portal_arriba: '/juego/Sky_Jump/fondo_nubes_portal_arriba.png',
};

// ─────────────────────── Constantes ───────────────────────
const PX_POR_METRO = 100;   // antes 25 → ahora cada metro cuesta 4x más subir
const M30 = 30 * PX_POR_METRO;   // 750  - fin plantas
const M100 = 100 * PX_POR_METRO;   // 2500 - inicio transición
const M200 = 200 * PX_POR_METRO;   // 5000 - primer portal
const SEPARACION_PORTAL = 50 * PX_POR_METRO;
const ALTURA_OBJETOS = 60 * PX_POR_METRO;
const ALTURA_NUBE = 60 * PX_POR_METRO;
const ALTURA_AVIONES = 100 * PX_POR_METRO;

// Player
const PLAYER_W = 60, PLAYER_H = 70;
const GRAVEDAD = 0.0022;        // px/ms² (más caída → exige timing)
const V_SALTO = 0.99;           // altura máxima ≈ 223 px → margen sobre SEP_MAX
const V_SALTO_ESTRELLA = 1.7;   // turbo estrella
const V_HORIZONTAL_MAX = 0.6;
const TILT_FACTOR = 0.07;

// Plataforma y objetos
const PLAT_W = 180, PLAT_H = 46;
const NUBE_W = 170, NUBE_H = 54;
const AVION_W = 80, AVION_H = 60;
const OBJ_W = 42, OBJ_H = 42;
const ENEMIGO_W = 95, ENEMIGO_H = 105;
const PORTAL_W = 72, PORTAL_H = 78;
const SEP_MIN = 120;
const SEP_MAX = 180;
const MARGEN_LATERAL = 8;

// Devuelve (w,h) reales para cada tipo de plataforma
function platSize(tipo) {
  if (tipo === 'nube') return { w: NUBE_W, h: NUBE_H };
  if (tipo === 'avion') return { w: AVION_W, h: AVION_H };
  return { w: PLAT_W, h: PLAT_H };
}

function rand(min, max) { return min + Math.random() * (max - min); }
function ri(min, max) { return Math.floor(rand(min, max)); }

export default function SkyJumpGame({ onSalir, onVolverAlListado }) {
  const areaRef = useRef(null);
  const [tam, setTam] = useState({ w: 360, h: 600 });
  const [estado, setEstado] = useState('inicio'); // 'inicio' | 'jugando' | 'pausa' | 'gameover'
  const [score, setScore] = useState(0);
  const [recordLocal, setRecordLocal] = useState(() => Number(localStorage.getItem(RECORD_LOCAL_KEY) || 0));

  // Refs del juego (no fuerzan re-render)
  const playerRef = useRef({ x: 180, y: 80, vx: 0, vy: 0, dir: 1, flotando: 0 });
  const camYRef = useRef(0);
  const platsRef = useRef([]);
  // objetos y portales viven dentro de pl.objeto / pl.esPortal — no listas sueltas
  const ultSpawnAvionRef = useRef(0);
  const enemigoRef = useRef(null);
  const enemigoSpawnAtRef = useRef(0);
  const proxYRef = useRef(0);
  const maxYRef = useRef(0);
  const tiltRef = useRef(0);
  const ultimaPlatRef = useRef(null);
  const vecesMismaRef = useRef(0);
  const ultPortalSpawnYRef = useRef(null);
  const primerPortalYRef = useRef(null);  // Y del PRIMER portal (para disparar al enemigo)
  const prevTipoRef = useRef('normal');   // Para generar rachas (móviles seguidos, etc.)
  const enModoPortalRef = useRef(false);
  const portalActivadoEnYRef = useRef(null);
  const fallTimerRef = useRef(0);  // ms desde que cayó al vacío

  const [, rerender] = useState(0);

  // Sincronizar récord con servidor al montar
  useEffect(() => {
    (async () => {
      const records = await ApiService.getRecordsJuego();
      const enServ = Number(records?.[JUEGO_ID] || 0);
      const enLoc = Number(localStorage.getItem(RECORD_LOCAL_KEY) || 0);
      const mejor = Math.max(enServ, enLoc);
      setRecordLocal(mejor);
      localStorage.setItem(RECORD_LOCAL_KEY, String(mejor));
      if (enLoc > enServ) ApiService.guardarRecordJuego(JUEGO_ID, enLoc);
    })();
  }, []);

  // Medir
  useEffect(() => {
    const medir = () => {
      if (areaRef.current) {
        const r = areaRef.current.getBoundingClientRect();
        setTam({ w: r.width, h: r.height });
      }
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  // Acelerómetro
  useEffect(() => {
    const handle = (e) => { tiltRef.current = e.gamma || 0; };
    window.addEventListener('deviceorientation', handle);
    return () => window.removeEventListener('deviceorientation', handle);
  }, []);

  // Activar modo portal: marca todas las plataformas como no-portal y desactiva
  // el spawn de futuros portales.
  const activarPortal = (yMundo) => {
    if (enModoPortalRef.current) return;
    enModoPortalRef.current = true;
    portalActivadoEnYRef.current = yMundo;
    enemigoRef.current = null;
    for (const pp of platsRef.current) pp.esPortal = false;
  };

  // Touch / drag horizontal
  const onMove = (e) => {
    if (estado !== 'jugando') return;
    const t = e.touches ? e.touches[0] : e;
    if (!areaRef.current) return;
    const r = areaRef.current.getBoundingClientRect();
    const x = t.clientX - r.left;
    const p = playerRef.current;
    const diff = x - p.x;
    p.vx = Math.max(-V_HORIZONTAL_MAX, Math.min(V_HORIZONTAL_MAX, diff * 0.009));
  };

  const togglePausa = () => {
    if (estado === 'jugando') {
      setEstado('pausa');
    } else if (estado === 'pausa') {
      setEstado('jugando');
    }
  };

  // Reset
  const empezar = () => {
    const w = tam.w;
    platsRef.current = [];
    ultSpawnAvionRef.current = 0;
    enemigoRef.current = null;
    camYRef.current = 0;
    maxYRef.current = 0;
    ultimaPlatRef.current = null;
    vecesMismaRef.current = 0;
    ultPortalSpawnYRef.current = null;
    primerPortalYRef.current = null;
    prevTipoRef.current = 'normal';
    enModoPortalRef.current = false;
    portalActivadoEnYRef.current = null;
    proxYRef.current = 80;
    fallTimerRef.current = 0;

    // Plataforma inicial bajo el player
    platsRef.current.push({
      id: 'inicial',
      x: w / 2 - PLAT_W / 2, y: 50,
      vx: 0, tipo: 'normal', usada: false, esPortal: false,
      w: PLAT_W, h: PLAT_H,
    });

    playerRef.current = {
      x: w / 2, y: 80, vx: 0, vy: V_SALTO, dir: 1, flotando: 0,
    };

    generarHasta(tam.h * 1.5);
    setScore(0);
    setEstado('jugando');
  };

  // Generar plataformas / objetos / portales hasta una altura
  const generarHasta = (yObjetivo) => {
    const w = tam.w;
    let y = proxYRef.current;
    while (y < yObjetivo) {
      // Decidir tipo (con sesgo a hacer rachas de móviles, estilo Pou)
      let tipo = 'normal';
      const r = Math.random();
      const probNube = (y >= ALTURA_NUBE) ? 0.13 : 0;
      // Si la anterior fue móvil, mayor probabilidad de continuar la racha
      const probMovil = (y > 500)
        ? (prevTipoRef.current === 'movil' ? 0.60 : 0.28)
        : 0;
      if (r < probNube) tipo = 'nube';
      else if (r < probNube + probMovil) tipo = 'movil';
      prevTipoRef.current = tipo;

      const sz = platSize(tipo);

      // Colocación lateral: a veces pegada a un borde para forzar al jugador a
      // cruzar la pantalla. 15% extremo izquierdo, 15% extremo derecho, resto aleatorio.
      let x;
      const rx = Math.random();
      if (rx < 0.15) x = MARGEN_LATERAL;
      else if (rx < 0.30) x = w - MARGEN_LATERAL - sz.w;
      else x = MARGEN_LATERAL + Math.random() * (w - 2 * MARGEN_LATERAL - sz.w);

      const vx = tipo === 'movil' ? (Math.random() < 0.5 ? -0.06 : 0.06) : 0;

      // ¿Debe ser plataforma portal?
      const enPortal = enModoPortalRef.current;
      let esPortal = false;
      if (!enPortal) {
        if (ultPortalSpawnYRef.current == null && y >= M200) esPortal = true;
        else if (ultPortalSpawnYRef.current != null && y - ultPortalSpawnYRef.current >= SEPARACION_PORTAL) esPortal = true;
      }

      const tipoFinal = esPortal ? 'normal' : tipo;
      const szFinal = esPortal ? platSize('normal') : sz;

      const plat = {
        id: `p${y.toFixed(0)}_${Math.random().toString(36).slice(2, 6)}`,
        x, y, vx,
        tipo: tipoFinal,
        usada: false,
        esPortal,
        w: szFinal.w, h: szFinal.h,
        objeto: null,
      };

      // Power-up: estrella o flor encima de la plataforma (no en plataformas portal,
      // y no en nubes — la nube se rompe al primer toque). Se adosa a la plataforma.
      if (!esPortal && tipoFinal !== 'nube' && y >= ALTURA_OBJETOS && Math.random() < 0.07) {
        plat.objeto = {
          tipo: Math.random() < 0.55 ? 'estrella' : 'flor',
          usado: false,
        };
      }

      platsRef.current.push(plat);

      if (esPortal) {
        ultPortalSpawnYRef.current = y;
        if (primerPortalYRef.current == null) primerPortalYRef.current = y;
      }

      y += rand(SEP_MIN, SEP_MAX);
    }
    proxYRef.current = y;
  };

  // Loop principal
  useEffect(() => {
    if (estado !== 'jugando') return;
    let raf, ult = 0;
    const loop = (ts) => {
      if (!ult) ult = ts;
      const dt = Math.min(40, ts - ult);
      ult = ts;
      const w = tam.w, h = tam.h;
      const p = playerRef.current;

      // Controles: acelerómetro pisa el touch si hay
      if (Math.abs(tiltRef.current) > 2) {
        p.vx = Math.max(-V_HORIZONTAL_MAX, Math.min(V_HORIZONTAL_MAX, tiltRef.current * TILT_FACTOR));
      } else {
        p.vx *= 0.94;
      }

      // Movimiento horizontal con wrap (estilo Doodle Jump)
      p.x += p.vx * dt;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.vx < -0.08) p.dir = -1;
      else if (p.vx > 0.08) p.dir = 1;

      // Gravedad / flor:
      // - Subida: gravedad normal (no se extiende el rebote, no hay "impulso")
      // - Bajada: misma gravedad, pero la velocidad de caída queda capada → planeo
      p.vy -= GRAVEDAD * dt;
      if (p.flotando > 0) {
        p.flotando -= dt;
        if (p.vy < -0.18) p.vy = -0.18;     // cap solo a la caída
      }
      p.y += p.vy * dt;

      // Mover plataformas (móvil rebota, avión cruza la pantalla)
      for (const pl of platsRef.current) {
        if (!pl.vx) continue;
        pl.x += pl.vx * dt;
        if (pl.tipo === 'movil') {
          if (pl.x < 0) { pl.x = 0; pl.vx = -pl.vx; }
          if (pl.x + pl.w > w) { pl.x = w - pl.w; pl.vx = -pl.vx; }
        }
      }

      // Spawn aviones-plataforma (a partir de 100m): cruzan horizontalmente
      // y se pueden usar como suelo igual que el resto.
      if (maxYRef.current >= ALTURA_AVIONES) {
        if (ts - ultSpawnAvionRef.current > rand(2400, 4200)) {
          ultSpawnAvionRef.current = ts;
          const yA = camYRef.current + rand(h * 0.35, h * 0.85);
          const dir = Math.random() < 0.5 ? 1 : -1;
          // Pequeña posibilidad de que traiga un objeto
          let objAvion = null;
          if (Math.random() < 0.20) {
            objAvion = {
              tipo: Math.random() < 0.55 ? 'estrella' : 'flor',
              usado: false,
            };
          }
          platsRef.current.push({
            id: `av${ts}`,
            x: dir > 0 ? -AVION_W : w,
            y: yA,
            vx: dir * rand(0.12, 0.20),
            tipo: 'avion',
            usada: false,
            esPortal: false,
            w: AVION_W, h: AVION_H,
            objeto: objAvion,
          });
        }
      }

      // Colisión con plataformas (solo cuando cae — incluso con la flor activa,
      // que solo limita la velocidad pero no impide aterrizar)
      if (p.vy < 0) {
        for (const pl of platsRef.current) {
          if (pl.usada) continue;
          const plTop = pl.y + pl.h;
          // Hitbox muy acortado: el CENTRO del player tiene que estar en el 40% central de la plataforma.
          const dentroX = p.x >= pl.x + pl.w * 0.3 && p.x <= pl.x + pl.w * 0.7;
          const prevY = p.y - p.vy * dt;
          if (dentroX && p.y <= plTop && prevY >= plTop - 2) {
            p.y = plTop;
            p.vy = V_SALTO;

            // Detección "misma plataforma" para enemigo
            if (enemigoRef.current) {
              if (ultimaPlatRef.current === pl.id) {
                vecesMismaRef.current += 1;
                if (vecesMismaRef.current >= 1) {
                  // segunda vez consecutiva en la misma = caught
                  setEstado('gameover');
                  return;
                }
              } else {
                vecesMismaRef.current = 0;
              }
            }
            ultimaPlatRef.current = pl.id;

            // ¿Es portal? → entra al modo final
            if (pl.esPortal && !enModoPortalRef.current) {
              activarPortal(pl.y);
            }

            // ¿Trae objeto? → solo se activa aterrizando aquí
            if (pl.objeto && !pl.objeto.usado) {
              pl.objeto.usado = true;
              if (pl.objeto.tipo === 'estrella') p.vy = V_SALTO_ESTRELLA;
              else if (pl.objeto.tipo === 'flor') p.flotando = 2200;
            }

            if (pl.tipo === 'nube') pl.usada = true;
            break;
          }
        }
      }

      // Cámara: sube si player sube
      const camObj = p.y - h * 0.42;
      if (camObj > camYRef.current) camYRef.current = camObj;

      // Actualizar máximo
      if (p.y > maxYRef.current) {
        maxYRef.current = p.y;
        setScore(Math.floor((p.y - 50) / PX_POR_METRO));
      }

      // Enemigo: si pasó el PRIMER portal sin cogerlo, spawn justo debajo del
      // viewport para que se vea aparecer subiendo.
      if (!enModoPortalRef.current && enemigoRef.current === null && primerPortalYRef.current != null) {
        if (p.y > primerPortalYRef.current + 100) {
          enemigoRef.current = {
            y: camYRef.current - 20,
            vy: 0.28,
          };
          enemigoSpawnAtRef.current = ts;
        }
      }
      if (enemigoRef.current) {
        enemigoRef.current.y += enemigoRef.current.vy * dt;
        if (enemigoRef.current.y + ENEMIGO_H * 0.7 >= p.y) {
          setEstado('gameover');
        }
      }

      // Game over: caer fuera de pantalla
      if (p.y + PLAYER_H < camYRef.current - 80) {
        setEstado('gameover');
      }

      // Generar más mundo si la cámara está cerca del límite
      if (proxYRef.current - camYRef.current < h * 2.2) {
        generarHasta(camYRef.current + h * 3);
      }

      // Limpiar plataformas: por abajo, y aviones que ya cruzaron
      platsRef.current = platsRef.current.filter(pl => {
        if (pl.y < camYRef.current - 200) return false;
        if (pl.tipo === 'avion') {
          if (pl.x < -pl.w - 50 || pl.x > w + 50) return false;
        }
        return true;
      });

      rerender(r => r + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [estado, tam.w, tam.h]);

  // Guardar récord
  useEffect(() => {
    if (estado === 'gameover' && score > recordLocal) {
      setRecordLocal(score);
      localStorage.setItem(RECORD_LOCAL_KEY, String(score));
      ApiService.guardarRecordJuego(JUEGO_ID, score);
    }
  }, [estado, score, recordLocal]);

  // ─── Render ───
  const camY = camYRef.current;
  const W = tam.w, H = tam.h;
  // pantalla: y_screen = H - (y_world - camY) - elemento.h
  const toScreen = (yWorld, elemH = 0) => H - (yWorld - camY) - elemH;

  // Determina las capas de fondo activas y devuelve sólo las que están en pantalla.
  // Tile altura = H (un viewport). Layout en mundo:
  //   [0, M30]              plantas       (estirado)
  //   [M30, M100]           nubes         (tile)
  //   [M100, M100+H]        nubes_1       (transición, una vez)
  //   [M100+H, ∞)           nubes_2       (tile, hasta entrar portal)
  // Tras entrar portal (a yP):
  //   [yP, yP+H]            nubes_portal  (transición, una vez)
  //   [yP+H, ∞)             nubes_portal_arriba (tile)
  const renderFondos = () => {
    const camTop = camY + H;
    const camBot = camY;
    const tiles = [];

    const layers = [];
    if (enModoPortalRef.current && portalActivadoEnYRef.current != null) {
      const yP = portalActivadoEnYRef.current;
      layers.push({ src: SP.fondo_nubes_portal, y0: yP, y1: yP + H, tile: null });
      layers.push({ src: SP.fondo_nubes_portal_arriba, y0: yP + H, y1: Infinity, tile: H });
    } else {
      layers.push({ src: SP.fondo_plantas, y0: 0, y1: M30, tile: null });
      layers.push({ src: SP.fondo_nubes, y0: M30, y1: M100, tile: H });
      layers.push({ src: SP.fondo_nubes_1, y0: M100, y1: M100 + H, tile: null });
      layers.push({ src: SP.fondo_nubes_2, y0: M100 + H, y1: Infinity, tile: H });
    }

    for (const L of layers) {
      if (L.y1 <= camBot) continue;
      if (L.y0 >= camTop) continue;

      if (L.tile == null) {
        // Una sola imagen estirada al rango
        tiles.push({ key: `${L.src}_${L.y0}`, src: L.src, y: L.y0, h: L.y1 - L.y0 });
      } else {
        // Tileada: imagen de altura L.tile, apilada
        const i0 = Math.floor((Math.max(camBot, L.y0) - L.y0) / L.tile);
        const i1 = Math.ceil((Math.min(camTop, L.y1) - L.y0) / L.tile);
        for (let i = i0; i <= i1; i++) {
          const yT = L.y0 + i * L.tile;
          if (yT >= L.y1) break;
          tiles.push({ key: `${L.src}_${i}`, src: L.src, y: yT, h: L.tile });
        }
      }
    }
    return tiles;
  };

  // Sprite del player según vy/flor
  const playerSpriteSrc = (() => {
    const p = playerRef.current;
    if (p.flotando > 0) return SP.player_idle;
    if (p.vy > 0.05) return SP.player_jump;
    if (p.vy < -0.05) return SP.player_caida;
    return SP.player_idle;
  })();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1, userSelect: 'none',
      background: '#A7E1F4',
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 50, pointerEvents: 'none',
      }}>
        <button
          onClick={onSalir}
          style={{
            background: 'rgba(255,255,255,0.9)', border: 'none',
            borderRadius: '12px', padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: '6px',
            color: 'var(--primary)', cursor: 'pointer', fontWeight: 600,
            pointerEvents: 'auto',
          }}
        >
          <ChevronLeft size={18} /> Salir
        </button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          pointerEvents: 'auto',
        }}>
          {(estado === 'jugando' || estado === 'pausa') && (
            <button
              onClick={togglePausa}
              style={{
                background: 'rgba(255,255,255,0.9)', border: 'none',
                borderRadius: '12px', width: '38px', height: '34px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)', cursor: 'pointer',
              }}
            >
              {estado === 'pausa' ? <Play size={18} fill="var(--primary)" /> : <Pause size={18} fill="var(--primary)" />}
            </button>
          )}
          <div style={{
            background: 'rgba(255,255,255,0.92)', padding: '6px 14px',
            borderRadius: '12px', fontWeight: 700, color: 'var(--primary)',
            minHeight: '34px', display: 'flex', alignItems: 'center',
          }}>
            {score} m
          </div>
        </div>
      </div>

      {/* Área de juego */}
      <div
        ref={areaRef}
        onTouchStart={onMove}
        onTouchMove={onMove}
        onMouseDown={onMove}
        onMouseMove={(e) => { if (e.buttons === 1) onMove(e); }}
        style={{
          position: 'absolute', inset: 0,
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        {/* Fondos — top redondeado + 1px de solape para evitar líneas blancas
            entre tiles por sub-pixel rendering */}
        {renderFondos().map(t => (
          <img
            key={t.key}
            src={t.src}
            alt=""
            style={{
              position: 'absolute',
              left: 0,
              top: `${Math.round(toScreen(t.y + t.h, 0)) - 1}px`,
              width: '100%',
              height: `${Math.ceil(t.h) + 2}px`,
              objectFit: 'cover',
              pointerEvents: 'none',
              display: 'block',
            }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ))}

        {/* Plataformas (incluye aviones que ahora son plataformas móviles) */}
        {platsRef.current.map(pl => {
          if (pl.usada) return null;
          const yS = toScreen(pl.y, pl.h);
          if (yS < -pl.h - 10 || yS > H + 10) return null;
          let src = SP.plataforma;
          if (pl.esPortal) src = SP.plataforma_portal;
          else if (pl.tipo === 'nube') src = SP.nube;
          else if (pl.tipo === 'avion') src = SP.avion;
          return (
            <img
              key={pl.id}
              src={src}
              alt=""
              style={{
                position: 'absolute',
                left: `${pl.x}px`, top: `${yS}px`,
                width: `${pl.w}px`, height: `${pl.h}px`,
                objectFit: 'contain',
                pointerEvents: 'none',
                transform: pl.tipo === 'avion' && pl.vx < 0 ? 'scaleX(-1)' : 'none',
                filter: pl.tipo === 'avion' ? 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' : 'none',
              }}
            />
          );
        })}

        {/* Portales y objetos: van pegados a su plataforma — se renderizan a partir
            de la plataforma que los lleva. Si la plataforma se mueve, lo siguen. */}
        {platsRef.current.map(pl => {
          const items = [];
          if (pl.esPortal) {
            const yS = toScreen(pl.y + pl.h, PORTAL_H);
            if (yS > -PORTAL_H && yS < H) {
              items.push(
                <img
                  key={`po_${pl.id}`}
                  src={SP.portal}
                  alt=""
                  style={{
                    position: 'absolute',
                    left: `${pl.x + pl.w / 2 - PORTAL_W / 2}px`,
                    top: `${yS}px`,
                    width: `${PORTAL_W}px`, height: `${PORTAL_H}px`,
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 4px 10px rgba(176,91,181,0.6))',
                    animation: 'sj-portal-glow 1.4s ease-in-out infinite',
                  }}
                />
              );
            }
          }
          if (pl.objeto && !pl.objeto.usado) {
            const yS = toScreen(pl.y + pl.h + 4, OBJ_H);
            if (yS > -OBJ_H && yS < H) {
              items.push(
                <img
                  key={`o_${pl.id}`}
                  src={pl.objeto.tipo === 'estrella' ? SP.estrella : SP.flor}
                  alt=""
                  style={{
                    position: 'absolute',
                    left: `${pl.x + pl.w / 2 - OBJ_W / 2}px`,
                    top: `${yS}px`,
                    width: `${OBJ_W}px`, height: `${OBJ_H}px`,
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    animation: 'sj-obj-bob 1.6s ease-in-out infinite',
                  }}
                />
              );
            }
          }
          return items.length > 0 ? <React.Fragment key={`it_${pl.id}`}>{items}</React.Fragment> : null;
        })}

        {/* Enemigo con aura pulsante */}
        {enemigoRef.current && (() => {
          const yS = toScreen(enemigoRef.current.y, ENEMIGO_H);
          const fueraDePantalla = yS > H + ENEMIGO_H;
          // Si está fuera de pantalla (todavía no llega), pintar flecha indicadora
          if (fueraDePantalla) {
            return (
              <div style={{
                position: 'absolute',
                left: `${playerRef.current.x - 22}px`,
                bottom: '10px',
                fontSize: '32px',
                pointerEvents: 'none',
                animation: 'sj-flecha-bob 0.55s ease-in-out infinite',
                filter: 'drop-shadow(0 0 8px rgba(255,0,0,0.9))',
                zIndex: 50,
              }}>
                ⚠️
              </div>
            );
          }
          return (
            <img
              src={SP.enemigo}
              alt=""
              style={{
                position: 'absolute',
                left: `${playerRef.current.x - ENEMIGO_W / 2}px`,
                top: `${yS}px`,
                width: `${ENEMIGO_W}px`, height: `${ENEMIGO_H}px`,
                objectFit: 'contain',
                pointerEvents: 'none',
                animation: 'sj-enemigo-pulse 0.8s ease-in-out infinite',
                zIndex: 25,
              }}
            />
          );
        })()}

        {/* Viñeta roja en los bordes mientras el enemigo está activo */}
        {enemigoRef.current && (
          <div style={{
            position: 'absolute', inset: 0,
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 60px 12px rgba(255, 0, 0, 0.45)',
            animation: 'sj-vignette-pulse 1s ease-in-out infinite',
            zIndex: 40,
          }} />
        )}

        {/* Aviso al aparecer (1.5s) */}
        {enemigoRef.current && (performance.now() - enemigoSpawnAtRef.current < 1500) && (
          <div style={{
            position: 'absolute',
            top: '30%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(220, 0, 0, 0.92)',
            color: 'white',
            padding: '12px 22px',
            borderRadius: '14px',
            fontWeight: 800, fontSize: '18px',
            letterSpacing: '0.5px',
            boxShadow: '0 8px 24px rgba(220,0,0,0.55)',
            animation: 'sj-aviso-in 0.3s ease-out',
            pointerEvents: 'none',
            zIndex: 60,
          }}>
            ¡Te persiguen!
          </div>
        )}

        {/* Player */}
        {estado !== 'inicio' && (
          <img
            src={playerSpriteSrc}
            alt="Nuvia"
            style={{
              position: 'absolute',
              left: `${playerRef.current.x - PLAYER_W / 2}px`,
              top: `${toScreen(playerRef.current.y, PLAYER_H)}px`,
              width: `${PLAYER_W}px`, height: `${PLAYER_H}px`,
              objectFit: 'contain',
              pointerEvents: 'none',
              transform: playerRef.current.dir < 0 ? 'scaleX(-1)' : 'none',
              filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.3))',
              zIndex: 20,
            }}
          />
        )}

        {/* Overlays */}
        {estado === 'pausa' && <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Pausa</h2>
          <p style={{ color: 'var(--text-light)', textAlign: 'center', fontSize: '14px', margin: '8px 24px 18px' }}>
            Juego en pausa. ¡Tómate un respiro!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px', width: '100%', maxWidth: '240px' }}>
            <button onClick={togglePausa} style={{ ...btn, justifyContent: 'center' }}>
              <Play size={18} fill="white" /> Reanudar
            </button>
            <button onClick={onVolverAlListado} style={{ ...btn, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
              Volver atrás
            </button>
            <button onClick={onSalir} style={{ ...btn, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
              Salir
            </button>
          </div>
        </Overlay>}
        {estado === 'inicio' && <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Sky Jump</h2>
          <p style={{ color: 'var(--text-light)', textAlign: 'center', fontSize: '14px', margin: '8px 24px 18px' }}>
            Inclina el móvil o arrastra el dedo para mover a Nuvia.
            Salta de plataforma en plataforma y llega lo más alto que puedas.<br />
            ⭐ Estrella = turbo · 🌸 Flor = vuelo lento<br />
            A 200 m hay un portal: cógelo o el enemigo te perseguirá.
          </p>
          <button onClick={empezar} style={btn}>
            <Play size={18} fill="white" /> Empezar
          </button>
          {recordLocal > 0 && (
            <p style={{ marginTop: '14px', fontSize: '13px', color: 'var(--text-light)' }}>
              Récord: <strong style={{ color: 'var(--primary)' }}>{recordLocal} m</strong>
            </p>
          )}
        </Overlay>}

        {estado === 'gameover' && <Overlay>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>¡Te caíste! 🌪</h2>
          <p style={{ color: 'var(--text-light)', textAlign: 'center', fontSize: '14px', margin: '8px 24px 4px' }}>
            Has llegado a <strong style={{ color: 'var(--primary)' }}>{score} m</strong>.
          </p>
          {score >= recordLocal && score > 0 && (
            <p style={{ margin: 0, fontSize: '13px', color: '#F6416C', fontWeight: 700 }}>
              ¡Nuevo récord!
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px', width: '100%', maxWidth: '240px' }}>
            <button onClick={empezar} style={{ ...btn, justifyContent: 'center' }}>
              <RefreshCw size={18} /> Otra vez
            </button>
            <button onClick={onVolverAlListado} style={{ ...btn, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
              Volver atrás
            </button>
            <button onClick={onSalir} style={{ ...btn, background: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', justifyContent: 'center' }}>
              Salir
            </button>
          </div>
        </Overlay>}
      </div>

      <style>{`
        @keyframes sj-portal-glow {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 4px 10px rgba(176,91,181,0.6)); }
          50%      { transform: scale(1.07); filter: drop-shadow(0 4px 14px rgba(176,91,181,0.9)); }
        }
        @keyframes sj-obj-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
        @keyframes sj-enemigo-pulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(255,0,0,0.7)) drop-shadow(0 0 20px rgba(255,30,30,0.5));
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 18px rgba(255,0,0,0.95)) drop-shadow(0 0 32px rgba(255,40,40,0.75));
          }
        }
        @keyframes sj-vignette-pulse {
          0%, 100% { box-shadow: inset 0 0 60px 12px rgba(255,0,0,0.40); }
          50%      { box-shadow: inset 0 0 90px 20px rgba(255,0,0,0.60); }
        }
        @keyframes sj-aviso-in {
          0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          70%  { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes sj-flecha-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

const btn = {
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
    zIndex: 100,
  }}>
    {children}
  </div>
);

