'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import { traducirErrorAuth } from '../../lib/authErrors';

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Ese correo no parece válido.');

    setCargando(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setCargando(false);

    if (resetError) {
      setError(traducirErrorAuth(resetError.message));
      return;
    }
    setEnviado(true);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="Mami a mil Store" />
        </div>
        <p className="section-title" style={{ textAlign: 'center' }}>Recupera tu contraseña</p>

        {enviado ? (
          <>
            <p className="success-msg">
              Si existe una cuenta con ese correo, te enviamos un enlace para crear una nueva contraseña.
            </p>
            <p className="auth-links">
              <Link href="/iniciar-sesion">Volver a iniciar sesión</Link>
            </p>
          </>
        ) : (
          <>
            <p className="section-sub" style={{ textAlign: 'center' }}>
              Escribe el correo con el que creaste tu cuenta.
            </p>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Correo electrónico</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="btn-row" style={{ justifyContent: 'center' }}>
                <button type="submit" className="btn-solid" disabled={cargando}>
                  {cargando ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
