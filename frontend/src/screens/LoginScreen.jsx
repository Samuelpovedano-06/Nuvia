import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, Lock } from 'lucide-react';

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
    <div className="screen-container" style={{ padding: '40px 32px' }}>
      {/* Logo & Decoration */}
      <div className="decoration-container">
        <div className="sparkle-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
          <img src="/logo.png" alt="Nuvia Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div className="bubbles-bg">
          <div className="bubble bubble-1"></div>
          <div className="bubble bubble-2"></div>
          <div className="bubble bubble-3"></div>
        </div>
        <div className="smile-path"></div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '38px', marginBottom: '4px' }}>Nuvia</h1>
        <p className="subtitle" style={{ fontSize: '18px' }}>Tu compañera de bienestar</p>
      </div>

      <div style={{ flex: 1 }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ 
              color: '#d32f2f', 
              marginBottom: '20px', 
              fontSize: '14px', 
              background: '#ffebee', 
              padding: '12px', 
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid #ffcdd2'
            }}>
              {error}
            </div>
          )}
          
          <div className="input-group">
            <div className="input-with-icon">
              <Mail className="input-icon" size={20} />
              <input 
                type="email" 
                className="styled-input with-icon" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                placeholder="Email"
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-with-icon">
              <Lock className="input-icon" size={20} />
              <input 
                type="password" 
                className="styled-input with-icon" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                placeholder="Contraseña"
              />
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link to="#" className="login-link" style={{ fontSize: '14px', marginBottom: '24px' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '18px' }}>
            {loading ? <div className="loader" style={{ width: '20px', height: '20px' }}></div> : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <Link to="/register" className="login-link" style={{ fontWeight: '600' }}>
            Crear Cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
