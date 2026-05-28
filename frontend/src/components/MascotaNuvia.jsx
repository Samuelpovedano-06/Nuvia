import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ApiService } from '../api';

const MASCOTA_SIZE = 70;
const CYCLE_SECS = 28;
const FRAME_MS = 130;
const DESCENT_MS = 700;

// Sheet 6 cols × 2 filas: fila 0 = right, fila 1 = left
const ROW_RIGHT = 0;
const ROW_LEFT  = 1;
const COLS      = 6;
const ROWS      = 2;

// Rutas donde la mascota "hada" (la que pasea por la pantalla) no debe salir.
// En /juego ya hay otra mascota interactiva, así que aquí la ocultamos.
const RUTAS_SIN_MASCOTA = ['/juego'];

export default function MascotaNuvia({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [avisos, setAvisos] = useState([]);
  const [indiceAviso, setIndiceAviso] = useState(0);
  const [walkOk, setWalkOk] = useState(null);
  const [sentadoOk, setSentadoOk] = useState(null);
  const [flotandoOk, setFlotandoOk] = useState(null);

  // Estados visuales:
  //   hasAviso  -> lift arriba + flotando visible (instantáneo al cambiar aviso)
  //   paused    -> wrap + animaciones de capas en pausa (se mantiene durante el descenso)
  //   centerX   -> offset px para llevar la mascota al centro mientras flota
  const [hasAviso, setHasAviso] = useState(false);
  const [paused, setPaused] = useState(false);
  const [centerX, setCenterX] = useState(0);
  const wrapRef = useRef(null);

  const ocultar = !user || RUTAS_SIN_MASCOTA.some(r => location.pathname.startsWith(r));

  useEffect(() => {
    if (ocultar) return;
    const check = (src, set) => {
      const img = new Image();
      img.onload = () => set(true);
      img.onerror = () => set(false);
      img.src = src;
    };
    check('/mascota-walk.png', setWalkOk);
    check('/mascota-sentado.png', setSentadoOk);
    check('/mascota-flotando.png', setFlotandoOk);
  }, [ocultar]);

  useEffect(() => {
    if (ocultar) return;
    let cancel = false;
    const fetchAvisos = async () => {
      try {
        const data = await ApiService.getAvisosMascota();
        if (!cancel) setAvisos(Array.isArray(data) ? data : []);
      } catch (_) {}
    };
    fetchAvisos();
    const id = setInterval(fetchAvisos, 15000);
    return () => { cancel = true; clearInterval(id); };
  }, [ocultar]);

  useEffect(() => {
    if (avisos.length <= 1) { setIndiceAviso(0); return; }
    const id = setInterval(() => setIndiceAviso(i => (i + 1) % avisos.length), 5000);
    return () => clearInterval(id);
  }, [avisos.length]);

  const aviso = avisos[indiceAviso];
  const tieneAviso = !!aviso;

  // Coordinación de estados:
  // - aviso aparece    -> paused+hasAviso=true al instante
  // - aviso desaparece -> hasAviso=false al instante (descenso 700ms), paused=false al terminar
  useEffect(() => {
    if (tieneAviso) {
      // 1. Pausar primero para que el wrap deje de moverse
      setPaused(true);
      setHasAviso(true);
      // 2. Doble rAF: el primero deja que React aplique la clase .paused,
      //    el segundo asegura que el navegador ya tiene congelada la animación
      //    antes de medir. Si midiéramos en el primer rAF, el `left` de la
      //    animación aún podría estar interpolando y el centrado quedaría off.
      let raf2;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (wrapRef.current) {
            const rect = wrapRef.current.getBoundingClientRect();
            const currentCenter = rect.left + rect.width / 2;
            const targetCenter = window.innerWidth / 2;
            setCenterX(targetCenter - currentCenter);
          }
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    } else {
      // Volver al sitio donde se quedó el wrap
      setCenterX(0);
      setHasAviso(false);
      const t = setTimeout(() => setPaused(false), DESCENT_MS);
      return () => clearTimeout(t);
    }
  }, [tieneAviso]);

  if (ocultar) return null;

  const onMascotaClick = () => {
    if (!aviso) return;
    if (aviso.tipo === 'mensaje_pareja') navigate('/pareja');
    else if (aviso.tipo === 'respuesta_soporte') navigate('/soporte');
    else if (aviso.tipo === 'soporte_admin') navigate('/admin/soporte');
    else if (aviso.tipo === 'reporte_pendiente') navigate('/admin/reportes');
    else if (aviso.tipo === 'ciclo_abierto') navigate('/calendar');
    else if (aviso.tipo === 'ciclo_irregular') navigate('/wellness?tab=habits');
    else if (aviso.tipo === 'regla_retrasada') navigate('/wellness?tab=habits');
    else if (aviso.tipo === 'sintomas_atipicos') navigate('/wellness?tab=habits');

    // Para los avisos de salud, marcar como descartados en el backend (24h sin repetir).
    // Los otros (mensaje_pareja, reporte_pendiente, etc.) desaparecen solos al gestionarlos.
    const descartables = ['ciclo_abierto', 'ciclo_irregular', 'regla_retrasada', 'sintomas_atipicos'];
    if (descartables.includes(aviso.tipo)) {
      ApiService.descartarAvisoMascota(aviso.tipo);
    }

    setAvisos([]);
    setIndiceAviso(0);
  };

  const usarSprites = walkOk === true;

  return (
    <>
      <style>{`
        @keyframes mascota-walk {
          0%   { left: 0; }
          22%  { left: 36vw; }
          25%  { left: 36vw; }
          50%  { left: calc(100vw - ${MASCOTA_SIZE}px); }
          72%  { left: calc(100vw - ${MASCOTA_SIZE}px - 36vw); }
          75%  { left: calc(100vw - ${MASCOTA_SIZE}px - 36vw); }
          100% { left: 0; }
        }
        @keyframes mascota-frames {
          from { background-position-x: 0px; }
          to   { background-position-x: -${MASCOTA_SIZE * COLS}px; }
        }
        @keyframes mascota-direccion {
          0%,  49.9% { background-position-y: -${MASCOTA_SIZE * ROW_RIGHT}px; }
          50%, 99.9% { background-position-y: -${MASCOTA_SIZE * ROW_LEFT}px; }
          100%       { background-position-y: -${MASCOTA_SIZE * ROW_RIGHT}px; }
        }
        @keyframes capa-andando-ciclo {
          0%,  22%    { opacity: 1; }
          22.1%, 25%  { opacity: 0; }
          25.1%, 72%  { opacity: 1; }
          72.1%, 75%  { opacity: 0; }
          75.1%, 100% { opacity: 1; }
        }
        @keyframes capa-sentado-ciclo {
          0%,  22%    { opacity: 0; }
          22.1%, 25%  { opacity: 1; }
          25.1%, 72%  { opacity: 0; }
          72.1%, 75%  { opacity: 1; }
          75.1%, 100% { opacity: 0; }
        }
        @keyframes flotar-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes bocadillo-pop {
          from { opacity: 0; transform: translateX(-50%) translateY(0)     scale(0.6); }
          to   { opacity: 1; transform: translateX(-50%) translateY(-12px) scale(1);   }
        }
        @keyframes mascota-fallback-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes mascota-fallback-flip {
          0%, 49.9%  { transform: scaleX(1); }
          50%, 99.9% { transform: scaleX(-1); }
          100%       { transform: scaleX(1); }
        }

        .nuvia-mascota-wrap {
          position: fixed;
          left: 0;
          bottom: calc(75px + env(safe-area-inset-bottom));
          width: ${MASCOTA_SIZE}px;
          height: ${MASCOTA_SIZE}px;
          z-index: 999;
          pointer-events: none;
          animation: mascota-walk ${CYCLE_SECS}s linear infinite;
          will-change: left;
        }
        /* Pausa global: el wrap y las animaciones internas paran a la vez para mantener sincronía */
        .nuvia-mascota-wrap.paused,
        .nuvia-mascota-wrap.paused .nuvia-capa-andando,
        .nuvia-mascota-wrap.paused .nuvia-capa-sentado {
          animation-play-state: paused;
        }

        /* Capa "centrar": desplazamiento horizontal hasta el centro cuando flota */
        .nuvia-mascota-centrar {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform ${DESCENT_MS}ms cubic-bezier(0.34, 1.05, 0.64, 1);
          transform: translateX(0);
          will-change: transform;
        }

        .nuvia-mascota-lift {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform ${DESCENT_MS}ms cubic-bezier(0.34, 1.2, 0.64, 1);
          transform: translateY(0);
        }
        .nuvia-mascota-wrap.has-aviso .nuvia-mascota-lift {
          transform: translateY(-32px);
        }

        .nuvia-mascota-bob {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .nuvia-mascota-wrap.has-aviso .nuvia-mascota-bob {
          animation: flotar-bob 2.4s ease-in-out infinite;
        }

        /* Grupos de capas: opacidad controlada por has-aviso con transición suave */
        .nuvia-grupo-andando {
          position: absolute;
          inset: 0;
          transition: opacity 0.4s ease-in-out;
          opacity: 1;
        }
        .nuvia-mascota-wrap.has-aviso .nuvia-grupo-andando {
          opacity: 0;
        }

        .nuvia-grupo-flotando {
          position: absolute;
          inset: 0;
          transition: opacity 0.4s ease-in-out;
          opacity: 0;
        }
        .nuvia-mascota-wrap.has-aviso .nuvia-grupo-flotando {
          opacity: 1;
        }

        .nuvia-capa {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: auto;
          cursor: pointer;
          filter: drop-shadow(0 4px 6px rgba(176, 91, 181, 0.25));
        }

        .nuvia-capa-andando {
          background-image: url('/mascota-walk.png');
          background-size: ${MASCOTA_SIZE * COLS}px ${MASCOTA_SIZE * ROWS}px;
          background-repeat: no-repeat;
          background-position: 0px 0px;
          animation:
            mascota-frames ${FRAME_MS * COLS}ms steps(${COLS}) infinite,
            mascota-direccion ${CYCLE_SECS}s steps(1) infinite,
            capa-andando-ciclo ${CYCLE_SECS}s steps(1) infinite;
        }

        .nuvia-capa-sentado {
          background-image: url('/mascota-sentado.png');
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          animation: capa-sentado-ciclo ${CYCLE_SECS}s steps(1) infinite;
          opacity: 0;
        }

        .nuvia-capa-flotando {
          background-image: url('/mascota-flotando.png');
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 1;
        }

        .nuvia-mascota-fallback {
          width: 100%;
          height: 100%;
          animation: mascota-fallback-bob 0.5s ease-in-out infinite;
        }
        .nuvia-mascota-fallback img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
          pointer-events: auto;
          cursor: pointer;
          animation: mascota-fallback-flip ${CYCLE_SECS}s steps(1) infinite;
          filter: drop-shadow(0 4px 6px rgba(176, 91, 181, 0.3));
        }

        .nuvia-bocadillo {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-12px);
          background: white;
          color: var(--text-dark);
          padding: 8px 14px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.3;
          white-space: normal;
          width: max-content;
          max-width: 250px;
          text-align: center;
          box-shadow: 0 6px 18px rgba(176, 91, 181, 0.25);
          border: 1px solid rgba(176, 91, 181, 0.15);
          pointer-events: auto;
          cursor: pointer;
          overflow: hidden;
          animation: bocadillo-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 10;
        }
        .nuvia-bocadillo::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: white;
        }
      `}</style>
      <div
        ref={wrapRef}
        className={[
          'nuvia-mascota-wrap',
          paused ? 'paused' : '',
          hasAviso ? 'has-aviso' : ''
        ].filter(Boolean).join(' ')}
      >
        <div
          className="nuvia-mascota-centrar"
          style={{ transform: `translateX(${centerX}px)` }}
        >
        <div className="nuvia-mascota-lift">
          {aviso && (
            <div className="nuvia-bocadillo" onClick={onMascotaClick}>
              {aviso.texto}
            </div>
          )}
          <div className="nuvia-mascota-bob">
            {usarSprites ? (
              <>
                <div className="nuvia-grupo-andando">
                  <div className="nuvia-capa nuvia-capa-andando" onClick={onMascotaClick} aria-label="Nuvia" />
                  {sentadoOk && (
                    <div className="nuvia-capa nuvia-capa-sentado" onClick={onMascotaClick} aria-hidden />
                  )}
                </div>
                {flotandoOk && (
                  <div className="nuvia-grupo-flotando">
                    <div className="nuvia-capa nuvia-capa-flotando" onClick={onMascotaClick} aria-hidden />
                  </div>
                )}
              </>
            ) : (
              <div className="nuvia-mascota-fallback">
                <img
                  src="/mascota.png"
                  alt="Nuvia"
                  onClick={onMascotaClick}
                  onError={(e) => {
                    if (!e.currentTarget.dataset.fallback) {
                      e.currentTarget.dataset.fallback = '1';
                      e.currentTarget.src = '/mascota.svg';
                    } else {
                      e.currentTarget.style.display = 'none';
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
