import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function RegisterScreen() {
  const { register, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(nombre, email, password);
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

      <div className="card">
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

          <div className="input-group">
            <label className="input-label">Contraseña</label>
            <input 
              type="password" 
              className="styled-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>

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
