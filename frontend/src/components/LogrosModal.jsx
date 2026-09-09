import React, { useEffect, useState } from 'react';
import { Trophy, X, Lock } from 'lucide-react';
import { ApiService } from '../api';
import { LOGROS } from '../utils/logros';
import LogroIcono from './LogroIcono';

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
        background: 'var(--white, #ffffff)', borderRadius: '24px', padding: '20px 18px', width: '100%',
        maxWidth: '380px', maxHeight: 'calc(100dvh - 100px)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={22} color="var(--primary, #b05bb5)" />
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
                    background: conseguido ? 'rgba(176,91,181,0.1)' : 'rgba(128,128,128,0.1)',
                    border: conseguido ? '1.5px solid var(--primary, #b05bb5)' : '1.5px solid transparent',
                  }}
                >
                  <div style={{
                    position: 'relative', width: '42px', height: '42px', flexShrink: 0, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: conseguido ? 'linear-gradient(135deg, var(--primary, #b05bb5) 0%, var(--primary-light, #e891c8) 100%)' : '#1E1B24',
                    filter: conseguido ? 'none' : 'grayscale(1)',
                  }}>
                    <div style={{ opacity: conseguido ? 1 : 0.35 }}>
                      <LogroIcono icono={logro.icono} size={20} />
                    </div>
                    {!conseguido && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)'
                      }}>
                        <Lock size={16} color="#FFFFFF" />
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: conseguido ? 'var(--primary, #b05bb5)' : 'var(--text-dark, #334155)' }}>
                      {logro.nombre}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-light, #64748B)' }}>
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
