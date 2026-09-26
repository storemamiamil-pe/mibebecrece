export default function PrivacidadPage() {
  return (
    <div className="app-shell">
      <div className="screen">
        <p className="section-title">Política de privacidad</p>
        <div className="disclaimer-box" style={{ marginBottom: 20 }}>
          ⚠️ <b>Plantilla incompleta:</b> reemplaza cada [CORCHETE] con los datos reales de tu negocio antes de publicar. Te recomendamos que un abogado revise el texto final.
        </div>
        <div className="card">
          <p><b>Responsable de los datos:</b> [NOMBRE LEGAL DE TU NEGOCIO], [PAÍS], contacto: [CORREO DE CONTACTO].</p>
          <p><b>Qué datos recopilamos:</b> nombre y correo de la cuenta; nombre, fecha de nacimiento, semanas de gestación y foto (opcional) del bebé; el progreso de hitos y actividades que registras; información de la compra en Hotmart necesaria para validar tu acceso (correo, número de transacción, producto).</p>
          <p><b>Para qué los usamos:</b> para darte acceso a la aplicación, personalizar el contenido según la edad de tu bebé, y para soporte si nos escribes.</p>
          <p><b>Con quién los compartimos:</b> con Supabase (alojamiento de la base de datos) y Hotmart (procesamiento de la compra). No vendemos tus datos a terceros.</p>
          <p><b>Cuánto tiempo los guardamos:</b> [DEFINE TU POLÍTICA DE RETENCIÓN, ej. mientras tu cuenta esté activa y hasta 12 meses después de solicitarnos su eliminación].</p>
          <p><b>Tus derechos:</b> puedes solicitar en cualquier momento ver, corregir o eliminar tus datos y los de tu bebé escribiendo a [CORREO DE CONTACTO], o desde la página de <a href="/eliminar-cuenta">eliminación de cuenta</a>.</p>
          <p><b>Última actualización:</b> [FECHA].</p>
        </div>
      </div>
    </div>
  );
}
