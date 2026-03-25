import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ApiService } from '../api';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, Lock, X, KeyRound, Check, Eye, EyeOff } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal Forgot Password states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: otp, 3: success
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

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

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      await ApiService.forgotPassword(forgotEmail);
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      await ApiService.resetPassword(forgotEmail, otp, newPassword);
      setForgotStep(3);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
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
            <div style={{ color: '#d32f2f', marginBottom: '20px', fontSize: '14px', background: '#ffebee', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #ffcdd2' }}>
              {error}
            </div>
          )}
          
          <div className="input-group">
            <div className="input-with-icon">
              <Mail className="input-icon" size={20} />
              <input type="email" className="styled-input with-icon" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email" />
            </div>
          </div>

          <div className="input-group">
            <div className="input-with-icon">
              <Lock className="input-icon" size={20} />
              <input type={showPassword ? "text" : "password"} className="styled-input with-icon" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Contraseña" style={{ paddingRight: '45px' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button type="button" onClick={() => { setShowForgot(true); setForgotStep(1); setForgotError(''); }} className="login-link" style={{ fontSize: '14px', marginBottom: '24px', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
              ¿Olvidaste tu contraseña?
            </button>
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

      {/* OVERLAY MODAL FOR FORGOT PASSWORD */}
      {showForgot && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '30px', position: 'relative', animation: 'fadeIn 0.3s ease' }}>
            <button onClick={() => setShowForgot(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
              <X size={24} />
            </button>

            {forgotStep === 1 && (
              <form onSubmit={handleSendOTP}>
                <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Recuperar Contraseña</h3>
                <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-light)', marginBottom: '25px' }}>Te enviaremos un código lila a tu email.</p>
                {forgotError && <div style={{ color: 'red', fontSize: '12px', marginBottom: '15px', textAlign: 'center' }}>{forgotError}</div>}
                <div className="input-group">
                  <input type="email" className="styled-input" placeholder="Tu email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary" disabled={forgotLoading}>
                  {forgotLoading ? 'Enviando...' : 'Enviar Código'}
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword}>
                <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Introduce el Código</h3>
                <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-light)', marginBottom: '25px' }}>Hemos enviado el código a <b>{forgotEmail}</b></p>
                {forgotError && <div style={{ color: 'red', fontSize: '12px', marginBottom: '15px', textAlign: 'center' }}>{forgotError}</div>}
                <div className="input-group">
                  <input type="text" className="styled-input" placeholder="Código de 6 dígitos" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '20px' }} />
                </div>
                <div className="input-group" style={{ position: 'relative' }}>
                  <input type={showNewPassword ? "text" : "password"} className="styled-input" placeholder="Nueva Contraseña" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} style={{ paddingRight: '45px' }} />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="password-toggle" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <button type="submit" className="btn-primary" disabled={forgotLoading}>
                  {forgotLoading ? 'Cambiando...' : 'Restablecer'}
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: '#e8f5e9', color: '#2e7d32', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Check size={32} />
                </div>
                <h3 style={{ marginBottom: '10px' }}>¡Contraseña Cambiada!</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '25px' }}>Ya puedes volver a entrar con tu nueva contraseña.</p>
                <button onClick={() => setShowForgot(false)} className="btn-primary">Entendido</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
