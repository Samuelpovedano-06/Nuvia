import React, { useEffect, useState } from 'react';
import { Trophy, X, Lock } from 'lucide-react';
import { ApiService } from '../api';
import { LOGROS } from '../utils/logros';

// Panel de logros de un minijuego: los 5 logros de ese juego, en color con
// su icono si ya se consiguieron, o en negro con un candado si no — pero
// siempre mostrando la descripción para saber qué hace falta.
export default function LogrosModal({ juego, nombreJuego, onClose }) {
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'ok' | 'error'
  const [desbloqueados, setDesbloqueados] = useState(new Set());

  useEffect(() => {
    let cancel = false;
    ApiService.getLogros().then(ids => {
      if (cancel) return;
      setDesbloqueados(new Set(Array.isArray(ids) ? ids : []));
      setEstado('ok');
    }).catch(() => { if (!cancel) setEstado('error'); });
    return () => { cancel = true; };
  }, []);

  const lista = LOGROS[juego] || [];
  const conseguidos = lista.filter(l => desbloqueados.has(l.id)).length;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: '24px', padding: '20px 18px', width: '100%',
        maxWidth: '380px', maxHeight: 'calc(100dvh - 100px)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={22} color="#F59E0B" />
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-dark, #3d2b3f)', fontSize: '18px' }}>Logros{nombreJuego ? ` · ${nombreJuego}` : ''}</h3>
              {estado === 'ok' && <div style={{ fontSize: '11px', color: 'var(--text-light, #8a6a8d)', fontWeight: 600 }}>{conseguidos} / {lista.length} conseguidos</div>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-light, #8a6a8d)', cursor: 'pointer', padding: 0 }}>
            <X size={22} />
          </button>
        </div>

        {estado === 'cargando' && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-light, #8a6a8d)', fontSize: '14px' }}>
            Cargando logros...
          </div>
        )}
        {estado === 'error' && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-light, #8a6a8d)', fontSize: '14px' }}>
            No se pudieron cargar los logros. Inténtalo de nuevo.
          </div>
        )}

        {estado === 'ok' && (
          <div style={{ overflowY: 'auto', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lista.map(logro => {
              const conseguido = desbloqueados.has(logro.id);
              return (
                <div
                  key={logro.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '14px',
                    background: conseguido ? 'rgba(245,158,11,0.1)' : '#F1F1F4',
                    border: conseguido ? '1.5px solid #F59E0B' : '1.5px solid transparent',
                  }}
                >
                  <div style={{
                    position: 'relative', width: '42px', height: '42px', flexShrink: 0, borderRadius: '50%',
                    display: 'grid', placeItems: 'center', fontSize: '20px',
                    background: conseguido ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : '#1E1B24',
                    filter: conseguido ? 'none' : 'grayscale(1)',
                  }}>
                    <span style={{ opacity: conseguido ? 1 : 0.35 }}>{logro.icono}</span>
                    {!conseguido && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.35)'
                      }}>
                        <Lock size={16} color="#FFFFFF" />
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: conseguido ? '#92400E' : '#334155' }}>
                      {logro.nombre}
                    </div>
                    <div style={{ fontSize: '11.5px', color: conseguido ? '#B45309' : '#64748B' }}>
                      {logro.descripcion}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
