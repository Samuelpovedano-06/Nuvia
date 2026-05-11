import React, { useContext, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';
import AdminUsersScreen from './screens/AdminUsersScreen';
import SymptomsScreen from './screens/SymptomsScreen';
import CalendarScreen from './screens/CalendarScreen';
import WellnessScreen from './screens/WellnessScreen';

function App() {
  const { user, loading } = useContext(AuthContext);

  // Aplicar modo oscuro globalmente al cargar la app
  useEffect(() => {
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

  return (
    <div className="app-container">
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
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
