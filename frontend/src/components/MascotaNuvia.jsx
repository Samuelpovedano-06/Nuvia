import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function MascotaNuvia({ user }) {
  const navigate = useNavigate();
  const [avisos, setAvisos] = useState([]);
  const [indiceAviso, setIndiceAviso] = useState(0);
  const [walkOk, setWalkOk] = useState(null);
  const [sentadoOk, setSentadoOk] = useState(null);
  const [flotandoOk, setFlotandoOk] = useState(null);

  // Estados visuales (desincronizados del aviso para que el descenso sea suave)
  const [enAviso, setEnAviso] = useState(false);   // lift arriba + wrap paused
  const [mostrarFlotando, setMostrarFlotando] = useState(false); // capa flotando renderizada

  const ocultar = !user;

  // Probar disponibilidad de imágenes
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

  // Polling de avisos
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

  // Rotar entre avisos cada 5s si hay varios
  useEffect(() => {
    if (avisos.length <= 1) { setIndiceAviso(0); return; }
    const id = setInterval(() => setIndiceAviso(i => (i + 1) % avisos.length), 5000);
    return () => clearInterval(id);
  }, [avisos.length]);

  const aviso = avisos[indiceAviso];
  const tieneAviso = !!aviso;

  // Sincronizar estados visuales con la presencia de aviso
  useEffect(() => {
    if (tieneAviso) {
      // Entrada inmediata: pausar, subir, mostrar flotando
      setEnAviso(true);
      setMostrarFlotando(true);
    } else {
      // Salida: bajar (lift transition) y luego volver a caminar
      setEnAviso(false);  // dispara la transición de bajada
      const t = setTimeout(() => setMostrarFlotando(false), DESCENT_MS);
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
  };

  const usarSprites = walkOk === true;

  return (
    <>
      <style>{`
        /* Movimiento horizontal: caminar + sentarse (sin flotar) */
        @keyframes mascota-walk {
          0%   { left: 0; }
          22%  { left: 36vw; }
          25%  { left: 36vw; }
          50%  { left: calc(100vw - ${MASCOTA_SIZE}px); }
          72%  { left: calc(100vw - ${MASCOTA_SIZE}px - 36vw); }
          75%  { left: calc(100vw - ${MASCOTA_SIZE}px - 36vw); }
          100% { left: 0; }
        }

        /* Frames del walk-cycle */
        @keyframes mascota-frames {
          from { background-position-x: 0px; }
          to   { background-position-x: -${MASCOTA_SIZE * COLS}px; }
        }

        /* Cambio de fila según dirección */
        @keyframes mascota-direccion {
          0%,  49.9% { background-position-y: -${MASCOTA_SIZE * ROW_RIGHT}px; }
          50%, 99.9% { background-position-y: -${MASCOTA_SIZE * ROW_LEFT}px; }
          100%       { background-position-y: -${MASCOTA_SIZE * ROW_RIGHT}px; }
        }

        /* Opacidad de la capa "andando" según el momento del ciclo (oculta en pausas) */
        @keyframes capa-andando-ciclo {
          0%,  22%    { opacity: 1; }
          22.1%, 25%  { opacity: 0; }
          25.1%, 72%  { opacity: 1; }
          72.1%, 75%  { opacity: 0; }
          75.1%, 100% { opacity: 1; }
        }

        /* Opacidad de la capa "sentado" (visible durante las pausas) */
        @keyframes capa-sentado-ciclo {
          0%,  22%    { opacity: 0; }
          22.1%, 25%  { opacity: 1; }
          25.1%, 72%  { opacity: 0; }
          72.1%, 75%  { opacity: 1; }
          75.1%, 100% { opacity: 0; }
        }

        /* Bob suave mientras flota (cuando hay aviso) */
        @keyframes flotar-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }

        @keyframes bocadillo-pop {
          from { opacity: 0; transform: translateX(-50%) translateY(0)    scale(0.6); }
          to   { opacity: 1; transform: translateX(-50%) translateY(-6px) scale(1);   }
        }

        /* Fallback (sin sprites) */
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
        .nuvia-mascota-wrap.paused {
          animation-play-state: paused;
        }

        /* Capa "lift": sube cuando hay aviso, baja al quitarlo, con transition */
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

        /* Capa "bob": pequeño balanceo cuando flota */
        .nuvia-mascota-bob {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .nuvia-mascota-wrap.has-aviso .nuvia-mascota-bob {
          animation: flotar-bob 2.4s ease-in-out infinite;
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

        /* Fallback */
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
          transform: translateX(-50%) translateY(-6px);
          background: white;
          color: var(--text-dark);
          padding: 8px 14px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.3;
          white-space: nowrap;
          box-shadow: 0 6px 18px rgba(176, 91, 181, 0.25);
          border: 1px solid rgba(176, 91, 181, 0.15);
          pointer-events: auto;
          cursor: pointer;
          max-width: 75vw;
          overflow: hidden;
          text-overflow: ellipsis;
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
        className={[
          'nuvia-mascota-wrap',
          (enAviso || mostrarFlotando) ? 'paused' : '',
          enAviso ? 'has-aviso' : ''
        ].filter(Boolean).join(' ')}
      >
        {aviso && (
          <div className="nuvia-bocadillo" onClick={onMascotaClick}>
            {aviso.texto}
          </div>
        )}
        <div className="nuvia-mascota-lift">
          <div className="nuvia-mascota-bob">
            {usarSprites ? (
              mostrarFlotando ? (
                flotandoOk && (
                  <div className="nuvia-capa nuvia-capa-flotando" onClick={onMascotaClick} aria-label="Nuvia" />
                )
              ) : (
                <>
                  <div className="nuvia-capa nuvia-capa-andando" onClick={onMascotaClick} aria-label="Nuvia" />
                  {sentadoOk && (
                    <div className="nuvia-capa nuvia-capa-sentado" onClick={onMascotaClick} aria-hidden />
                  )}
                </>
              )
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
    </>
  );
}
