import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../api';

const MASCOTA_SIZE = 70;
const CYCLE_SECS = 28;
const FRAME_MS = 130;

// Filas del sprite (0-indexed) — sheet 6 cols × 4 filas
const ROW_BACK   = 0;
const ROW_LEFT   = 1;
const ROW_FRONT  = 2;
const ROW_RIGHT  = 3;

export default function MascotaNuvia({ user }) {
  const navigate = useNavigate();
  const [avisos, setAvisos] = useState([]);
  const [indiceAviso, setIndiceAviso] = useState(0);
  const [spriteDisponible, setSpriteDisponible] = useState(null);
  const [flotandoDisponible, setFlotandoDisponible] = useState(null);

  const ocultar = !user;

  useEffect(() => {
    if (ocultar) return;
    const img1 = new Image();
    img1.onload = () => setSpriteDisponible(true);
    img1.onerror = () => setSpriteDisponible(false);
    img1.src = '/mascota-walk.png';

    const img2 = new Image();
    img2.onload = () => setFlotandoDisponible(true);
    img2.onerror = () => setFlotandoDisponible(false);
    img2.src = '/mascota-flotando.png';
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

  if (ocultar) return null;

  const aviso = avisos[indiceAviso];

  const onMascotaClick = () => {
    if (!aviso) return;
    if (aviso.tipo === 'mensaje_pareja') navigate('/pareja');
    else if (aviso.tipo === 'respuesta_soporte') navigate('/soporte');
    else if (aviso.tipo === 'soporte_admin') navigate('/admin/soporte');
    else if (aviso.tipo === 'reporte_pendiente') navigate('/admin/reportes');
  };

  const usarSprite = spriteDisponible === true;
  const usarFlotando = flotandoDisponible === true;

  return (
    <>
      <style>{`
        /* Movimiento horizontal */
        @keyframes mascota-walk {
          0%   { left: 0; }
          24%  { left: 36vw; }
          27%  { left: 36vw; }
          39%  { left: 36vw; }
          50%  { left: calc(100vw - ${MASCOTA_SIZE}px); }
          68%  { left: calc(100vw - ${MASCOTA_SIZE}px - 36vw); }
          72%  { left: calc(100vw - ${MASCOTA_SIZE}px - 36vw); }
          88%  { left: calc(100vw - ${MASCOTA_SIZE}px - 36vw); }
          100% { left: 0; }
        }

        /* Flotación vertical (solo durante los tramos de flotar) */
        @keyframes mascota-flotar {
          0%, 27%   { transform: translateY(0); }
          30%       { transform: translateY(-8px); }
          33%       { transform: translateY(-24px); }
          36%       { transform: translateY(-14px); }
          39%, 72%  { transform: translateY(0); }
          76%       { transform: translateY(-8px); }
          80%       { transform: translateY(-24px); }
          84%       { transform: translateY(-14px); }
          88%, 100% { transform: translateY(0); }
        }

        /* Sprite: avance de cuadros (walk cycle) */
        @keyframes mascota-frames {
          from { background-position-x: 0px; }
          to   { background-position-x: -${MASCOTA_SIZE * 6}px; }
        }

        /* Sprite: cambia de fila según el tramo del ciclo */
        @keyframes mascota-direccion {
          0%,  23.9% { background-position-y: -${MASCOTA_SIZE * ROW_RIGHT}px; }
          24%, 38.9% { background-position-y: -${MASCOTA_SIZE * ROW_FRONT}px; }
          39%, 49.9% { background-position-y: -${MASCOTA_SIZE * ROW_RIGHT}px; }
          50%, 67.9% { background-position-y: -${MASCOTA_SIZE * ROW_LEFT}px; }
          68%, 87.9% { background-position-y: -${MASCOTA_SIZE * ROW_FRONT}px; }
          88%, 99.9% { background-position-y: -${MASCOTA_SIZE * ROW_LEFT}px; }
          100%       { background-position-y: -${MASCOTA_SIZE * ROW_RIGHT}px; }
        }

        /* Opacidad de la capa "caminando" — visible salvo cuando flota */
        @keyframes capa-andando-opacidad {
          0%,  27%   { opacity: 1; }
          28%, 38%   { opacity: 0; }   /* primera flotación */
          39%, 72%   { opacity: 1; }
          73%, 87%   { opacity: 0; }   /* segunda flotación */
          88%, 100%  { opacity: 1; }
        }

        /* Opacidad de la capa "flotando" — inversa */
        @keyframes capa-flotando-opacidad {
          0%,  27%   { opacity: 0; transform: scale(0.85); }
          28%, 38%   { opacity: 1; transform: scale(0.85); }
          39%, 72%   { opacity: 0; transform: scale(0.85); }
          73%, 87%   { opacity: 1; transform: scale(0.85); }
          88%, 100%  { opacity: 0; transform: scale(0.85); }
        }

        /* Fallback (sin sprite) */
        @keyframes mascota-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes mascota-flip {
          0%, 49.9%  { transform: scaleX(1); }
          50%, 99.9% { transform: scaleX(-1); }
          100%       { transform: scaleX(1); }
        }

        @keyframes bocadillo-pop {
          from { opacity: 0; transform: translateX(-50%) translateY(0)    scale(0.6); }
          to   { opacity: 1; transform: translateX(-50%) translateY(-6px) scale(1);   }
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
        .nuvia-mascota-flotar {
          position: relative;
          width: 100%;
          height: 100%;
          animation: mascota-flotar ${CYCLE_SECS}s ease-in-out infinite;
        }

        /* Capas apiladas */
        .nuvia-capa {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        /* SPRITE MODE — caminando */
        .nuvia-mascota-sprite {
          background-image: url('/mascota-walk.png');
          background-size: ${MASCOTA_SIZE * 6}px ${MASCOTA_SIZE * 4}px;
          background-repeat: no-repeat;
          background-position: 0px -${MASCOTA_SIZE * ROW_RIGHT}px;
          pointer-events: auto;
          cursor: pointer;
          animation:
            mascota-frames ${FRAME_MS * 6}ms steps(6) infinite,
            mascota-direccion ${CYCLE_SECS}s steps(1) infinite,
            capa-andando-opacidad ${CYCLE_SECS}s steps(1) infinite;
          filter: drop-shadow(0 4px 6px rgba(176, 91, 181, 0.25));
        }

        /* Capa flotando (sólo se ve en los momentos de flotación) */
        .nuvia-mascota-flotando-img {
          pointer-events: auto;
          cursor: pointer;
          background-image: url('/mascota-flotando.png');
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          transform-origin: center;
          animation: capa-flotando-opacidad ${CYCLE_SECS}s steps(1) infinite;
          filter: drop-shadow(0 4px 6px rgba(176, 91, 181, 0.25));
        }

        /* FALLBACK MODE */
        .nuvia-mascota-fallback {
          width: 100%;
          height: 100%;
          animation: mascota-bob 0.5s ease-in-out infinite;
        }
        .nuvia-mascota-fallback img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
          pointer-events: auto;
          cursor: pointer;
          animation: mascota-flip ${CYCLE_SECS}s steps(1) infinite;
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
      <div className="nuvia-mascota-wrap">
        {aviso && (
          <div className="nuvia-bocadillo" onClick={onMascotaClick}>
            {aviso.texto}
          </div>
        )}
        <div className="nuvia-mascota-flotar">
          {usarSprite ? (
            <>
              <div
                className="nuvia-capa nuvia-mascota-sprite"
                onClick={onMascotaClick}
                aria-label="Nuvia"
              />
              {usarFlotando && (
                <div
                  className="nuvia-capa nuvia-mascota-flotando-img"
                  onClick={onMascotaClick}
                  aria-hidden
                />
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
    </>
  );
}
