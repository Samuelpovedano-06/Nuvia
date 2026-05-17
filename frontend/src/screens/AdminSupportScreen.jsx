import React, { useEffect, useRef, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Headphones, User } from 'lucide-react';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';

function formatFecha(f) {
  if (!f) return '';
  const d = new Date(f);
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  if (mismoDia) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

export default function AdminSupportScreen() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [conversaciones, setConversaciones] = useState([]);
  const [selected, setSelected] = useState(null); // { id_usuaria, nombre }
  const [mensajes, setMensajes] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const scrollRef = useRef(null);
  const ultimoIdRef = useRef(null);
  const primeraCargaRef = useRef(true);

  const scrollAlFondo = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const c = scrollRef.current;
        if (c) c.scrollTop = c.scrollHeight;
      });
    });
  };

  const fetchConversaciones = async () => {
    try {
      const data = await ApiService.getConversacionesSoporte();
      setConversaciones(data || []);
    } catch (_) {}
  };

  useEffect(() => {
    fetchConversaciones();
    const interval = setInterval(fetchConversaciones, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMensajes = async () => {
    if (!selected) return;
    try {
      const data = await ApiService.getMensajes(selected.id_usuaria);
      setMensajes(data || []);
    } catch (_) {}
  };

  useEffect(() => {
    if (!selected) return;
    primeraCargaRef.current = true;
    ultimoIdRef.current = null;
    fetchMensajes();
    const interval = setInterval(fetchMensajes, 3000);
    return () => clearInterval(interval);
  }, [selected?.id_usuaria]);

  useEffect(() => {
    if (mensajes.length === 0) return;
    const idUltimo = mensajes[mensajes.length - 1]?.id;
    if (primeraCargaRef.current || idUltimo !== ultimoIdRef.current) {
      ultimoIdRef.current = idUltimo;
      primeraCargaRef.current = false;
      scrollAlFondo();
    }
  }, [mensajes]);

  const enviar = async () => {
    const texto = nuevo.trim();
    if (!texto || !selected || enviando) return;
    setEnviando(true);
    try {
      await ApiService.enviarMensaje(selected.id_usuaria, texto);
      setNuevo('');
      await fetchMensajes();
      fetchConversaciones();
    } catch (e) {
      alert(e.message || 'No se pudo enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  // Vista de chat (cuando hay seleccionada)
  if (selected) {
    return (
      <div className="screen-container" style={{ paddingBottom: '110px', minHeight: '100vh' }}>
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
            <button
              onClick={() => { setSelected(null); setMensajes([]); fetchConversaciones(); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Conversaciones</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{ background: '#F3E5F5', padding: '12px', borderRadius: '50%', color: 'var(--primary)', display: 'flex' }}>
              <User size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{selected.nombre}</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.email}
              </p>
            </div>
          </div>

          <div
            ref={scrollRef}
            style={{
              width: '100%', flex: 1, minHeight: '320px', maxHeight: 'calc(100vh - 280px)',
              overflowY: 'auto', background: 'var(--white)', borderRadius: 'var(--radius-lg)',
              padding: '16px', boxShadow: 'var(--shadow-sm)', marginBottom: '12px', boxSizing: 'border-box'
            }}
          >
            {mensajes.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px 20px', fontSize: '14px' }}>
                Sin mensajes todavía.
              </div>
            )}
            {mensajes.map(m => {
              const mio = m.id_remitente === user?.id_usuaria;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mio ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                  <div style={{
                    maxWidth: '78%', padding: '10px 14px', borderRadius: '16px',
                    background: mio ? 'var(--primary)' : '#F3E5F5',
                    color: mio ? 'white' : 'var(--text-dark)',
                    fontSize: '14px', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                  }}>
                    {m.contenido}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            width: '100%', display: 'flex', gap: '8px', alignItems: 'center',
            background: 'var(--white)', borderRadius: '50px', padding: '6px 6px 6px 18px',
            boxShadow: 'var(--shadow-sm)', boxSizing: 'border-box'
          }}>
            <input
              type="text"
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escribe tu respuesta..."
              disabled={enviando}
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: '15px', background: 'transparent', color: 'var(--text-dark)' }}
            />
            <button
              onClick={enviar}
              disabled={enviando || !nuevo.trim()}
              style={{
                background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                cursor: (enviando || !nuevo.trim()) ? 'not-allowed' : 'pointer',
                opacity: (enviando || !nuevo.trim()) ? 0.5 : 1
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de lista de conversaciones
  return (
    <div className="screen-container" style={{ paddingBottom: '110px' }}>
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Panel Admin</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#F3E5F5', padding: '12px', borderRadius: '50%', color: 'var(--primary)', display: 'flex' }}>
            <Headphones size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px' }}>Atención al cliente</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-light)' }}>
              {conversaciones.length} {conversaciones.length === 1 ? 'conversación' : 'conversaciones'}
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {conversaciones.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-light)', fontSize: '14px' }}>
              Aún no hay mensajes de soporte.
            </div>
          )}
          {conversaciones.map((c, i) => (
            <div
              key={c.id_usuaria}
              onClick={() => setSelected({ id_usuaria: c.id_usuaria, nombre: c.nombre, email: c.email })}
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
                borderTop: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                background: c.no_leidos > 0 ? 'rgba(176,91,181,0.04)' : 'transparent'
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'var(--primary-light)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: 600, flexShrink: 0
              }}>
                {c.nombre?.charAt(0).toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: c.no_leidos > 0 ? 700 : 500, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.nombre}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', flexShrink: 0 }}>
                    {formatFecha(c.fecha)}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <div style={{ fontSize: '13px', color: c.no_leidos > 0 ? 'var(--text-dark)' : 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {c.mio ? 'Tú: ' : ''}{c.ultimo_mensaje}
                  </div>
                  {c.no_leidos > 0 && (
                    <div style={{
                      background: 'var(--primary)', color: 'white', borderRadius: '12px',
                      padding: '2px 8px', fontSize: '11px', fontWeight: 700, flexShrink: 0
                    }}>
                      {c.no_leidos}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
