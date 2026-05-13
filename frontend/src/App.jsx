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
import { Heart, Sparkles, Calendar, User, Home } from 'lucide-react';

const BottomNav = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;
  
  // No mostrar en login/register
  const noNavRoutes = ['/login', '/register'];
  if (noNavRoutes.includes(location.pathname)) return null;

  const isUnlinkedPareja = user.rol === 'pareja' && !user.codigo_pareja;

  const navItems = [
    { label: 'Inicio', icon: <Home size={22} />, path: '/', restricted: false },
    { label: 'Bienestar', icon: <Sparkles size={22} />, path: '/wellness', restricted: true },
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
  const { user, loading } = useContext(AuthContext);
  const [maintenance, setMaintenance] = React.useState(false);

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
      <Routes>
        <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <RegisterScreen /> : <Navigate to="/" />} />

        {/* Rutas protegidas */}
        <Route path="/" element={user ? <HomeScreen /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <ProfileScreen /> : <Navigate to="/login" />} />
        <Route path="/sintomas" element={user ? <SymptomsScreen /> : <Navigate to="/login" />} />
        <Route path="/calendar" element={user ? <CalendarScreen /> : <Navigate to="/login" />} />
        <Route path="/wellness" element={user ? <WellnessScreen /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user?.rol === 'admin' ? <AdminPanelScreen /> : <Navigate to="/" />} />
        <Route path="/admin/users" element={user?.rol === 'admin' ? <AdminUsersScreen /> : <Navigate to="/" />} />
        <Route path="/admin/config" element={user?.rol === 'admin' ? <AdminConfigScreen /> : <Navigate to="/" />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default App;
