import React, { useState, useEffect, useMemo, createContext } from 'react';
import PropTypes from 'prop-types';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { createUserProfile, getUserByEmail } from '../services/userService';
import { getAuthErrorMessage } from '../utils/authErrorMessages';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Obtener el perfil del usuario desde Firestore
        const profile = await getUserByEmail(currentUser.email);
        setUser(currentUser);
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (email, password, username) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Crear perfil de usuario en Firestore
      await createUserProfile(userCredential.user.uid, email, username);
      
      // Obtener el perfil creado
      const profile = await getUserByEmail(email);
      setUserProfile(profile);
      
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Error al crear la cuenta. Intenta nuevamente.'));
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Obtener el perfil del usuario
      const profile = await getUserByEmail(userCredential.user.email);
      setUserProfile(profile);
      
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Error al iniciar sesión. Intenta nuevamente.'));
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Error al cerrar sesión. Intenta nuevamente.'));
      throw err;
    }
  };

  const authValue = useMemo(() => ({
    user,
    userProfile,
    loading,
    error,
    register,
    login,
    logout
  }), [user, userProfile, loading, error]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};
