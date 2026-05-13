import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Heart } from 'lucide-react';

export default function RegisterScreen() {
  const { register, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('usuaria');
  const [codigoPareja, setCodigoPareja] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(nombre, email, password, role, role === 'pareja' ? codigoPareja : null, fechaNacimiento || null);
      await login(email, password); // Auto login tras registro exitoso
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container">
      <div style={{ textAlign: 'center', margin: '40px 0' }}>
        <h1 style={{ fontSize: '32px' }}>Crear Cuenta</h1>
        <p className="subtitle">Únete a Nuvia hoy</p>
      </div>

      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
        <div className="role-selector-container">
          <div className={`role-marker ${role}`}></div>
          <div 
            className={`role-option ${role === 'usuaria' ? 'active' : ''}`} 
            onClick={() => setRole('usuaria')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <User size={18} />
            Usuaria
          </div>
          <div 
            className={`role-option ${role === 'pareja' ? 'active' : ''}`} 
            onClick={() => setRole('pareja')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Heart size={18} />
            Pareja
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: 'red', marginBottom: '16px', fontSize: '14px', background: '#ffebee', padding: '10px', borderRadius: '8px' }}>{error}</div>}
          
          <div className="input-group">
            <label className="input-label">Nombre</label>
            <input 
              type="text" 
              className="styled-input" 
              value={nombre} 
              onChange={e => setNombre(e.target.value)} 
              required 
              placeholder="Tu nombre"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Correo Electrónico</label>
            <input 
              type="email" 
              className="styled-input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="tu@email.com"
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Contraseña</label>
            <input 
              type={showPassword ? "text" : "password"} 
              className="styled-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              style={{ paddingRight: '45px' }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle" style={{ top: '38px' }}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="input-group">
            <label className="input-label">Tu Fecha de Nacimiento</label>
            <input 
              type="date" 
              className="styled-input" 
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              required
            />
          </div>
          
          {role === 'pareja' && (
            <div className="input-group" style={{ animation: 'fadeIn 0.3s ease' }}>
              <label className="input-label">Código de Pareja</label>
              <input 
                type="text" 
                className="styled-input" 
                value={codigoPareja} 
                onChange={e => setCodigoPareja(e.target.value.toUpperCase())} 
                placeholder="EJ: A1B2C3"
                maxLength={6}
              />
              <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                Pídele a tu pareja su código único de Nuvia.
              </p>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <div className="loader"></div> : 'Registrarse'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
            ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
