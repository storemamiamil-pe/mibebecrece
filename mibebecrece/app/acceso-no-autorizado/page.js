import SupportButton from '../../components/SupportButton';

export default function AccesoNoAutorizadoPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="Mami a mil Store" />
        </div>
        <p className="section-title" style={{ textAlign: 'center' }}>Tu acceso no está activo</p>
        <p className="section-sub" style={{ textAlign: 'center' }}>
          Según nuestros registros, tu compra fue reembolsada, tuvo un contracargo o el acceso fue cancelado.
          Tus datos y los de tu bebé siguen guardados de forma privada, pero el contenido está pausado por ahora.
        </p>
        <p className="section-sub" style={{ textAlign: 'center' }}>
          Si crees que esto es un error, contáctanos y lo revisamos con gusto.
        </p>
        <SupportButton />
      </div>
    </div>
  );
}
