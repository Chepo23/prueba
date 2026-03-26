import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBjc129a-z88d_MXkQL8woujoPJwSxJqs8",
  authDomain: "prueba-16daa.firebaseapp.com",
  projectId: "prueba-16daa",
  storageBucket: "prueba-16daa.firebasestorage.app",
  messagingSenderId: "349920222073",
  appId: "1:349920222073:web:4f494eed76ae610a4c6da8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Autenticación y Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
