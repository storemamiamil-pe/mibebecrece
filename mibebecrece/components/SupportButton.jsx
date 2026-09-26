import { SOPORTE_WHATSAPP_URL, SOPORTE_EMAIL } from '../lib/config';

export default function SupportButton() {
  return (
    <div className="btn-row" style={{ justifyContent: 'center' }}>
      <a className="btn-outline" href={SOPORTE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
        Escribir a soporte por WhatsApp
      </a>
      <a className="btn-outline" href={`mailto:${SOPORTE_EMAIL}`}>
        Escribir por correo
      </a>
    </div>
  );
}
