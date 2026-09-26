'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { traducirErrorAuth } from '../../lib/authErrors';
import PasswordField from '../../components/PasswordField';

export default function RestablecerContrasenaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirmar) return setError('Las contraseñas no coinciden.');

    setCargando(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setCargando(false);

    if (updateError) {
      setError(traducirErrorAuth(updateError.message));
      return;
    }
    setListo(true);
    setTimeout(() => router.push('/app'), 1800);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="Mami a mil Store" />
        </div>
        <p className="section-title" style={{ textAlign: 'center' }}>Crea tu nueva contraseña</p>

        {listo ? (
          <p className="success-msg">Contraseña actualizada. Entrando a la app...</p>
        ) : (
          <>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <PasswordField id="password" label="Nueva contraseña (mínimo 8 caracteres)" value={password} onChange={setPassword} autoComplete="new-password" />
              <PasswordField id="confirmar" label="Confirma tu nueva contraseña" value={confirmar} onChange={setConfirmar} autoComplete="new-password" />
              <div className="btn-row" style={{ justifyContent: 'center' }}>
                <button type="submit" className="btn-solid" disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
