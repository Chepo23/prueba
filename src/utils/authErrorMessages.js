const AUTH_ERROR_MESSAGES = {
  'auth/invalid-email': 'Por favor ingresa un correo electrónico válido.',
  'auth/email-already-in-use': 'El correo electrónico ya está en uso.',
  'auth/weak-password': 'La contraseña es muy débil. Usa una más segura.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'El usuario no existe. Intenta con tu correo o username.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Intenta de nuevo más tarde.',
  'auth/network-request-failed': 'Problema de conexión. Revisa tu internet e intenta otra vez.'
};

export const getAuthErrorMessage = (error, fallback = 'Ocurrió un error. Intenta nuevamente.') => {
  const errorCode = error?.code;

  if (errorCode && AUTH_ERROR_MESSAGES[errorCode]) {
    return AUTH_ERROR_MESSAGES[errorCode];
  }

  return fallback;
};
