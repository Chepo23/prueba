import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

// Crear documento de usuario en Firestore
export const createUserProfile = async (userId, email, username) => {
  try {
    const usersRef = collection(db, 'users');
    
    // Verificar si el username ya existe (case-insensitive)
    const usernameQuery = query(usersRef, where('usernameLower', '==', username.toLowerCase()));
    const usernameSnapshot = await getDocs(usernameQuery);
    
    if (!usernameSnapshot.empty) {
      throw new Error('El nombre de usuario ya está en uso');
    }
    
    // Crear nuevo perfil de usuario
    const userRef = await addDoc(usersRef, {
      userId,
      email,
      username,
      usernameLower: username.toLowerCase(), // Para búsquedas case-insensitive
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return userRef.id;
  } catch (error) {
    console.error('Error al crear perfil de usuario:', error);
    throw error;
  }
};

// Obtener usuario por email
export const getUserByEmail = async (email) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
};

// Obtener usuario por userId
export const getUserById = async (userId) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
};

// Verificar si el username existe (case-insensitive)
export const checkUsernameExists = async (username) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('usernameLower', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error al verificar username:', error);
    throw error;
  }
};

// Obtener email por username (case-insensitive)
export const getEmailByUsername = async (username) => {
  try {
    const usersRef = collection(db, 'users');
    // Buscar con lowercase para hacer case-insensitive
    const q = query(usersRef, where('usernameLower', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('Username no encontrado:', username);
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    console.log('Email encontrado:', doc.data().email);
    return doc.data().email;
  } catch (error) {
    console.error('Error al obtener email por username:', error);
    throw error;
  }
};
