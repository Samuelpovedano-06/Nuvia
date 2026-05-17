import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { ApiService } from './api';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';
import AdminUsersScreen from './screens/AdminUsersScreen';
import AdminConfigScreen from './screens/AdminConfigScreen';
import SymptomsScreen from './screens/SymptomsScreen';
import CalendarScreen from './screens/CalendarScreen';
import WellnessScreen from './screens/WellnessScreen';
import PartnerScreen from './screens/PartnerScreen';
import CommunityScreen from './screens/CommunityScreen';
import ConsejosScreen from './screens/ConsejosScreen';
import ConsejoDetailScreen from './screens/ConsejoDetailScreen';
import AdminConsejosScreen from './screens/AdminConsejosScreen';
import AdminReportesScreen from './screens/AdminReportesScreen';
import SupportChatScreen from './screens/SupportChatScreen';
import AdminSupportScreen from './screens/AdminSupportScreen';
import MascotaNuvia from './components/MascotaNuvia';
import { Heart, Sparkles, Calendar, User, Home, Flower2, X, Check, Users } from 'lucide-react';

const LogoIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} />
  </svg>
);

const BottomNav = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  // No mostrar en login/register
  const noNavRoutes = ['/login', '/register'];
  if (noNavRoutes.includes(location.pathname)) return null;

  const isUnlinkedPareja = user.rol === 'pareja' && !user.tiene_vinculos;

  const navItems = [
    { label: 'Inicio', icon: <Home size={22} />, path: '/', restricted: false },
    { label: 'Síntomas', icon: <Flower2 size={22} />, path: '/sintomas', restricted: true },
    { label: 'Ciclo', icon: <Calendar size={22} />, path: '/calendar', restricted: true },
    { label: 'Perfil', icon: <User size={22} />, path: '/profile', restricted: false },
  ];

  return (
    <div className="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const isDisabled = item.restricted && isUnlinkedPareja;

        return (
          <button
            key={item.path}
            onClick={() => !isDisabled && navigate(item.path)}
            className={`bottom-nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

function App() {
  const { user, loading, getMe } = useContext(AuthContext);
  const [maintenance, setMaintenance] = useState(false);
  const [showRejectionPopup, setShowRejectionPopup] = useState(false);
  const [desvinculacion, setDesvinculacion] = useState(null);

  // Polling para actualizaciones en tiempo real (cada 10 segundos)
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        getMe();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Polling de desvinculaciones pendientes — NO depende de desvinculacion
  // para evitar reinicios y race conditions con el "marcar visto"
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    const fetchDesv = async () => {
      try {
        const data = await ApiService.getDesvinculacionesPendientes();
        if (cancel) return;
        if (Array.isArray(data) && data.length > 0) {
          setDesvinculacion(prev => prev ?? data[0]);
        }
      } catch (_) {}
    };
    fetchDesv();
    const id = setInterval(fetchDesv, 10000);
    return () => { cancel = true; clearInterval(id); };
  }, [user]);

  const handleCerrarDesvinculacion = async () => {
    if (!desvinculacion) return;
    const id = desvinculacion.id;
    // Marcamos primero en backend para que el siguiente fetch no la traiga
    try { await ApiService.marcarDesvinculacionVista(id); } catch (_) {}
    setDesvinculacion(null);
  };

  // Vigilar rechazos
  useEffect(() => {
    if (user?.solicitud_estado === 'rechazada') {
      setShowRejectionPopup(true);
    }
  }, [user?.solicitud_estado]);

  const handleCloseRejection = async () => {
    setShowRejectionPopup(false);
    try {
      await ApiService.limpiarRechazo();
      getMe();
    } catch (err) {
      console.error(err);
    }
  };

  const [requestLoading, setRequestLoading] = useState(false);

  const handleAcceptRequest = async () => {
    setRequestLoading(true);
    try {
      await ApiService.aceptarPareja();
      await getMe();
    } catch (err) {
      console.error(err);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    setRequestLoading(true);
    try {
      await ApiService.rechazarPareja();
      await getMe();
    } catch (err) {
      console.error(err);
    } finally {
      setRequestLoading(false);
    }
  };

  // Aplicar modo oscuro globalmente al cargar la app
  useEffect(() => {
    const checkStatus = async () => {
      const status = await ApiService.getPublicStatus();
      setMaintenance(status.modo_mantenimiento);
    };
    checkStatus();

    const savedMode = localStorage.getItem('nuvia_modo_oscuro');
    if (savedMode === '1') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);

  if (loading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader"></div>
      </div>
    );
  }

  // Pantalla de Mantenimiento (Solo si no es admin)
  if (maintenance && user?.rol !== 'admin') {
    return (
      <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
        <div style={{ background: '#FFF1F2', padding: '30px', borderRadius: '50%', color: '#F6416C', marginBottom: '30px' }}>
          <Heart size={60} fill="#F6416C" />
        </div>
        <h1 style={{ color: 'var(--primary)', marginBottom: '16px' }}>Nuvia se está renovando</h1>
        <p style={{ color: 'var(--text-light)', lineHeight: '1.6', maxWidth: '300px' }}>
          Estamos realizando mejoras para cuidar mejor de ti. Volveremos en unos minutos con una experiencia aún más premium.
        </p>
        <div style={{ marginTop: '40px', fontSize: '12px', color: 'var(--text-light)', opacity: 0.7 }}>
          Gracias por tu paciencia 💜
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${user ? 'has-bottom-nav' : ''}`}>
      {(() => {
        // Pareja sin vínculos: solo puede ir a Home, Pareja y Perfil
        const isUnlinkedPareja = user?.rol === 'pareja' && !user?.tiene_vinculos;
        const guardPareja = (el) => isUnlinkedPareja ? <Navigate to="/" /> : el;
      return (
      <Routes>
        <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <RegisterScreen /> : <Navigate to="/" />} />

        {/* Rutas protegidas */}
        <Route path="/" element={user ? <HomeScreen /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <ProfileScreen /> : <Navigate to="/login" />} />
        <Route path="/sintomas" element={user ? guardPareja(<SymptomsScreen />) : <Navigate to="/login" />} />
        <Route path="/calendar" element={user ? guardPareja(<CalendarScreen />) : <Navigate to="/login" />} />
        <Route path="/wellness" element={user ? guardPareja(<WellnessScreen />) : <Navigate to="/login" />} />
        <Route path="/comunidad" element={user ? guardPareja(<CommunityScreen />) : <Navigate to="/login" />} />
        <Route path="/consejos" element={user ? guardPareja(<ConsejosScreen />) : <Navigate to="/login" />} />
        <Route path="/consejos/:id" element={user ? guardPareja(<ConsejoDetailScreen />) : <Navigate to="/login" />} />
        <Route path="/admin/consejos" element={user?.rol === 'admin' ? <AdminConsejosScreen /> : <Navigate to="/" />} />
        <Route path="/admin/reportes" element={user?.rol === 'admin' ? <AdminReportesScreen /> : <Navigate to="/" />} />
        <Route path="/pareja" element={user ? <PartnerScreen /> : <Navigate to="/login" />} />
        <Route path="/soporte" element={user ? <SupportChatScreen /> : <Navigate to="/login" />} />
        <Route path="/admin/soporte" element={user?.rol === 'admin' ? <AdminSupportScreen /> : <Navigate to="/" />} />
        <Route path="/admin" element={user?.rol === 'admin' ? <AdminPanelScreen /> : <Navigate to="/" />} />
        <Route path="/admin/users" element={user?.rol === 'admin' ? <AdminUsersScreen /> : <Navigate to="/" />} />
        <Route path="/admin/config" element={user?.rol === 'admin' ? <AdminConfigScreen /> : <Navigate to="/" />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      );
      })()}
      <MascotaNuvia user={user} />
      <BottomNav />
      {/* MODAL: la otra parte ha cortado el vínculo */}
      {desvinculacion && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1002, padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '30px' }}>
            <div style={{
              background: '#FFF1F2', color: '#F6416C',
              width: '64px', height: '64px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px'
            }}>
              <Heart size={32} />
            </div>
            <h2 style={{ fontSize: '22px', margin: '0 0 10px 0' }}>Ya no sois pareja</h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '25px', lineHeight: '1.5', fontSize: '14px' }}>
              <strong>{desvinculacion.nombre_otra}</strong> ha cortado el vínculo contigo.
              {desvinculacion.rol_afectada === 'pareja'
                ? ' Ya no podrás gestionar su ciclo ni acceder a sus datos.'
                : ' Ya no tendrá acceso a tu ciclo.'}
            </p>
            <button
              onClick={handleCerrarDesvinculacion}
              style={{
                width: '100%', background: 'var(--primary)', color: 'white', border: 'none',
                padding: '15px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {showRejectionPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '30px' }}>
            <div style={{ color: '#F6416C', marginBottom: '20px' }}><X size={50} strokeWidth={3} /></div>
            <h2 style={{ fontSize: '22px', margin: '0 0 10px 0' }}>Solicitud no aceptada</h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '25px', lineHeight: '1.5' }}>
              Tu pareja no ha aceptado la solicitud de vinculación en este momento. Puedes volver a intentarlo más tarde o con otro código.
            </p>
            <button 
              onClick={handleCloseRejection}
              style={{ 
                width: '100%', background: 'var(--primary)', color: 'white', border: 'none', 
                padding: '15px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL DE SOLICITUD ENTRANTE */}
      {user?.solicitud_estado === 'pendiente' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1001, padding: '20px'
        }}>
          <div className="card" style={{ 
            background: 'linear-gradient(135deg, #FF9A9E 0%, #F6416C 100%)', 
            color: 'white', 
            padding: '25px', 
            maxWidth: '400px',
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '24px',
            boxShadow: '0 10px 25px rgba(246, 65, 108, 0.3)'
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
                  onClick={handleAcceptRequest}
                  disabled={requestLoading}
                  style={{ 
                    flex: 1, background: 'white', color: '#F6416C', border: 'none', 
                    padding: '12px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <Check size={18} /> Aceptar
                </button>
                <button 
                  onClick={handleRejectRequest}
                  disabled={requestLoading}
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
        </div>
      )}
    </div>
  );
}

export default App;
