import SupportButton from '../../components/SupportButton';
import { SOPORTE_EMAIL } from '../../lib/config';

export default function EliminarCuentaPage() {
  return (
    <div className="app-shell">
      <div className="screen">
        <p className="section-title">Eliminar mi cuenta y mis datos</p>
        <div className="card">
          <p>
            Puedes solicitar la eliminación completa de tu cuenta y de todos los datos asociados (tu perfil, el perfil
            de tu bebé, hitos, actividades y logros registrados) en cualquier momento.
          </p>
          <p>Para procesar tu solicitud de forma segura, escríbenos desde el mismo correo con el que creaste tu cuenta a {SOPORTE_EMAIL}, indicando &quot;Eliminar mi cuenta&quot; en el asunto.</p>
          <p>Una vez confirmada tu identidad, eliminaremos tus datos en un plazo de [DEFINE TU PLAZO, ej. 15 días hábiles]. Esta acción es permanente y no se puede deshacer.</p>
        </div>
        <SupportButton />
        <p className="section-sub" style={{ marginTop: 16, fontSize: 12 }}>
          Nota para la desarrolladora: este flujo es manual por seguridad. Si prefieres un botón de autoservicio, se
          puede agregar una ruta protegida que llame a <code>supabase.auth.admin.deleteUser</code> desde el servidor.
        </p>
      </div>
    </div>
  );
}
