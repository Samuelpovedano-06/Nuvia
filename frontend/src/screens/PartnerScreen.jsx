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
  const [showChat, setShowChat] = useState(false);
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
      if (data.length > 0) {
        const validIds = data.map(v => isPareja ? v.id_usuaria : v.id_pareja);
        const currentId = localStorage.getItem('selectedPartnerId');
        if (!currentId || !validIds.includes(currentId)) {
          const first = data[0];
          const firstId = isPareja ? first.id_usuaria : first.id_pareja;
          setSelectedId(firstId);
          localStorage.setItem('selectedPartnerId', firstId);
          localStorage.setItem('selectedPartnerName', first.nombre);
        }
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

  const [showSidebar, setShowSidebar] = useState(false);

  // Filtrar vínculos según el rol para el chat
  const chatPartners = vinculos.filter(v => {
    if (isPareja) {
      // Si soy rol pareja, solo puedo hablar con las usuarias que monitoreo (donde soy id_pareja)
      return v.id_pareja === user.id_usuaria;
    }
    // Usuaria y Admin pueden hablar con todos sus vínculos
    return true;
  });

  return (
    <div className="screen-container">
      {!showChat ? (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px', gap: '15px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '5px' }}>
              <ChevronLeft size={24} />
            </button>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--text-dark)' }}>Mi Pareja</h1>
          </div>

          {/* Info Card */}
          <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', border: 'none', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <Heart size={18} fill="var(--primary)" color="var(--primary)" />
                <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Espacio Compartido</span>
              </div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#881337' }}>
                {isPareja ? 'Acompaña su ciclo' : 'Seguimiento en pareja'}
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#9d174d', opacity: 0.8, lineHeight: '1.4' }}>
                {isPareja 
                  ? 'Aquí podrás ver el progreso del ciclo de tu pareja y apoyarla en cada fase.'
                  : 'Comparte tu ciclo con tu pareja para que pueda entender mejor tus fases y síntomas.'}
              </p>
            </div>
            <Users size={80} style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.1, color: 'var(--primary)' }} />
          </div>

          {/* ── Solicitud Pendiente ── */}
          {user?.solicitud_estado === 'pendiente' && (
            <div className="card" style={{ padding: '20px', border: '2px solid var(--primary)', background: 'rgba(176,91,181,0.05)', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                <div style={{ background: 'var(--primary)', padding: '10px', borderRadius: '12px', color: 'white' }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Solicitud de vínculo</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-light)' }}>
                    <strong>{user.nombre_solicitante}</strong> quiere vincularse contigo.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleAccept}
                  disabled={loading}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  Aceptar
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #eee', background: 'white', color: '#666', fontWeight: '700', cursor: 'pointer' }}
                >
                  Rechazar
                </button>
              </div>
            </div>
          )}

          {/* ── Solicitud enviada (esperando) ── */}
          {user?.solicitud_estado === 'enviada' && (
            <div className="card" style={{ textAlign: 'center', padding: '30px', marginTop: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: 'var(--primary)' }}>
                <Calendar size={30} />
              </div>
              <h3 style={{ margin: '0 0 10px 0' }}>Solicitud Pendiente</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '14px', lineHeight: '1.5' }}>
                Hemos enviado tu solicitud. Te avisaremos en cuanto tu pareja la acepte.
              </p>
            </div>
          )}

          {/* ── Lista de Vínculos Activos ── */}
          {vinculos.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '12px', paddingLeft: '5px' }}>Vínculos Activos</h3>
              {vinculos.map(v => {
                const vid = isPareja ? v.id_usuaria : v.id_pareja;
                const isViewing = selectedId === vid;
                return (
                  <div key={v.id} className="card" style={{ padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', border: isViewing ? '1.5px solid var(--primary)' : '1.5px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>
                        {v.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-dark)' }}>{v.nombre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Shield size={10} /> {isPareja ? 'Monitoreando' : 'Compartiendo'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isPareja && (
                        <button
                          onClick={() => handleSelect(vid)}
                          style={{
                            padding: '6px 14px', borderRadius: '10px', border: '1.5px solid var(--primary)',
                            background: isViewing ? 'var(--primary)' : 'white',
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

          {/* ── UsChat (Botón para abrir) ── */}
          {selectedId && chatPartners.length > 0 && (
            <button 
              onClick={() => setShowChat(true)}
              style={{
                width: 'fit-content', minWidth: '200px', margin: '20px auto', 
                padding: '12px 24px', borderRadius: '16px', border: 'none',
                background: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)',
                color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 15px rgba(246, 65, 108, 0.15)',
                animation: 'fadeIn 0.3s ease'
              }}
            >
              <MessageCircle size={20} />
              <span>Abrir UsChat</span>
            </button>
          )}

          {/* ── Código propio (usuaria para compartir) ── */}
          {isUsuaria && (
            <div className="card" style={{ padding: '25px', textAlign: 'center', marginTop: '10px' }}>
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

          {/* ── Formulario para introducir código (si no hay vínculos ni solicitud enviada) ── */}
          {user?.solicitud_estado !== 'enviada' && vinculos.length === 0 && (
            <div className="card" style={{ padding: '20px', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <Shield size={24} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '18px' }}>Vincular con mi pareja</h3>
              </div>
              <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
                Introduce el código de tu pareja para solicitar la vinculación.
              </p>
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

          {/* Botón para añadir otra vinculación (si ya tiene vínculos) */}
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
        </>
      ) : (
        /* ── UsChat (Vista de pantalla completa - Posición Fija) ── */
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: '74px',
          background: 'var(--white)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease',
          overflow: 'hidden'
        }}>
          {/* Sidebar Drawer */}
          {showSidebar && (
            <div 
              onClick={() => setShowSidebar(false)}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: '74px', background: 'rgba(0,0,0,0.4)', zIndex: 1100, animation: 'fadeIn 0.2s ease' }}
            >
              <div 
                onClick={e => e.stopPropagation()}
                style={{ width: '280px', height: '100%', background: 'white', boxShadow: '5px 0 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideInLeft 0.3s ease' }}
              >
                <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>Conversaciones</h3>
                  <X size={20} onClick={() => setShowSidebar(false)} style={{ cursor: 'pointer' }} />
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                  {chatPartners.map(v => {
                    const vvid = isPareja ? v.id_usuaria : v.id_pareja;
                    const isActive = selectedId === vvid;
                    return (
                      <div 
                        key={v.id} 
                        onClick={() => {
                          handleSelect(vvid);
                          setShowSidebar(false);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px',
                          cursor: 'pointer', background: isActive ? 'rgba(176,91,181,0.08)' : 'transparent',
                          marginBottom: '5px', transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isActive ? 'var(--primary)' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'white' : '#999', fontWeight: 'bold' }}>
                          {v.nombre?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: isActive ? 'var(--primary)' : 'var(--text-dark)' }}>{v.nombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{isActive ? 'Chat activo' : 'Hacer clic para hablar'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div style={{ padding: '16px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={() => setShowChat(false)}
                style={{ background: '#f8f9fa', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <ChevronLeft size={22} />
              </button>
              <div 
                onClick={() => setShowSidebar(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}
              >
                <div style={{ background: 'var(--primary)', color: 'white', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                  <Users size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-dark)', fontWeight: '700' }}>
                    {vinculos.find(v => (isPareja ? v.id_usuaria : v.id_pareja) === selectedId)?.nombre || 'UsChat'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '10px', color: 'var(--primary)', fontWeight: '600' }}>Toca para cambiar pareja</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowSidebar(true)}
              style={{ background: 'rgba(176,91,181,0.1)', border: 'none', padding: '10px', borderRadius: '12px', color: 'var(--primary)', cursor: 'pointer' }}
            >
              <Users size={20} />
            </button>
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

      {/* Modal Confirmación Desvincular */}
      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ padding: '25px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ background: '#FFF1F2', color: '#ef4444', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
              <X size={30} />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px' }}>Cortar con tu pareja</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '20px', lineHeight: '1.5' }}>
              Dejarás de compartir información y esta persona no podrá ver el progreso de tu ciclo. Esta acción es inmediata.
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
