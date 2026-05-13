import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Users, Check, X, Shield, Info, Calendar } from 'lucide-react';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';

const PartnerScreen = () => {
  const navigate = useNavigate();
  const { user, getMe } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isUnlinkedPareja = user?.rol === 'pareja' && !user?.codigo_pareja;
  const isUsuaria = user?.rol === 'usuaria';

  const handleSendRequest = async () => {
    if (!partnerCode) return;
    setLoading(true);
    setError('');
    try {
      const res = await ApiService.updateConfig({ codigo_pareja: partnerCode });
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess('Solicitud enviada. Esperando a que tu pareja la acepte.');
        await getMe(); // Actualizar estado local
      }
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
      setSuccess('¡Pareja vinculada correctamente!');
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

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <ChevronLeft size={20} /> <span>Volver</span>
        </button>
      </div>

      <h1 style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: '20px' }}>Mi Pareja</h1>

      {/* Solicitud Pendiente (Para Usuaria) */}
      {isUsuaria && user?.solicitud_estado === 'pendiente' && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)',
          color: 'white',
          padding: '25px',
          marginBottom: '25px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '24px',
          boxShadow: '0 10px 20px rgba(246, 65, 108, 0.2)'
        }}>
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.2 }}>
            <Heart size={120} fill="white" />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Users size={20} />
              <span style={{ fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', fontSize: '12px' }}>Solicitud de Vinculación</span>
            </div>
            <h2 style={{ fontSize: '22px', margin: '0 0 10px 0' }}>¿{user.nombre_solicitante} es tu pareja?</h2>
            <p style={{ margin: '0 0 20px 0', opacity: 0.9, fontSize: '14px', lineHeight: '1.4' }}>
              Si aceptas, podrá ver tu ciclo y acompañarte en tu proceso. Siempre podrás revocar este acceso.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAccept}
                disabled={loading}
                style={{
                  flex: 1, background: 'white', color: '#F6416C', border: 'none',
                  padding: '12px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Check size={18} /> Aceptar
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none',
                  padding: '12px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <X size={18} /> Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado para Pareja que ha enviado solicitud */}
      {user?.rol === 'pareja' && user?.solicitud_estado === 'enviada' && (
        <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%', background: '#FDF2F8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: 'var(--primary)'
          }}>
            <Calendar size={30} />
          </div>
          <h3 style={{ margin: '0 0 10px 0' }}>Solicitud Pendiente</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', lineHeight: '1.5' }}>
            Hemos enviado tu solicitud. Te avisaremos en cuanto tu pareja la acepte.
          </p>
        </div>
      )}

      {/* Formulario de Vinculación (Si no está vinculado ni tiene solicitud) */}
      {isUnlinkedPareja && user?.solicitud_estado !== 'enviada' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <Shield size={24} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '18px' }}>Vincular con mi pareja</h3>
          </div>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
            Introduce el código de tu pareja para solicitar la vinculación.
          </p>

          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Código de tu pareja (ej: X1Y2Z3)"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
              style={{
                width: '100%', padding: '15px', borderRadius: '15px', border: error ? '2px solid #F6416C' : '1.5px solid #eee',
                fontSize: '12px', outline: 'none', textAlign: 'center', fontWeight: 'bold', letterSpacing: '2px'
              }}
            />
            {error && <p style={{ color: '#F6416C', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>{error}</p>}
            {success && <p style={{ color: '#10B981', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>{success}</p>}
          </div>

          <button
            onClick={handleSendRequest}
            disabled={loading || !partnerCode}
            style={{
              width: '100%', background: 'var(--primary)', color: 'white', border: 'none',
              padding: '15px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer',
              opacity: loading || !partnerCode ? 0.7 : 1
            }}
          >
            {loading ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </div>
      )}

      {/* Vista Vinculada */}
      {user?.codigo_pareja && (
        <div className="card" style={{ padding: '25px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: '#FDF2F8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--primary)'
          }}>
            <Users size={40} />
          </div>
          <h2 style={{ margin: '0 0 10px 0' }}>Estás vinculado</h2>
          <p style={{ color: 'var(--text-light)', fontSize: '15px', marginBottom: '25px' }}>
            Ahora puedes compartir y ver la información del ciclo.
          </p>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            <Info size={18} />
            <span>Código vinculado: <strong>{user.codigo_pareja}</strong></span>
          </div>
        </div>
      )}

      {/* Si es Usuaria y no tiene solicitud ni pareja (Solo mostrar su código) */}
      {isUsuaria && !user?.solicitud_estado && !user?.codigo_pareja && (
        <div className="card" style={{ padding: '25px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Invita a tu pareja</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
            Comparte este código con tu pareja para que pueda solicitar seguir tu ciclo.
          </p>
          <div style={{
            background: 'var(--primary-light)', color: 'var(--primary)', padding: '20px', borderRadius: '20px',
            fontSize: '24px', fontWeight: '900', letterSpacing: '4px', border: '2px dashed var(--primary)'
          }}>
            {user.mi_codigo}
          </div>
        </div>
      )}

    </div>
  );
};

export default PartnerScreen;
