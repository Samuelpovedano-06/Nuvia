import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, Trash2, X, Ban, ShieldOff, Check } from 'lucide-react';
import { ApiService } from '../api';
import AuthImage from '../components/AuthImage';

export default function AdminReportesScreen() {
  const navigate = useNavigate();
  const [reportes, setReportes] = useState([]);
  const [estadoTab, setEstadoTab] = useState('pendiente');
  const [loading, setLoading] = useState(true);
  const [activo, setActivo] = useState(null); // reporte detalle
  const [motivos, setMotivos] = useState([]); // catálogo

  const [accion, setAccion] = useState(null); // 'eliminar' | 'banear'
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [textoPersonalizado, setTextoPersonalizado] = useState('');
  const [duracionDias, setDuracionDias] = useState(7); // para banear
  const [permanente, setPermanente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState(null);

  const mostrarToast = (m, tipo = 'ok') => { setToast({ m, tipo }); setTimeout(() => setToast(null), 2500); };

  const cargar = async () => {
    setLoading(true);
    try {
      const [r, mots] = await Promise.all([
        ApiService.adminReportesListar(estadoTab),
        ApiService.getMotivosForo(),
      ]);
      setReportes(r);
      setMotivos(mots);
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [estadoTab]);

  // Polling cada 6s en pendientes
  useEffect(() => {
    if (estadoTab !== 'pendiente') return;
    const t = setInterval(async () => {
      try {
        const r = await ApiService.adminReportesListar('pendiente');
        setReportes(r);
      } catch {}
    }, 6000);
    return () => clearInterval(t);
  }, [estadoTab]);

  const abrirAccion = (tipo) => {
    setAccion(tipo);
    setSeleccionados(new Set());
    setTextoPersonalizado('');
    setDuracionDias(7);
    setPermanente(false);
  };

  const ejecutarAccion = async () => {
    if (!activo) return;
    const motivosArr = Array.from(seleccionados);
    if (motivosArr.length === 0) {
      mostrarToast('Selecciona al menos un motivo', 'error'); return;
    }
    if (motivosArr.includes('otros') && !textoPersonalizado.trim()) {
      mostrarToast('Si eliges "Otros" escribe el motivo', 'error'); return;
    }
    setEnviando(true);
    try {
      if (accion === 'eliminar') {
        await ApiService.adminResolverEliminar(activo.id, motivosArr, textoPersonalizado.trim());
        mostrarToast('Publicación eliminada');
      } else if (accion === 'banear') {
        const idAutor = activo.publicacion?.id_autor;
        if (!idAutor) throw new Error('Sin id de autor');
        const dur = permanente ? null : (Number(duracionDias) || 0);
        // Pasamos id_reporte para que el backend también elimine la publicación
        await ApiService.adminBanear(idAutor, motivosArr, textoPersonalizado.trim(), dur, activo.id);
        mostrarToast('Usuaria baneada y publicación eliminada');
      }
      setAccion(null);
      setActivo(null);
      cargar();
    } catch (e) {
      mostrarToast(e.message || 'Error', 'error');
    } finally { setEnviando(false); }
  };

  const anular = async () => {
    if (!activo) return;
    setEnviando(true);
    try {
      await ApiService.adminResolverAnular(activo.id);
      mostrarToast('Reporte anulado');
      setActivo(null);
      cargar();
    } catch (e) {
      mostrarToast(e.message || 'Error', 'error');
    } finally { setEnviando(false); }
  };

  return (
    <div className="screen-container" style={{ paddingBottom: '100px', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={26} />
        </button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', flex: 1 }}>Reportes</h1>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {[
          { id: 'pendiente', label: 'Pendientes' },
          { id: 'eliminado', label: 'Resueltos' },
          { id: 'anulado',   label: 'Anulados' },
        ].map(t => (
          <button key={t.id} onClick={() => setEstadoTab(t.id)} style={{
            flex: 1, padding: '8px 4px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            background: estadoTab === t.id ? 'var(--primary)' : '#f0f0f5',
            color: estadoTab === t.id ? 'white' : 'var(--text-light)',
            fontWeight: '700', fontSize: '12px'
          }}>{t.label}</button>
        ))}
      </div>

      {loading && <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>Cargando…</p>}

      {!loading && reportes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px 20px', opacity: 0.6 }}>
          <Check size={40} style={{ marginBottom: '12px', color: '#10b981' }} />
          <p style={{ color: 'var(--text-light)' }}>No hay reportes {estadoTab === 'pendiente' ? 'pendientes' : estadoTab + 's'}.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reportes.map(r => (
          <div key={r.id} onClick={() => setActivo(r)} style={{
            background: 'white', borderRadius: 14, padding: 14, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(176,91,181,0.08)', border: '1.5px solid transparent',
            transition: 'all 0.15s'
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                background: '#FEE2E2', color: '#DC2626', width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <AlertTriangle size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 2 }}>
                  {r.publicacion ? 'Publicación reportada' : 'Publicación eliminada'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-light)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.publicacion?.contenido?.slice(0, 100) || (r.publicacion?.tiene_imagen ? '🖼️ Solo imagen' : 'Sin contenido')}
                </div>
                {r.motivo_reporte && (
                  <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4, fontStyle: 'italic' }}>
                    Motivo: {r.motivo_reporte}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detalle del reporte */}
      {activo && !accion && (
        <div onClick={() => setActivo(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 20, padding: 0, width: '100%', maxWidth: 440,
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--primary)' }}>Publicación reportada</h3>
              <button onClick={() => setActivo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '14px 20px' }}>
              {activo.motivo_reporte && (
                <div style={{
                  background: '#FEE2E2', color: '#991B1B', padding: '10px 12px',
                  borderRadius: 10, fontSize: 13, marginBottom: 14, border: '1px solid #FECACA'
                }}>
                  <strong>Motivo del reporte:</strong> {activo.motivo_reporte}
                </div>
              )}

              {!activo.publicacion ? (
                <p style={{ color: 'var(--text-light)' }}>Esta publicación ya no existe.</p>
              ) : (
                <div style={{ background: '#f9f9fc', borderRadius: 12, padding: 14 }}>
                  {activo.publicacion.contenido && (
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-dark)', overflowWrap: 'break-word', wordBreak: 'break-word', marginBottom: activo.publicacion.tiene_imagen ? 10 : 0 }}>
                      {activo.publicacion.contenido}
                    </p>
                  )}
                  {activo.publicacion.tiene_imagen && (
                    <AuthImage
                      src={ApiService.imagenForoUrl(activo.publicacion.id)}
                      style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 10, background: '#f0f0f5' }}
                    />
                  )}
                  <div style={{ display: 'inline-block', marginTop: 10, fontSize: 11, color: 'var(--primary)', fontWeight: 700, background: 'rgba(176,91,181,0.08)', padding: '3px 10px', borderRadius: 14 }}>
                    {activo.publicacion.categoria}
                  </div>
                </div>
              )}
            </div>

            {estadoTab === 'pendiente' && activo.publicacion && (
              <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => abrirAccion('eliminar')} style={{
                  padding: 12, borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #F6416C 0%, #C03060 100%)', color: 'white',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                  <Trash2 size={16} /> Eliminar publicación
                </button>
                <button onClick={() => abrirAccion('banear')} style={{
                  padding: 12, borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%)', color: 'white',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                  <Ban size={16} /> Banear a la usuaria
                </button>
                <button onClick={anular} disabled={enviando} style={{
                  padding: 12, borderRadius: 12, border: '1.5px solid var(--primary)',
                  background: 'white', color: 'var(--primary)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                  <ShieldOff size={16} /> Anular reporte (legítima)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de acción (eliminar / banear) con motivos */}
      {activo && accion && (
        <div onClick={() => !enviando && setAccion(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 20, padding: 22, width: '100%', maxWidth: 420,
            maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: accion === 'banear' ? '#FEE2E2' : '#FFE4E6',
                color: accion === 'banear' ? '#DC2626' : '#F6416C',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {accion === 'banear' ? <Ban size={18} /> : <Trash2 size={18} />}
              </div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, flex: 1 }}>
                {accion === 'banear' ? 'Banear a la usuaria' : 'Eliminar publicación'}
              </h3>
              <button onClick={() => setAccion(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-light)' }}>
              Motivos {accion === 'banear' ? 'del baneo' : 'de la eliminación'} <span style={{ color: '#F6416C' }}>*</span>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {motivos.map(m => {
                const sel = seleccionados.has(m.clave);
                return (
                  <div key={m.clave} onClick={() => {
                    const s = new Set(seleccionados);
                    sel ? s.delete(m.clave) : s.add(m.clave);
                    setSeleccionados(s);
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12,
                    background: sel ? 'rgba(176,91,181,0.08)' : '#f5f5fa',
                    border: `1.5px solid ${sel ? 'var(--primary)' : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5,
                      background: sel ? 'var(--primary)' : 'white',
                      border: `1.5px solid ${sel ? 'var(--primary)' : '#ccc'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {sel && <Check size={12} color="white" />}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: sel ? 700 : 500 }}>
                      {m.etiqueta}
                    </span>
                  </div>
                );
              })}
            </div>

            {seleccionados.has('otros') && (
              <>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-light)', fontWeight: 600 }}>
                  Especifica el motivo:
                </p>
                <textarea
                  value={textoPersonalizado}
                  onChange={e => setTextoPersonalizado(e.target.value)}
                  rows={3}
                  placeholder="Describe el motivo personalizado…"
                  style={{
                    width: '100%', padding: 12, borderRadius: 12,
                    border: '1.5px solid #eee', fontSize: 13, fontFamily: 'inherit',
                    outline: 'none', boxSizing: 'border-box', resize: 'none', marginBottom: 14
                  }}
                />
              </>
            )}

            {accion === 'banear' && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-light)', fontWeight: 600 }}>
                  Duración del baneo:
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {[1, 7, 30, 90].map(d => (
                    <button key={d} onClick={() => { setDuracionDias(d); setPermanente(false); }} style={{
                      padding: '6px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: !permanente && duracionDias === d ? 'var(--primary)' : '#f0f0f5',
                      color: !permanente && duracionDias === d ? 'white' : 'var(--text-dark)',
                      fontSize: 12, fontWeight: 700
                    }}>{d}d</button>
                  ))}
                  <button onClick={() => setPermanente(true)} style={{
                    padding: '6px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: permanente ? '#DC2626' : '#f0f0f5',
                    color: permanente ? 'white' : 'var(--text-dark)',
                    fontSize: 12, fontWeight: 700
                  }}>Permanente</button>
                </div>
              </div>
            )}

            <button onClick={ejecutarAccion} disabled={enviando} style={{
              width: '100%', padding: 13, borderRadius: 14, border: 'none',
              background: accion === 'banear'
                ? 'linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%)'
                : 'linear-gradient(135deg, #F6416C 0%, #C03060 100%)',
              color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer'
            }}>
              {enviando ? 'Procesando…' : (accion === 'banear' ? 'Banear' : 'Eliminar')}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: toast.tipo === 'error' ? 'linear-gradient(135deg, #F6416C, #C03060)' : 'linear-gradient(135deg, var(--primary), #F6416C)',
          color: 'white', padding: '12px 20px', borderRadius: 16,
          fontSize: 14, fontWeight: 600, zIndex: 2500,
          boxShadow: '0 6px 24px rgba(176,91,181,0.35)'
        }}>{toast.m}</div>
      )}
    </div>
  );
}
