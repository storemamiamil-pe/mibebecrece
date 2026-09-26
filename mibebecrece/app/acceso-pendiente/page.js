'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SupportButton from '../../components/SupportButton';
import { createClient } from '../../lib/supabase/client';

export default function AccesoPendientePage() {
  const router = useRouter();
  const [estado, setEstado] = useState('verificando'); // verificando | sin_compra | error
  const [email, setEmail] = useState('');

  async function intentarVincular() {
    setEstado('verificando');
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email || '');

      const res = await fetch('/api/link-purchase', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.estado === 'active') {
        router.push('/onboarding');
        router.refresh();
        return;
      }
      if (res.ok && data.vinculado) {
        // Se vinculó una compra, pero con un estado distinto a "activa"
        // (por ejemplo, reembolsada). El middleware la mandará a la
        // pantalla correcta al refrescar.
        router.refresh();
        return;
      }
      setEstado('sin_compra');
    } catch (e) {
      setEstado('error');
    }
  }

  useEffect(() => {
    intentarVincular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="Mami a mil Store" />
        </div>

        {estado === 'verificando' && (
          <>
            <p className="section-title" style={{ textAlign: 'center' }}>Verificando tu compra...</p>
            <p className="section-sub" style={{ textAlign: 'center' }}>Esto toma solo un momento.</p>
          </>
        )}

        {estado === 'sin_compra' && (
          <>
            <p className="section-title" style={{ textAlign: 'center' }}>Aún no encontramos tu compra</p>
            <p className="section-sub" style={{ textAlign: 'center' }}>
              No encontramos una compra asociada a este correo{email ? <> (<b>{email}</b>)</> : ''}. Verifica que sea
              el mismo correo que utilizaste al comprar en Hotmart.
            </p>
            <p className="section-sub" style={{ textAlign: 'center' }}>
              Si acabas de comprar, puede tardar unos minutos en confirmarse. Si el problema continúa, escríbenos.
            </p>
            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <button className="btn-solid" onClick={intentarVincular}>Volver a verificar</button>
            </div>
            <SupportButton />
          </>
        )}

        {estado === 'error' && (
          <>
            <p className="section-title" style={{ textAlign: 'center' }}>Algo salió mal</p>
            <p className="section-sub" style={{ textAlign: 'center' }}>No pudimos verificar tu acceso. Intenta de nuevo.</p>
            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <button className="btn-solid" onClick={intentarVincular}>Reintentar</button>
            </div>
            <SupportButton />
          </>
        )}
      </div>
    </div>
  );
}
