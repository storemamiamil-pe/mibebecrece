'use client';
import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function RevisarCorreoPage() {
  const [reenviando, setReenviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function reenviar() {
    setReenviando(true);
    setMensaje('');
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setMensaje('No encontramos tu correo en esta sesión. Intenta crear tu cuenta de nuevo.');
      setReenviando(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setReenviando(false);
    setMensaje(error ? 'No pudimos reenviar el correo. Intenta en unos minutos.' : 'Correo reenviado. Revisa tu bandeja de entrada y spam.');
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="Mami a mil Store" />
        </div>
        <p className="section-title" style={{ textAlign: 'center' }}>Revisa tu correo</p>
        <p className="section-sub" style={{ textAlign: 'center' }}>
          Te enviamos un enlace para confirmar tu cuenta. Ábrelo desde tu celular o computadora para continuar.
        </p>
        {mensaje && <div className="success-msg">{mensaje}</div>}
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <button className="btn-outline" onClick={reenviar} disabled={reenviando}>
            {reenviando ? 'Enviando...' : 'Reenviar correo de confirmación'}
          </button>
        </div>
        <p className="section-sub" style={{ textAlign: 'center', marginTop: 18 }}>
          ¿No te llega? Revisa la carpeta de spam o promociones.
        </p>
      </div>
    </div>
  );
}
