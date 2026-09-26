'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { traducirErrorAuth } from '../../lib/authErrors';
import PasswordField from '../../components/PasswordField';

export default function IniciarSesionPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setCargando(false);

    if (signInError) {
      setError(traducirErrorAuth(signInError.message));
      return;
    }
    // El middleware decide a dónde mandarla según su estado de acceso.
    router.push('/app');
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="Mami a mil Store" />
        </div>
        <p className="section-title" style={{ textAlign: 'center' }}>Bienvenida de nuevo</p>
        <p className="section-sub" style={{ textAlign: 'center' }}>Inicia sesión para seguir acompañando a tu bebé.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <PasswordField id="password" label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />

          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <button type="submit" className="btn-solid" disabled={cargando}>
              {cargando ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>

        <p className="auth-links">
          <Link href="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link>
        </p>
        <p className="auth-links">
          ¿Aún no tienes cuenta? <Link href="/crear-cuenta">Créala aquí</Link>
        </p>
      </div>
    </div>
  );
}
