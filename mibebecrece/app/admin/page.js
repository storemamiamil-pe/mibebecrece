import { redirect } from 'next/navigation';
import { getAdminUser } from '../../lib/admin';
import AdminPanel from '../../components/AdminPanel';

export default async function AdminPage() {
  const admin = await getAdminUser();
  // No basta con ocultar el enlace: si esta verificación falla, no se
  // renderiza absolutamente nada del panel, ni siquiera en el HTML enviado.
  if (!admin) redirect('/iniciar-sesion');

  return <AdminPanel adminEmail={admin.email} />;
}
