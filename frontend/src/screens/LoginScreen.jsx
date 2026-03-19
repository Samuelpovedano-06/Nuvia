import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container">
      <div style={{ textAlign: 'center', margin: '40px 0' }}>
        <h1 style={{ fontSize: '32px' }}>Bienvenida a Nuvia</h1>
        <p className="subtitle">Tu bienestar en un solo lugar</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: 'red', marginBottom: '16px', fontSize: '14px', background: '#ffebee', padding: '10px', borderRadius: '8px' }}>{error}</div>}
          
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
            {loading ? <div className="loader"></div> : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
            ¿No tienes cuenta? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Regístrate aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
