import React, { useEffect, useState } from 'react';
import { X, Trophy } from 'lucide-react';
import { ApiService } from '../api';

// Rangos del ranking global, por posición (1-indexed). El primero que
// cumpla posicion <= max es el rango de esa fila.
const RANGOS = [
  { max: 1, nombre: 'Diosa', color: '#F59E0B', icono: '👑' },
  { max: 5, nombre: 'Flor', color: '#EC4899', icono: '🌸' },
  { max: 15, nombre: 'Dragona', color: '#DC2626', icono: '🐉' },
  { max: 50, nombre: 'Púrpura', color: '#8B5CF6', icono: '💜' },
  { max: 100, nombre: 'Diamante', color: '#38BDF8', icono: '💎' },
  { max: 200, nombre: 'Oro', color: '#EAB308', icono: '🥇' },
  { max: 350, nombre: 'Plata', color: '#94A3B8', icono: '🥈' },
  { max: Infinity, nombre: 'Bronce', color: '#B45309', icono: '🥉' },
];

const rangoDe = (posicion) => RANGOS.find(r => posicion <= r.max) || RANGOS[RANGOS.length - 1];

export default function RankingModal({ juego, nombreJuego, onClose }) {
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'ok' | 'error'
  const [tabla, setTabla] = useState([]);
  const [miPosicion, setMiPosicion] = useState(null);

  useEffect(() => {
    let cancel = false;
    ApiService.getRanking(juego).then(res => {
      if (cancel) return;
      if (!res) { setEstado('error'); return; }
      setTabla(res.tabla || []);
      setMiPosicion(res.mi_posicion ?? null);
      setEstado('ok');
    });
    return () => { cancel = true; };
  }, [juego]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(6px)',
      zIndex: 300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        padding: '20px 18px',
        width: '100%',
        maxWidth: '380px',
        maxHeight: 'calc(100dvh - 100px)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={22} color="var(--primary, #b05bb5)" />
            <h3 style={{ margin: 0, color: 'var(--text-dark, #3d2b3f)', fontSize: '18px' }}>Ranking{nombreJuego ? ` · ${nombreJuego}` : ''}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-light, #8a6a8d)', cursor: 'pointer', padding: 0 }}>
            <X size={22} />
          </button>
        </div>

        {estado === 'cargando' && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-light, #8a6a8d)', fontSize: '14px' }}>
            Cargando ranking...
          </div>
        )}

        {estado === 'error' && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-light, #8a6a8d)', fontSize: '14px' }}>
            No se pudo cargar el ranking. Inténtalo de nuevo.
          </div>
        )}

        {estado === 'ok' && tabla.length === 0 && (
          <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--text-light, #8a6a8d)', fontSize: '14px' }}>
            Nadie tiene puntos todavía. ¡Juega un minijuego para entrar al ranking!
          </div>
        )}

        {estado === 'ok' && tabla.length > 0 && (
          <>
            {miPosicion == null && (
              <div style={{ marginTop: '14px', fontSize: '12.5px', color: 'var(--text-light, #8a6a8d)', textAlign: 'center' }}>
                Aún no tienes puntos — juega un minijuego para entrar al ranking
              </div>
            )}

            {/* Lista completa, con scroll */}
            <div style={{ overflowY: 'auto', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {tabla.map(entrada => {
                const rango = rangoDe(entrada.posicion);
                const esYo = entrada.posicion === miPosicion;
                return (
                  <div
                    key={entrada.posicion}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '12px',
                      background: esYo ? 'rgba(176, 91, 181, 0.1)' : '#F8FAFC',
                      border: esYo ? '1.5px solid var(--primary, #b05bb5)' : '1.5px solid transparent',
                    }}
                  >
                    <span style={{ minWidth: '26px', textAlign: 'center', fontWeight: 700, fontSize: '12px', color: 'var(--text-light, #8a6a8d)' }}>
                      #{entrada.posicion}
                    </span>
                    <span style={{ fontSize: '20px' }}>{rango.icono}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-dark, #3d2b3f)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entrada.nombre}{esYo ? ' (tú)' : ''}
                      </div>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: rango.color }}>{rango.nombre}</div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-dark, #3d2b3f)' }}>{entrada.puntos}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
