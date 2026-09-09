import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiService } from '../api';
import { revisarLogros } from '../utils/logros';

// Encapsula todo lo necesario para los logros de un minijuego: trae los ya
// desbloqueados al montar, expone una cola de notificaciones (por si se
// desbloquea más de uno a la vez) y el estado del panel de logros.
// Uso típico dentro de un *Game.jsx:
//   const logros = useLogros(JUEGO_ID);
//   ...al terminar la partida: logros.registrarStats({ puntos, vidas, monedas });
//   ...en el JSX: <LogroToast cola={logros.cola} onSiguiente={logros.avanzarCola} />
export function useLogros(juego) {
  const desbloqueadosRef = useRef(new Set());
  const [cola, setCola] = useState([]);
  const [showLogros, setShowLogros] = useState(false);

  useEffect(() => {
    let cancel = false;
    ApiService.getLogros().then(ids => {
      if (cancel) return;
      desbloqueadosRef.current = new Set(Array.isArray(ids) ? ids : []);
    });
    return () => { cancel = true; };
  }, []);

  const registrarStats = useCallback((stats) => {
    const nuevos = revisarLogros(juego, stats, desbloqueadosRef.current);
    if (nuevos.length === 0) return;
    for (const logro of nuevos) {
      desbloqueadosRef.current.add(logro.id); // evita duplicados en la misma sesión
      ApiService.desbloquearLogro(logro.id).catch(() => {});
    }
    setCola(q => [...q, ...nuevos]);
  }, [juego]);

  const avanzarCola = useCallback(() => {
    setCola(q => q.slice(1));
  }, []);

  return { cola, avanzarCola, showLogros, setShowLogros, registrarStats };
}
