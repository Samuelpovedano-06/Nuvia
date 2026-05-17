import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ApiService } from '../api';

const RUTAS_SIN_MASCOTA = ['/login', '/register', '/soporte', '/admin/soporte', '/pareja'];

const MASCOTA_SIZE = 60;
const ANIM_SECS = 18;

export default function MascotaNuvia({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [avisos, setAvisos] = useState([]);
  const [indiceAviso, setIndiceAviso] = useState(0);

  const ocultar = !user || RUTAS_SIN_MASCOTA.includes(location.pathname);

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

  return (
    <>
      <style>{`
        @keyframes mascota-walk {
          0%   { left: 0; }
          50%  { left: calc(100vw - ${MASCOTA_SIZE}px); }
          100% { left: 0; }
        }
        @keyframes mascota-flip {
          0%, 49.9%   { transform: scaleX(1); }
          50%, 99.9%  { transform: scaleX(-1); }
          100%        { transform: scaleX(1); }
        }
        @keyframes mascota-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes bocadillo-pop {
          from { opacity: 0; transform: translateX(-50%) translateY(0) scale(0.6); }
          to   { opacity: 1; transform: translateX(-50%) translateY(-6px) scale(1); }
        }

        .nuvia-mascota-wrap {
          position: fixed;
          left: 0;
          bottom: calc(75px + env(safe-area-inset-bottom));
          width: ${MASCOTA_SIZE}px;
          height: ${MASCOTA_SIZE}px;
          z-index: 999;
          pointer-events: none;
          animation: mascota-walk ${ANIM_SECS}s linear infinite;
          will-change: left;
        }
        .nuvia-mascota-bob {
          width: 100%; height: 100%;
          animation: mascota-bob 0.5s ease-in-out infinite;
          pointer-events: auto;
          cursor: pointer;
        }
        .nuvia-mascota-img {
          width: 100%; height: 100%;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
          animation: mascota-flip ${ANIM_SECS}s steps(1) infinite;
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
        <div className="nuvia-mascota-bob" onClick={onMascotaClick}>
          <img
            className="nuvia-mascota-img"
            src="/mascota.png"
            alt="Nuvia"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      </div>
    </>
  );
}
