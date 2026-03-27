import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getEmailByUsername } from '../services/userService';
import './Auth.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const suppressLogoutRef = useRef(false);

  // Solo cerramos sesión si el usuario volvió a /login vía historial (POP),
  // no cuando acaba de iniciar sesión y fue enviado con replace.
  useEffect(() => {
    if (user && navigationType === 'POP' && !suppressLogoutRef.current) {
      logout();
    }
  }, [user, navigationType, logout]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    suppressLogoutRef.current = true;

    try {
      // Validar que el input no esté vacío
      if (!username.trim()) {
        setError('Por favor ingresa tu nombre de usuario o correo');
        setLoading(false);
        return;
      }

      let email;
      
      // Verificar si es un email o un username
      if (username.includes('@')) {
        // Es un email, usarlo directamente
        email = username;
      } else {
        // Es un username, buscar el email
        try {
          email = await getEmailByUsername(username);
        } catch (err) {
          console.error('Error buscando username:', err);
        }
      }
      
      if (!email) {
        setError('El usuario no existe. Intenta con tu correo o username.');
        setLoading(false);
        return;
      }

      // Iniciar sesión con el email encontrado
      try {
        await login(email, password);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Error en login:', err);
        setError('Contraseña incorrecta o error al iniciar sesión.');
        suppressLogoutRef.current = false;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Inicio de Sesión</h1>
        <p className="subtitle">Sistema de Presupuestos de Viajes</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-username">Nombre de Usuario o Correo</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tu_usuario o tu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="signup-link">
          ¿No tienes cuenta? <a href="/register">Regístrate aquí</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
