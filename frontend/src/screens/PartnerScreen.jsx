import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Users, Shield, Calendar, X } from 'lucide-react';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';

const PartnerScreen = () => {
  const navigate = useNavigate();
  const { user, getMe } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [error, setError] = useState('');
  const [vinculos, setVinculos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [vinculoToDesvincular, setVinculoToDesvincular] = useState(null);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const plataforma = localStorage.getItem('plataforma') || 'usuaria';
  const isPareja = plataforma === 'pareja';
  const isUsuaria = !isPareja;

  useEffect(() => {
    fetchVinculos();
    const interval = setInterval(fetchVinculos, 10000); // Polling local cada 10s para asegurar tiempo real
    return () => clearInterval(interval);
  }, [user]);

  const fetchVinculos = async () => {
    try {
      const data = await ApiService.getParejas();
      setVinculos(data);
      // Preseleccionar la primera si no hay selección
      if (data.length > 0 && !selectedId) {
        setSelectedId(isPareja ? data[0].id_usuaria : data[0].id_pareja);
      }
    } catch {
      // sin vínculos
    }
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

      {/* ── Selector de pareja personalizado (Dropdown) ── */}
      {vinculos.length > 1 && (
        <div style={{ marginBottom: '25px', position: 'relative' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '10px', paddingLeft: '4px' }}>
            {isPareja ? 'Viendo el ciclo de:' : 'Pareja seleccionada:'}
          </label>
          <div 
            onClick={() => setIsSelectOpen(!isSelectOpen)}
            style={{
              padding: '16px', borderRadius: '18px',
              border: '1.5px solid rgba(176,91,181,0.15)', background: 'var(--white)',
              color: 'var(--text-dark)', fontSize: '16px', fontWeight: '600',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(176,91,181,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Users size={16} />
              </div>
              <span>{vinculos.find(v => (isPareja ? v.id_usuaria : v.id_pareja) === selectedId)?.nombre || 'Seleccionar...'}</span>
            </div>
            <ChevronLeft size={20} style={{ transform: isSelectOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.3s', color: 'var(--primary)' }} />
          </div>

          {isSelectOpen && (
            <>
              <div 
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} 
                onClick={() => setIsSelectOpen(false)} 
              />
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'var(--white)', borderRadius: '18px', boxShadow: 'var(--shadow-md)',
                zIndex: 101, overflow: 'hidden', border: '1.5px solid rgba(176,91,181,0.1)',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                {vinculos.map(v => {
                  const val = isPareja ? v.id_usuaria : v.id_pareja;
                  const isSelected = val === selectedId;
                  return (
                    <div 
                      key={v.id}
                      onClick={() => { setSelectedId(val); setIsSelectOpen(false); }}
                      style={{
                        padding: '16px', cursor: 'pointer',
                        background: isSelected ? 'rgba(176,91,181,0.05)' : 'transparent',
                        color: isSelected ? 'var(--primary)' : 'var(--text-dark)',
                        fontWeight: isSelected ? '700' : '500',
                        borderBottom: '1px solid #f8f8f8',
                        display: 'flex', alignItems: 'center', gap: '12px'
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSelected ? 'var(--primary)' : 'transparent', border: isSelected ? 'none' : '1px solid #ddd' }} />
                      {v.nombre}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

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
        <div style={{ marginBottom: '20px' }}>
          {/* Si solo hay uno, mostrar nombre como título en vez de dropdown */}
          {vinculos.length === 1 && (
            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: '700', color: 'var(--text-dark)' }}>{vinculos[0].nombre}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-light)' }}>
                    {isPareja ? 'Viendo su ciclo' : 'Vinculado/a contigo'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDesvincular(vinculos[0].id)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}
                title="Desvincular"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Si hay varios, mostrar la lista completa con botón de desvincular */}
          {vinculos.length > 1 && (
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isPareja ? 'Parejas vinculadas' : 'Mis parejas'}
              </h3>
              {vinculos.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <Users size={18} />
                    </div>
                    <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{v.nombre}</span>
                  </div>
                  <button
                    onClick={() => handleDesvincular(v.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                    title="Desvincular"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
            <h3 style={{ fontSize: '20px', margin: '0 0 12px', color: 'var(--text-dark)', fontWeight: '700' }}>¿Desvincular pareja?</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '28px', lineHeight: '1.6' }}>
              Dejarás de compartir información y ver el ciclo de esta persona. Esta acción es inmediata.
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
