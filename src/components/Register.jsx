import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { checkUsernameExists } from '../services/userService';
import { getAuthErrorMessage } from '../utils/authErrorMessages';
import './Auth.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Validar formato de email
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validar requisitos de contraseña
  const isValidPassword = (password) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasMinLength = password.length >= 8;
    
    return hasUppercase && hasLowercase && hasNumber && hasMinLength;
  };

  // Obtener detalles de validación de contraseña
  const getPasswordValidationErrors = (pwd) => {
    const errors = [];
    if (!/[A-Z]/.test(pwd)) errors.push('al menos una mayúscula');
    if (!/[a-z]/.test(pwd)) errors.push('al menos una minúscula');
    if (!/\d/.test(pwd)) errors.push('al menos un número');
    if (pwd.length < 8) errors.push('mínimo 8 caracteres');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('El nombre de usuario es requerido');
      return;
    }

    if (username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!isValidPassword(password)) {
      const errors = getPasswordValidationErrors(password);
      setError(`La contraseña debe tener: ${errors.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      // Verificar si el username ya existe
      const usernameExists = await checkUsernameExists(username);
      if (usernameExists) {
        setError('El nombre de usuario ya está en uso');
        setLoading(false);
        return;
      }

      await register(email, password, username);
      navigate('/dashboard');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Error al crear la cuenta. Intenta nuevamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Crear Cuenta</h1>
        <p className="subtitle">Sistema de Presupuestos de Viajes</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="register-username">Nombre de Usuario</label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tu_usuario"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Correo Electrónico</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={loading}
            />
            {email && !isValidEmail(email) && (
              <small className="validation-error">Correo inválido</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-password">Contraseña</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <div className="password-requirements">
              <small className={/[A-Z]/.test(password) ? 'valid' : 'invalid'}>
                {/[A-Z]/.test(password) ? '✓' : '○'} Mayúscula
              </small>
              <small className={/[a-z]/.test(password) ? 'valid' : 'invalid'}>
                {/[a-z]/.test(password) ? '✓' : '○'} Minúscula
              </small>
              <small className={/\d/.test(password) ? 'valid' : 'invalid'}>
                {/\d/.test(password) ? '✓' : '○'} Número
              </small>
              <small className={password.length >= 8 ? 'valid' : 'invalid'}>
                {password.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
              </small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="register-confirm-password">Confirmar Contraseña</label>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
            {confirmPassword && password !== confirmPassword && (
              <small className="validation-error">Las contraseñas no coinciden</small>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p className="signup-link">
          ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
};

export default Register;
