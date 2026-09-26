'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { traducirErrorAuth } from '../../lib/authErrors';
import PasswordField from '../../components/PasswordField';

export default function CrearCuentaPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) return setError('Cuéntanos tu nombre para personalizar la app.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Ese correo no parece válido. Revisa que esté bien escrito.');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirmar) return setError('Las contraseñas no coinciden.');

    setCargando(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: nombre.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setCargando(false);

    if (signUpError) {
      setError(traducirErrorAuth(signUpError.message));
      return;
    }
    router.push('/revisar-correo');
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="Mami a mil Store" />
        </div>
        <p className="section-title" style={{ textAlign: 'center' }}>Crea tu cuenta</p>
        <p className="section-sub" style={{ textAlign: 'center' }}>
          Usa el <b>mismo correo</b> con el que compraste en Hotmart, así vinculamos tu acceso automáticamente.
        </p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="nombre">Tu nombre</label>
            <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <PasswordField id="password" label="Contraseña (mínimo 8 caracteres)" value={password} onChange={setPassword} autoComplete="new-password" />
          <PasswordField id="confirmar" label="Confirma tu contraseña" value={confirmar} onChange={setConfirmar} autoComplete="new-password" />

          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <button type="submit" className="btn-solid" disabled={cargando}>
              {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>
        </form>

        <p className="auth-links">
          ¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
