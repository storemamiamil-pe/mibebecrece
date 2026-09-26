'use client';
import { useState } from 'react';
import { formatearFecha } from '../lib/helpers';

const ESTADOS = ['pending', 'active', 'refunded', 'chargeback', 'cancelled', 'expired'];

export default function AdminPanel({ adminEmail }) {
  const [email, setEmail] = useState('');
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function buscar(e) {
    e.preventDefault();
    setError(''); setMensaje(''); setResultado(null);
    if (!email.trim()) return;
    setCargando(true);
    const res = await fetch(`/api/admin/lookup?email=${encodeURIComponent(email.trim())}`);
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error || 'Error al buscar'); return; }
    setResultado(data);
  }

  async function cambiarEstado(entitlementId, status) {
    setError(''); setMensaje('');
    const res = await fetch('/api/admin/set-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entitlementId, status }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Error al actualizar'); return; }
    setMensaje('Acceso actualizado correctamente.');
    buscar({ preventDefault: () => {} });
  }

  return (
    <div className="app-shell">
      <div className="top-header">
        <img src="/logo.png" alt="Mami a mil Store" />
        <div>
          <div className="brandname">Panel administrativo</div>
          <div className="tagline">{adminEmail}</div>
        </div>
      </div>

      <div className="screen">
        <p className="section-title">Buscar compradora</p>
        <form onSubmit={buscar}>
          <div className="field">
            <label htmlFor="admin-email">Correo de la clienta</label>
            <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="btn-row"><button className="btn-solid" disabled={cargando}>{cargando ? 'Buscando...' : 'Buscar'}</button></div>
        </form>

        {error && <div className="error-msg">{error}</div>}
        {mensaje && <div className="success-msg">{mensaje}</div>}

        {resultado && (
          <>
            <div className="card">
              <p className="field-label" style={{ marginTop: 0 }}>Cuenta</p>
              {resultado.cuentaCreada ? (
                <>
                  <p style={{ margin: '0 0 4px', fontSize: 14 }}>Nombre: <b>{resultado.perfil.full_name || '(sin nombre)'}</b></p>
                  <p style={{ margin: 0, fontSize: 14 }}>Registrada: {formatearFecha(resultado.perfil.created_at?.slice(0, 10))}</p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 14 }}>Esta persona todavía no ha creado su cuenta.</p>
              )}
            </div>

            <p className="section-title" style={{ fontSize: 17 }}>Compras encontradas ({resultado.compras.length})</p>
            {!resultado.compras.length && <div className="empty-state">No hay compras registradas con este correo.</div>}
            {resultado.compras.map((c) => (
              <div key={c.id} className="card">
                <p style={{ margin: '0 0 4px', fontSize: 14 }}><b>Transacción:</b> {c.transaction_id}</p>
                <p style={{ margin: '0 0 4px', fontSize: 14 }}><b>Producto:</b> {c.product_id || '—'}</p>
                <p style={{ margin: '0 0 4px', fontSize: 14 }}><b>Estado actual:</b> <span className="badge badge-blue">{c.status}</span></p>
                <p style={{ margin: '0 0 12px', fontSize: 14 }}><b>Registrada:</b> {formatearFecha(c.created_at?.slice(0, 10))}</p>
                <p className="field-label" style={{ marginTop: 0 }}>Cambiar estado manualmente</p>
                <div className="chip-select">
                  {ESTADOS.map((s) => (
                    <span key={s} className={`chip-option ${c.status === s ? 'selected' : ''}`} onClick={() => cambiarEstado(c.id, s)}>{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
