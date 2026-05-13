import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Heart, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear() - 25); // Default to a reasonable age
  const [viewMode, setViewMode] = useState('days'); // 'days', 'years'

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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={18} style={{ position: 'absolute', left: '16px', color: 'var(--primary)', opacity: 0.7 }} />
              <div 
                onClick={() => setShowDatePicker(true)}
                className="styled-input"
                style={{
                  paddingLeft: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  minHeight: '52px'
                }}
              >
                {fechaNacimiento 
                  ? new Date(fechaNacimiento + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Selecciona tu fecha'
                }
              </div>
            </div>
          </div>

          {/* Modal de Calendario Custom para Nacimiento */}
          {showDatePicker && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1100, padding: '20px'
            }}>
              <div className="card" style={{ maxWidth: '350px', width: '100%', padding: '20px', background: 'white', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      if (viewMode === 'days') {
                        if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(pickerYear - 1); }
                        else setPickerMonth(pickerMonth - 1);
                      } else {
                        setPickerYear(pickerYear - 12);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div 
                    onClick={() => setViewMode(viewMode === 'days' ? 'years' : 'days')}
                    style={{ fontWeight: '700', color: 'var(--primary)', textTransform: 'capitalize', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {viewMode === 'days' 
                      ? `${new Date(pickerYear, pickerMonth).toLocaleDateString('es-ES', { month: 'long' })} ${pickerYear}`
                      : 'Selecciona Año'
                    }
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      if (viewMode === 'days') {
                        if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(pickerYear + 1); }
                        else setPickerMonth(pickerMonth + 1);
                      } else {
                        setPickerYear(pickerYear + 12);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {viewMode === 'days' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                      {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ fontSize: '11px', fontWeight: '800', color: '#cbd5e1' }}>{d}</div>)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {Array.from({ length: (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7 }).map((_, i) => <div key={`e-${i}`}></div>)}
                      {Array.from({ length: new Date(pickerYear, pickerMonth + 1, 0).getDate() }).map((_, i) => {
                        const d = i + 1;
                        const dateStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const isSelected = fechaNacimiento === dateStr;
                        const isFuture = new Date(pickerYear, pickerMonth, d) > new Date();
                        return (
                          <div 
                            key={d} 
                            onClick={() => { if (!isFuture) { setFechaNacimiento(dateStr); setShowDatePicker(false); } }}
                            style={{
                              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '13px', fontWeight: isSelected ? '700' : '500', borderRadius: '12px',
                              cursor: isFuture ? 'default' : 'pointer',
                              background: isSelected ? 'var(--primary)' : 'transparent',
                              color: isSelected ? 'white' : (isFuture ? '#e2e8f0' : 'var(--text-dark)'),
                              transition: 'all 0.2s'
                            }}
                          >
                            {d}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {Array.from({ length: 12 }, (_, i) => pickerYear - 5 + i).map(y => (
                      <div 
                        key={y}
                        onClick={() => { setPickerYear(y); setViewMode('days'); }}
                        style={{
                          padding: '10px', borderRadius: '12px', textAlign: 'center',
                          fontSize: '14px', fontWeight: y === pickerYear ? '700' : '500',
                          background: y === pickerYear ? 'var(--primary)' : '#f8fafc',
                          color: y === pickerYear ? 'white' : 'var(--text-dark)',
                          cursor: 'pointer'
                        }}
                      >
                        {y}
                      </div>
                    ))}
                  </div>
                )}
                
                <button 
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  style={{ width: '100%', marginTop: '20px', padding: '12px', borderRadius: '16px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
          
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
