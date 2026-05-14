import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Users, Shield, Calendar, X, Send, MessageCircle } from 'lucide-react';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';

const PartnerScreen = () => {
  const navigate = useNavigate();
  const { user, getMe } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [error, setError] = useState('');
  const [vinculos, setVinculos] = useState([]);
  const [selectedId, setSelectedId] = useState(localStorage.getItem('selectedPartnerId'));
  const [showConfirm, setShowConfirm] = useState(false);
  const [vinculoToDesvincular, setVinculoToDesvincular] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const chatEndRef = React.useRef(null);

  const plataforma = localStorage.getItem('plataforma') || 'usuaria';
  const isPareja = plataforma === 'pareja';
  const isUsuaria = !isPareja;

  useEffect(() => {
    fetchVinculos();
    const interval = setInterval(fetchVinculos, 10000); 
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (selectedId) {
      fetchMensajes();
      const interval = setInterval(fetchMensajes, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedId]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMensajes = async () => {
    try {
      const data = await ApiService.getMensajes(selectedId);
      setMensajes(data);
    } catch (err) {
      console.error('Error fetching mensajes:', err);
    }
  };

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !selectedId) return;
    try {
      await ApiService.enviarMensaje(selectedId, nuevoMensaje);
      setNuevoMensaje('');
      fetchMensajes();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const fetchVinculos = async () => {
    try {
      const data = await ApiService.getParejas();
      setVinculos(data);
      if (data.length > 0 && !selectedId) {
        const first = data[0];
        const firstId = isPareja ? first.id_usuaria : first.id_pareja;
        setSelectedId(firstId);
        localStorage.setItem('selectedPartnerId', firstId);
        localStorage.setItem('selectedPartnerName', first.nombre);
      }
    } catch (err) {
      console.error('Error fetching vinculos:', err);
    }
  };

  const handleSelect = (id) => {
    const vinculo = vinculos.find(v => (isPareja ? v.id_usuaria : v.id_pareja) === id);
    setSelectedId(id);
    localStorage.setItem('selectedPartnerId', id);
    if (vinculo) localStorage.setItem('selectedPartnerName', vinculo.nombre);
    setIsSelectOpen(false);
  };

  const handleSendRequest = async () => {
    if (!partnerCode) return;
    setLoading(true);
    setError('');
    try {
      const res = await ApiService.updateConfig({ codigo_pareja: partnerCode });
      if (res.error) { setError(res.error); return; }
      await getMe();
      setPartnerCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      await ApiService.aceptarPareja();
      await getMe();
      await fetchVinculos();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await ApiService.rechazarPareja();
      await getMe();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDesvincular = (id) => {
    setVinculoToDesvincular(id);
    setShowConfirm(true);
  };

  const confirmDesvincular = async () => {
    if (!vinculoToDesvincular) return;
    try {
      await ApiService.desvincularPareja(vinculoToDesvincular);
      await fetchVinculos();
    } catch (err) {
      setError(err.message);
    } finally {
      setShowConfirm(false);
      setVinculoToDesvincular(null);
    }
  };

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <ChevronLeft size={20} /> <span>Volver</span>
        </button>
      </div>

      <h1 style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: '20px' }}>Mi Pareja</h1>


      {/* ── Solicitud pendiente (pareja que ya envió y espera) ── */}
      {isPareja && user?.solicitud_estado === 'enviada' && (
        <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: 'var(--primary)' }}>
            <Calendar size={30} />
          </div>
          <h3 style={{ margin: '0 0 10px 0' }}>Solicitud Pendiente</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', lineHeight: '1.5' }}>
            Hemos enviado tu solicitud. Te avisaremos en cuanto tu pareja la acepte.
          </p>
        </div>
      )}

      {/* ── Solicitud de vinculación (usuaria recibe notificación) ── */}
      {isUsuaria && user?.solicitud_estado === 'pendiente' && (
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <Heart size={30} color="var(--primary)" style={{ marginBottom: '10px' }} />
          <h3 style={{ margin: '0 0 8px' }}>Nueva solicitud de pareja</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
            {user?.nombre_solicitante || 'Alguien'} quiere vincularse contigo.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleReject} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: '700', cursor: 'pointer' }}>
              Rechazar
            </button>
            <button onClick={handleAccept} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
              {loading ? 'Aceptando...' : 'Aceptar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Formulario para introducir código (sin solicitud pendiente ni vínculos) ── */}
      {user?.solicitud_estado !== 'enviada' && vinculos.length === 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <Shield size={24} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '18px' }}>Vincular con mi pareja</h3>
          </div>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
            Introduce el código de tu pareja para solicitar la vinculación.
          </p>
          <input
            type="text"
            placeholder="Código (ej: X1Y2Z3)"
            value={partnerCode}
            onChange={e => setPartnerCode(e.target.value.toUpperCase())}
            style={{
              width: '100%', padding: '15px', borderRadius: '15px',
              border: error ? '2px solid #F6416C' : '1.5px solid #eee',
              fontSize: '14px', outline: 'none', textAlign: 'center',
              fontWeight: 'bold', letterSpacing: '2px', marginBottom: '10px'
            }}
          />
          {error && <p style={{ color: '#F6416C', fontSize: '13px', textAlign: 'center', marginBottom: '10px' }}>{error}</p>}
          <button
            onClick={handleSendRequest}
            disabled={loading || !partnerCode}
            style={{ width: '100%', background: 'var(--primary)', color: 'white', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', opacity: loading || !partnerCode ? 0.7 : 1 }}
          >
            {loading ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </div>
      )}

      {/* ── Lista de vínculos activos ── */}
      {vinculos.length > 0 && (
        <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isPareja ? 'Parejas vinculadas' : 'Mis parejas'}
          </h3>
          {vinculos.map((v, idx) => {
            const vid = isPareja ? v.id_usuaria : v.id_pareja;
            const isViewing = vid === selectedId;
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: idx < vinculos.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: isViewing ? 'rgba(176,91,181,0.12)' : '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--text-dark)', display: 'block' }}>{v.nombre}</span>
                    {isPareja && isViewing && <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>Viendo ahora</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isPareja && (
                    <button
                      onClick={() => handleSelect(vid)}
                      style={{
                        padding: '6px 14px', borderRadius: '10px', border: '1.5px solid var(--primary)',
                        background: isViewing ? 'var(--primary)' : 'transparent',
                        color: isViewing ? 'white' : 'var(--primary)',
                        cursor: 'pointer', fontSize: '13px', fontWeight: '700'
                      }}
                    >
                      {isViewing ? 'Viendo' : 'Ver'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDesvincular(v.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                    title="Cortar vínculo"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── UsChat ── */}
      {selectedId && vinculos.length > 0 && (
        <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '400px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(176,91,181,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '10px', color: 'white' }}>
                <MessageCircle size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px' }}>UsChat</h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-light)' }}>Chat privado con {vinculos.find(v => (isPareja ? v.id_usuaria : v.id_pareja) === selectedId)?.nombre || 'tu pareja'}</p>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#fafafa' }}>
            {mensajes.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
                <MessageCircle size={40} style={{ marginBottom: '10px' }} />
                <p style={{ fontSize: '13px' }}>Di algo bonito...</p>
              </div>
            ) : mensajes.map(m => {
              const isMe = m.id_remitente === user.id_usuaria;
              return (
                <div key={m.id} style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                  background: isMe ? 'var(--primary)' : 'white',
                  color: isMe ? 'white' : 'var(--text-dark)',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                  position: 'relative'
                }}>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>{m.contenido}</p>
                  <span style={{ fontSize: '9px', opacity: 0.7, marginTop: '4px', display: 'block', textAlign: isMe ? 'right' : 'left' }}>
                    {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleEnviarMensaje} style={{ padding: '12px', borderTop: '1px solid #f5f5f5', display: 'flex', gap: '8px', background: 'white' }}>
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={nuevoMensaje}
              onChange={e => setNuevoMensaje(e.target.value)}
              style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1.5px solid #f1f5f9', fontSize: '14px', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={!nuevoMensaje.trim()}
              style={{ background: 'var(--primary)', color: 'white', border: 'none', width: '42px', height: '42px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', opacity: !nuevoMensaje.trim() ? 0.6 : 1 }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* ── Código propio (usuaria para compartir) ── */}
      {isUsuaria && (
        <div className="card" style={{ padding: '25px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Tu código para parejas</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '16px' }}>
            Comparte este código con tu pareja para que se pueda vincular contigo.
          </p>
          <div style={{
            background: 'var(--primary-light)', color: 'var(--primary)', padding: '20px', borderRadius: '20px',
            fontSize: '24px', fontWeight: '900', letterSpacing: '4px', border: '2px dashed var(--primary)'
          }}>
            {user?.mi_codigo || '—'}
          </div>
        </div>
      )}

      {/* Botón para añadir otra vinculación (al menos un vínculo y sin solicitud pendiente) */}
      {vinculos.length > 0 && user?.solicitud_estado !== 'enviada' && (
        <div className="card" style={{ padding: '16px', marginTop: '12px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--text-light)' }}>Vincular con otra pareja</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Código (ej: X1Y2Z3)"
              value={partnerCode}
              onChange={e => setPartnerCode(e.target.value.toUpperCase())}
              style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #eee', fontSize: '13px', outline: 'none', fontWeight: 'bold', letterSpacing: '2px' }}
            />
            <button
              onClick={handleSendRequest}
              disabled={loading || !partnerCode}
              style={{ padding: '12px 18px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', cursor: 'pointer', opacity: loading || !partnerCode ? 0.7 : 1 }}
            >
              {loading ? '...' : 'Enviar'}
            </button>
          </div>
          {error && <p style={{ color: '#F6416C', fontSize: '13px', marginTop: '8px' }}>{error}</p>}
        </div>
      )}
      {/* ── Modal de Confirmación Custom ── */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px', animation: 'fadeIn 0.3s ease'
        }}>
          <div className="card" style={{ maxWidth: '340px', width: '100%', padding: '25px', textAlign: 'center', margin: 0, border: 'none' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#ef4444' }}>
              <X size={32} strokeWidth={2.5} />
            </div>
            <h3 style={{ fontSize: '20px', margin: '0 0 12px', color: 'var(--text-dark)', fontWeight: '700' }}>¿Cortar con tu pareja?</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '28px', lineHeight: '1.6' }}>
              Dejarás de compartir información y esta persona no podra ver el progreso de tu ciclo. Esta acción es inmediata.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1.5px solid #eee', background: 'white', color: 'var(--text-light)', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDesvincular}
                style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerScreen;
