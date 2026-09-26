import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '../../../../lib/supabase/admin';

// Next.js necesita el runtime de Node (no Edge) porque usamos el módulo
// nativo "crypto" para comparar el Hottok de forma segura contra ataques de
// tiempo (timing attack), y porque el cliente admin de Supabase requiere
// Node.

export const runtime = 'nodejs';

// Mapa de eventos de Hotmart 2.0.0 que sí cambian el acceso de la clienta.
// Nombres tomados tal cual de la documentación vigente de Hotmart
// (https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/).
// No se inventó ningún nombre de evento.
const EVENTOS_QUE_OTORGAN_ACCESO = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']);
const EVENTOS_QUE_REVOCAN_ACCESO = {
  PURCHASE_REFUNDED: 'refunded',
  PURCHASE_CHARGEBACK: 'chargeback',
  PURCHASE_CANCELED: 'cancelled',
  PURCHASE_EXPIRED: 'expired',
};
// Otros eventos de compra existen (PURCHASE_BILLET_PRINTED, PURCHASE_PROTEST,
// PURCHASE_DELAYED, PURCHASE_OUT_OF_SHOPPING_CART) pero no otorgan ni revocan
// acceso: solo se registran en el log técnico para no perder el evento.

function hottokValido(hottokRecibido) {
  const esperado = process.env.HOTMART_HOTTOK;
  if (!esperado || !hottokRecibido) return false;
  const a = Buffer.from(String(hottokRecibido));
  const b = Buffer.from(String(esperado));
  if (a.length !== b.length) return false;
  // Comparación en tiempo constante para no filtrar el secreto por timing.
  return crypto.timingSafeEqual(a, b);
}

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function POST(request) {
  // 1) Validar el Hottok ANTES de leer o confiar en nada del cuerpo.
  const hottokHeader = request.headers.get('x-hotmart-hottok');
  if (!hottokValido(hottokHeader)) {
    // No revelamos detalles del motivo del rechazo.
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { id: hotmartEventId, event: eventName, data } = body || {};

  if (!hotmartEventId || !eventName) {
    return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 2) Idempotencia: si ya procesamos este mismo evento, respondemos 200 sin
  // volver a aplicar cambios. Hotmart puede reintentar entregas.
  const transactionId = data?.purchase?.transaction || null;
  const { error: insertLogError } = await admin.from('hotmart_webhook_events').insert({
    hotmart_event_id: hotmartEventId,
    event_name: eventName,
    transaction_id: transactionId,
    payload: body,
  });

  if (insertLogError) {
    // Código 23505 = violación de unicidad → ya lo habíamos procesado.
    if (insertLogError.code === '23505') {
      return NextResponse.json({ ok: true, duplicado: true }, { status: 200 });
    }
    console.error('Error registrando evento de Hotmart:', insertLogError.message);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  // 3) Solo procesamos eventos de compra que afectan el acceso.
  const otorgaAcceso = EVENTOS_QUE_OTORGAN_ACCESO.has(eventName);
  const nuevoEstadoRevocacion = EVENTOS_QUE_REVOCAN_ACCESO[eventName];

  if (!otorgaAcceso && !nuevoEstadoRevocacion) {
    // Evento válido pero irrelevante para el acceso (boleto impreso, disputa
    // abierta, carrito abandonado, etc.). Ya quedó registrado arriba.
    return NextResponse.json({ ok: true, ignorado: true }, { status: 200 });
  }

  if (!transactionId) {
    console.error('Evento de compra sin transaction_id:', eventName);
    return NextResponse.json({ error: 'Falta transaction_id' }, { status: 400 });
  }

  // 4) Verificar que la compra sea del producto autorizado para esta app.
  //    Esto evita que comprar OTRO producto de Hotmart active esta app.
  const productId = String(data?.product?.id ?? '');
  const productoPermitido = process.env.HOTMART_PRODUCT_ID;
  if (productoPermitido && productId !== String(productoPermitido)) {
    return NextResponse.json({ ok: true, producto_no_autorizado: true }, { status: 200 });
  }

  const buyerEmail = normalizarEmail(data?.buyer?.email);
  if (!buyerEmail) {
    console.error('Evento de compra sin correo de comprador:', eventName, transactionId);
    return NextResponse.json({ error: 'Falta el correo del comprador' }, { status: 400 });
  }

  const estado = otorgaAcceso ? 'active' : nuevoEstadoRevocacion;

  // 5) Buscar si ya existe una cuenta registrada con ese correo, para
  //    vincular el acceso de inmediato. Si no existe, se guarda sin
  //    user_id: quedará "flotando" hasta que la clienta se registre y
  //    /api/link-purchase la vincule con su cuenta.
  const { data: perfilExistente } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', buyerEmail)
    .maybeSingle();

  // Buscamos si esta transacción ya tenía una fila (por ejemplo, un
  // PURCHASE_APPROVED anterior) para no pisar su access_started_at original
  // cuando llegue un evento posterior como PURCHASE_COMPLETE.
  const { data: filaPrevia } = await admin
    .from('access_entitlements')
    .select('access_started_at')
    .eq('provider', 'hotmart')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  const accessStartedAt =
    filaPrevia?.access_started_at || (estado === 'active' ? new Date().toISOString() : null);

  const filaEntitlement = {
    user_id: perfilExistente?.id ?? null,
    buyer_email: buyerEmail,
    provider: 'hotmart',
    transaction_id: transactionId,
    product_id: productId || null,
    status: estado,
    access_started_at: accessStartedAt,
  };

  const { error: upsertError } = await admin
    .from('access_entitlements')
    .upsert(filaEntitlement, { onConflict: 'provider,transaction_id' });

  if (upsertError) {
    console.error('Error actualizando access_entitlements:', upsertError.message);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

// Hotmart solo envía POST. Cualquier otro método se rechaza explícitamente.
export async function GET() {
  return NextResponse.json({ error: 'Método no permitido' }, { status: 405 });
}
