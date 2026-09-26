// Estados posibles del acceso de una compradora, en el orden en que se
// deben evaluar. "active" es el único que permite entrar al contenido
// principal de la app.
export const ACCESS_STATES = {
  NO_SESSION: 'no_session', // no ha iniciado sesión
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  NO_ENTITLEMENT: 'no_entitlement', // cuenta creada, ninguna compra vinculada aún
  PENDING: 'pending',
  ACTIVE: 'active',
  REFUNDED: 'refunded',
  CHARGEBACK: 'chargeback',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

/**
 * Determina el estado de acceso real de un usuario a partir de su fila en
 * access_entitlements. Se apoya en RLS: el supabaseClient que se le pase
 * debe estar autenticado como ese usuario (o ser el cliente admin, para el
 * panel administrativo).
 */
export async function getAccessStatus(supabase, user) {
  if (!user) return ACCESS_STATES.NO_SESSION;
  if (!user.email_confirmed_at) return ACCESS_STATES.EMAIL_NOT_CONFIRMED;

  const { data: entitlements, error } = await supabase
    .from('access_entitlements')
    .select('status, access_expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al leer access_entitlements:', error.message);
    return ACCESS_STATES.NO_ENTITLEMENT;
  }

  if (!entitlements || entitlements.length === 0) {
    return ACCESS_STATES.NO_ENTITLEMENT;
  }

  // Si existe alguna fila "active" que no haya vencido, el acceso es activo,
  // sin importar que existan filas antiguas con otros estados.
  const activa = entitlements.find((e) => {
    if (e.status !== 'active') return false;
    if (!e.access_expires_at) return true; // acceso de por vida
    return new Date(e.access_expires_at) > new Date();
  });
  if (activa) return ACCESS_STATES.ACTIVE;

  // Si había una activa pero ya venció por fecha, es "expired".
  const vencida = entitlements.find(
    (e) => e.status === 'active' && e.access_expires_at && new Date(e.access_expires_at) <= new Date()
  );
  if (vencida) return ACCESS_STATES.EXPIRED;

  // De lo contrario, se usa el estado más reciente registrado.
  const masReciente = entitlements[0].status;
  if (ACCESS_STATES[masReciente?.toUpperCase()]) return masReciente;
  return ACCESS_STATES.PENDING;
}
