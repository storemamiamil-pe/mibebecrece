import SupportButton from '../../components/SupportButton';

export default function AccesoVencidoPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="Mami a mil Store" />
        </div>
        <p className="section-title" style={{ textAlign: 'center' }}>Tu acceso ha vencido</p>
        <p className="section-sub" style={{ textAlign: 'center' }}>
          El periodo de tu acceso a {' '}
          <b>Mi Bebé Crece</b> terminó. Tus datos y los de tu bebé se mantienen guardados de forma privada.
        </p>
        <p className="section-sub" style={{ textAlign: 'center' }}>
          Si quieres renovar tu acceso, contáctanos.
        </p>
        <SupportButton />
      </div>
    </div>
  );
}
