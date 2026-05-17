import React, { useEffect, useRef, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Headphones } from 'lucide-react';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';

export default function SupportChatScreen() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [admin, setAdmin] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
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

  useEffect(() => {
    ApiService.getAdminSoporte()
      .then(setAdmin)
      .catch(e => setError(e.message || 'No se pudo conectar con soporte'));
  }, []);

  const fetchMensajes = async () => {
    if (!admin) return;
    try {
      const data = await ApiService.getMensajes(admin.id_usuaria);
      setMensajes(data || []);
    } catch (_) {
      // silenciar errores de polling
    }
  };

  useEffect(() => {
    if (!admin) return;
    primeraCargaRef.current = true;
    ultimoIdRef.current = null;
    fetchMensajes();
    const interval = setInterval(fetchMensajes, 3000);
    return () => clearInterval(interval);
  }, [admin]);

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
    if (!texto || !admin || enviando) return;
    setEnviando(true);
    try {
      await ApiService.enviarMensaje(admin.id_usuaria, texto);
      setNuevo('');
      await fetchMensajes();
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

  const subtitulo = admin
    ? `Hablas con ${admin.nombre}`
    : error
      ? error
      : 'Conectando con soporte...';

  return (
    <div className="screen-container" style={{ paddingBottom: '110px', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={20} /> <span style={{ marginLeft: '4px' }}>Volver</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{ background: '#F3E5F5', padding: '12px', borderRadius: '50%', color: 'var(--primary)', display: 'flex' }}>
            <Headphones size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '22px' }}>Atención al cliente</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-light)' }}>{subtitulo}</p>
          </div>
        </div>

        {/* Chat */}
        <div
          ref={scrollRef}
          style={{
            width: '100%',
            flex: 1,
            minHeight: '320px',
            maxHeight: 'calc(100vh - 280px)',
            overflowY: 'auto',
            background: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '12px',
            boxSizing: 'border-box'
          }}
        >
          {!admin && !error && (
            <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px 20px', fontSize: '14px' }}>Cargando…</div>
          )}
          {!admin && error && (
            <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px 20px', fontSize: '14px', lineHeight: 1.5 }}>
              No se pudo conectar con el soporte ahora mismo.<br />
              Inténtalo de nuevo en unos minutos.
            </div>
          )}
          {admin && mensajes.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px 20px', fontSize: '14px', lineHeight: 1.5 }}>
              Escríbenos cualquier duda, sugerencia o problema.<br />Te responderemos lo antes posible 💜
            </div>
          )}
          {mensajes.map(m => {
            const mio = m.id_remitente === user?.id_usuaria;
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mio ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                <div style={{
                  maxWidth: '78%',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  background: mio ? 'var(--primary)' : '#F3E5F5',
                  color: mio ? 'white' : 'var(--text-dark)',
                  fontSize: '14px',
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {m.contenido}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div style={{
          width: '100%',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          background: 'var(--white)',
          borderRadius: '50px',
          padding: '6px 6px 6px 18px',
          boxShadow: 'var(--shadow-sm)',
          boxSizing: 'border-box'
        }}>
          <input
            type="text"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribe tu mensaje..."
            disabled={!admin || enviando}
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: '15px', background: 'transparent', color: 'var(--text-dark)' }}
          />
          <button
            onClick={enviar}
            disabled={!admin || enviando || !nuevo.trim()}
            style={{
              background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%',
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              cursor: (!admin || enviando || !nuevo.trim()) ? 'not-allowed' : 'pointer',
              opacity: (!admin || enviando || !nuevo.trim()) ? 0.5 : 1
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
