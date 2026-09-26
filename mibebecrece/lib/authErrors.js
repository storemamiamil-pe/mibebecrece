const MAPA_ERRORES = {
  'Invalid login credentials': 'El correo o la contraseña no son correctos. Revisa e intenta de nuevo.',
  'Email not confirmed': 'Todavía no has confirmado tu correo. Revisa tu bandeja de entrada.',
  'User already registered': 'Ya existe una cuenta con este correo. Intenta iniciar sesión.',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 8 caracteres.',
  'Password should be at least 8 characters': 'La contraseña debe tener al menos 8 caracteres.',
  'Unable to validate email address: invalid format': 'Ese correo no parece válido. Revisa que esté bien escrito.',
  'For security purposes, you can only request this once every 60 seconds': 'Por seguridad, espera un minuto antes de volver a intentarlo.',
  'Email rate limit exceeded': 'Se hicieron muchos intentos seguidos. Espera unos minutos y vuelve a intentar.',
  'New password should be different from the old password.': 'La nueva contraseña debe ser distinta a la anterior.',
};

export function traducirErrorAuth(mensaje) {
  if (!mensaje) return 'Ocurrió un error inesperado. Intenta de nuevo.';
  for (const [clave, traduccion] of Object.entries(MAPA_ERRORES)) {
    if (mensaje.includes(clave)) return traduccion;
  }
  return 'No pudimos completar la acción. Intenta de nuevo en un momento.';
}
