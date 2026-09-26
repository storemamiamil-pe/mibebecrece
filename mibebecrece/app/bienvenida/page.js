import Link from 'next/link';
import { NOMBRE_APP, NOMBRE_MARCA } from '../../lib/config';

export default function BienvenidaPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt={NOMBRE_MARCA} />
        </div>
        <p className="section-title" style={{ textAlign: 'center' }}>{NOMBRE_APP}</p>
        <p className="section-sub" style={{ textAlign: 'center' }}>
          Hitos, juegos y actividades para acompañar cada etapa de tu bebé, de una manera práctica, respetuosa y sin
          comparaciones.
        </p>
        <p className="section-sub" style={{ textAlign: 'center' }}>
          Si ya compraste en Hotmart, crea tu cuenta con el <b>mismo correo</b> de tu compra para activar tu acceso.
        </p>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <Link href="/crear-cuenta" className="btn-solid">Ya compré, crear mi cuenta</Link>
        </div>
        <p className="auth-links">
          ¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
