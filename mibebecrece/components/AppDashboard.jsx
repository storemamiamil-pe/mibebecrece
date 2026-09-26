'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { DATA } from '../lib/data';
import { ICONS, AREAS, AREAS_HITOS, RANGOS, LUGAR_LABELS, edadCronologicaMeses, edadCorregidaMeses, esPrematuro, rangoDeMeses, edadTexto, formatearFecha } from '../lib/helpers';

const TABS = [
  { id: 'inicio', label: '🏠 Inicio' },
  { id: 'biblioteca', label: '📚 Actividades' },
  { id: 'ahora', label: '✨ ¿Qué hacemos?' },
  { id: 'hitos', label: '📈 Hitos' },
  { id: 'logros', label: '🏆 Logros' },
  { id: 'resumen', label: '📋 Resumen' },
  { id: 'consulta', label: '💬 Cuándo consultar' },
  { id: 'rutinas', label: '🌙 Rutinas' },
];

const MENSAJES_CALMA = [
  'Cada bebé avanza a su propio ritmo. Observa, acompaña y disfruta el proceso.',
  'No hay una carrera. Lo que hoy parece pequeño, mañana es un gran paso.',
  'Jugar con tu bebé, aunque sean cinco minutos, ya es acompañar su desarrollo.',
  'Compararlo con otros bebés no ayuda. Su ritmo es único y está bien así.',
  'Estar presente vale más que hacerlo perfecto. Lo estás haciendo bien.',
  'El desarrollo no es una línea recta. Hay días de grandes saltos y días de calma.',
  'Tu bebé no necesita que aciertes siempre, necesita que estés cerca.',
];

const ESTADO_AREA_PREFERIDA = { activo: 'motriz_gruesa', tranquilo: 'lenguaje', cansado: 'sensorial', curioso: 'cognitiva' };

export default function AppDashboard({ baby, userEmail }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab] = useState('inicio');
  const [milestoneRows, setMilestoneRows] = useState([]);
  const [activityRows, setActivityRows] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cronMeses = edadCronologicaMeses(baby.fecha_nacimiento);
  const corrMeses = edadCorregidaMeses(baby.fecha_nacimiento, baby.semanas_gestacion);
  const rangoActual = rangoDeMeses(corrMeses !== null ? corrMeses : cronMeses);

  useEffect(() => {
    async function cargarProgreso() {
      const [{ data: hitos }, { data: acts }, { data: logros }] = await Promise.all([
        supabase.from('milestone_progress').select('*').eq('baby_id', baby.id),
        supabase.from('activity_progress').select('*').eq('baby_id', baby.id),
        supabase.from('achievements').select('*').eq('baby_id', baby.id).order('fecha', { ascending: false }),
      ]);
      setMilestoneRows(hitos || []);
      setActivityRows(acts || []);
      setAchievements(logros || []);
      setCargando(false);
    }
    cargarProgreso();
  }, [baby.id, supabase]);

  function getMilestone(rango, area, idx) {
    return milestoneRows.find((m) => m.rango === rango && m.area === area && m.hito_index === idx);
  }

  async function setMilestoneEstado(rango, area, idx, estado) {
    const existente = getMilestone(rango, area, idx);
    const payload = {
      user_id: existente?.user_id, // se sobreescribe abajo si es nuevo
      baby_id: baby.id,
      rango,
      area,
      hito_index: idx,
      estado,
      fecha_observada: existente?.fecha_observada || null,
      nota: existente?.nota || null,
    };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    payload.user_id = user.id;

    const { data, error } = await supabase
      .from('milestone_progress')
      .upsert(payload, { onConflict: 'baby_id,rango,area,hito_index' })
      .select()
      .single();

    if (!error && data) {
      setMilestoneRows((prev) => {
        const otras = prev.filter((m) => !(m.rango === rango && m.area === area && m.hito_index === idx));
        return [...otras, data];
      });
    }
  }

  async function setMilestoneCampo(rango, area, idx, campo, valor) {
    const existente = getMilestone(rango, area, idx);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const payload = {
      user_id: user.id,
      baby_id: baby.id,
      rango,
      area,
      hito_index: idx,
      estado: existente?.estado || 'pendiente',
      fecha_observada: existente?.fecha_observada || null,
      nota: existente?.nota || null,
      [campo]: valor,
    };
    const { data, error } = await supabase
      .from('milestone_progress')
      .upsert(payload, { onConflict: 'baby_id,rango,area,hito_index' })
      .select()
      .single();
    if (!error && data) {
      setMilestoneRows((prev) => {
        const otras = prev.filter((m) => !(m.rango === rango && m.area === area && m.hito_index === idx));
        return [...otras, data];
      });
    }
  }

  function getActivity(rango, area) {
    return activityRows.find((a) => a.rango === rango && a.area === area);
  }

  async function toggleActividad(rango, area, campo) {
    const existente = getActivity(rango, area);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const payload = {
      user_id: user.id,
      baby_id: baby.id,
      rango,
      area,
      hecho: existente?.hecho || false,
      guardado: existente?.guardado || false,
      fecha_realizada: existente?.fecha_realizada || null,
    };
    payload[campo] = !payload[campo];
    if (campo === 'hecho' && payload.hecho) payload.fecha_realizada = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('activity_progress')
      .upsert(payload, { onConflict: 'baby_id,rango,area' })
      .select()
      .single();
    if (!error && data) {
      setActivityRows((prev) => {
        const otras = prev.filter((a) => !(a.rango === rango && a.area === area));
        return [...otras, data];
      });
    }
  }

  async function agregarLogro(logro) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('achievements')
      .insert({ ...logro, user_id: user.id, baby_id: baby.id })
      .select()
      .single();
    if (!error && data) setAchievements((prev) => [data, ...prev]);
    return { data, error };
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push('/iniciar-sesion');
    router.refresh();
  }

  if (cargando) {
    return (
      <div className="app-shell">
        <div className="screen"><p className="section-sub">Cargando el progreso de {baby.nombre}...</p></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="top-header">
        <img src="/logo.png" alt="Mami a mil Store" />
        <div>
          <div className="brandname">Mami a mil Store</div>
          <div className="tagline">Acompañando el desarrollo de {baby.nombre}</div>
        </div>
        <Link href="/onboarding" className="header-btn no-print">Editar perfil</Link>
      </div>

      <div className="tabbar no-print">
        {TABS.map((t) => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="screen">
        {tab === 'inicio' && (
          <Inicio baby={baby} cronMeses={cronMeses} corrMeses={corrMeses} rangoActual={rangoActual} activityRows={activityRows} achievements={achievements} milestoneRows={milestoneRows} irA={setTab} />
        )}
        {tab === 'biblioteca' && (
          <Biblioteca rangoActual={rangoActual} activityRows={activityRows} toggleActividad={toggleActividad} />
        )}
        {tab === 'ahora' && <QueHacemos rangoActual={rangoActual} />}
        {tab === 'hitos' && (
          <Hitos baby={baby} rangoActual={rangoActual} milestoneRows={milestoneRows} setMilestoneEstado={setMilestoneEstado} setMilestoneCampo={setMilestoneCampo} />
        )}
        {tab === 'logros' && <Logros baby={baby} achievements={achievements} agregarLogro={agregarLogro} />}
        {tab === 'resumen' && (
          <Resumen baby={baby} cronMeses={cronMeses} corrMeses={corrMeses} rangoActual={rangoActual} milestoneRows={milestoneRows} activityRows={activityRows} achievements={achievements} supabase={supabase} />
        )}
        {tab === 'consulta' && <Consulta baby={baby} milestoneRows={milestoneRows} irA={setTab} />}
        {tab === 'rutinas' && <Rutinas baby={baby} />}
      </div>

      <div className="screen no-print" style={{ paddingTop: 0 }}>
        <button className="btn-outline" onClick={cerrarSesion}>Cerrar sesión</button>
        <p className="section-sub" style={{ marginTop: 10, fontSize: 11.5 }}>Sesión: {userEmail}</p>
      </div>
    </div>
  );
}

function mensajeDelDia() {
  const dia = new Date().getDate();
  return MENSAJES_CALMA[dia % MENSAJES_CALMA.length];
}

function Inicio({ baby, cronMeses, corrMeses, rangoActual, activityRows, achievements, milestoneRows, irA }) {
  const etapa = DATA.rango_labels[rangoActual];
  const hechosEnRango = activityRows.filter((a) => a.rango === rangoActual && a.hecho).length;
  const progreso = Math.round((hechosEnRango / AREAS.length) * 100);

  const dia = new Date().getDate();
  const areasHoy = [...new Set([AREAS[dia % 6], AREAS[(dia + 2) % 6], AREAS[(dia + 4) % 6]])];
  while (areasHoy.length < 3) areasHoy.push(AREAS[areasHoy.length]);

  let hitoDestacado = null;
  outer: for (const area of AREAS_HITOS) {
    const lista = DATA.hitos[rangoActual][area];
    for (let i = 0; i < lista.length; i++) {
      const m = milestoneRows.find((mm) => mm.rango === rangoActual && mm.area === area && mm.hito_index === i);
      if (!m || m.estado !== 'frecuente') { hitoDestacado = { texto: lista[i], area }; break outer; }
    }
  }
  if (!hitoDestacado) hitoDestacado = { texto: DATA.hitos[rangoActual][AREAS_HITOS[0]][0], area: AREAS_HITOS[0] };

  const ultimoLogro = achievements[0];

  return (
    <>
      <div className="hero-card">
        <div className="hero-top">
          {baby.foto_url ? <img className="hero-photo" src={baby.foto_url} alt="" /> : <div className="hero-photo" />}
          <div>
            <div className="hero-name">{baby.nombre}</div>
            <div className="hero-age">{edadTexto(cronMeses)}{corrMeses !== null ? ` · edad corregida: ${edadTexto(corrMeses)}` : ''}</div>
            <div className="hero-stage">{etapa}</div>
          </div>
        </div>
        <div className="hero-msg">{mensajeDelDia()}</div>
      </div>

      <div className="card">
        <p className="section-title" style={{ fontSize: 16 }}>Progreso de esta etapa</p>
        <div className="progress-row">
          <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${progreso}%` }} /></div>
          <div className="progress-label">{hechosEnRango}/{AREAS.length}</div>
        </div>
        <p className="section-sub" style={{ marginBottom: 0 }}>Actividades marcadas como &quot;Lo hicimos&quot; en esta etapa.</p>
      </div>

      <div className="card">
        <p className="section-title" style={{ fontSize: 16 }}>Hito destacado de esta etapa</p>
        <p style={{ fontSize: 14.5, margin: 0 }}>{hitoDestacado.texto}</p>
        <p className="section-sub" style={{ margin: '6px 0 0' }}>Área: {DATA.area_labels[hitoDestacado.area]}</p>
      </div>

      <div className="card">
        <p className="section-title" style={{ fontSize: 16 }}>Actividades recomendadas para hoy</p>
        {areasHoy.slice(0, 3).map((area) => {
          const act = DATA.actividades[rangoActual][area];
          return (
            <div key={area} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="icon-wrap" style={{ width: 28, height: 28 }} dangerouslySetInnerHTML={{ __html: ICONS[area] }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>{act.nombre}</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', margin: 0 }}>{DATA.area_labels[area]}</p>
              </div>
            </div>
          );
        })}
        <div className="btn-row"><button className="btn-outline" onClick={() => irA('biblioteca')}>Ver todas las actividades</button></div>
      </div>

      <div className="card" style={{ cursor: 'pointer' }} onClick={() => irA('ahora')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 15 }}>¿Qué hacemos ahora?</b>
            <br /><span style={{ fontSize: 12, color: 'var(--muted)' }}>Dime cuánto tiempo tienes y te sugiero algo al instante</span>
          </div>
          <span style={{ fontSize: 22 }}>✨</span>
        </div>
      </div>

      {ultimoLogro && (
        <div className="card">
          <p className="section-title" style={{ fontSize: 16 }}>Último logro registrado</p>
          <p style={{ fontSize: 14.5, margin: 0 }}><b>{ultimoLogro.nombre}</b> — {formatearFecha(ultimoLogro.fecha)}</p>
        </div>
      )}
    </>
  );
}

function ActivityCard({ rango, area, act, activityRows, toggleActividad }) {
  const registro = activityRows.find((a) => a.rango === rango && a.area === area);
  const hecha = !!registro?.hecho;
  const guardada = !!registro?.guardado;
  return (
    <div className="activity-full-card">
      <div className="top-row">
        <div className="icon-wrap" dangerouslySetInnerHTML={{ __html: ICONS[area] }} />
        <div>
          <h3>{act.nombre}</h3>
          <span className="badge badge-blue">{DATA.area_labels[area]}</span>{' '}
          <span className="badge badge-green">{DATA.rango_labels[rango]}</span>
        </div>
      </div>
      <div className="meta-tags">
        <span className="badge badge-blue">⏱ {act.duracion} min</span>
        {act.sin_materiales && <span className="badge badge-green">Sin comprar materiales</span>}
        {act.lugar.map((l) => <span key={l} className="badge badge-blue">{LUGAR_LABELS[l] || l}</span>)}
      </div>
      <p><b>Objetivo:</b> {act.objetivo} <span style={{ color: 'var(--muted)' }}>({act.habilidad})</span></p>
      <p className="field-label">Materiales</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{act.materiales.map((m) => <span key={m} className="badge badge-blue">{m}</span>)}</div>
      <p className="field-label">Cómo hacerla</p>
      <ol>{act.instrucciones.map((p, i) => <li key={i}>{p}</li>)}</ol>
      <p className="field-label">Nivel: {act.dificultad === 'facil' ? 'Fácil' : 'Medio'}</p>
      <p style={{ marginBottom: 4 }}><b>Más sencillo:</b> {act.mas_facil}</p>
      <p><b>Más desafiante:</b> {act.mas_dificil}</p>
      <div className="safety-note">🛡️ {act.seguridad}</div>
      {toggleActividad && (
        <div className="action-row no-print">
          <button className={`action-toggle ${hecha ? 'on' : ''}`} onClick={() => toggleActividad(rango, area, 'hecho')}>
            {hecha ? '✓ ¡Hecho!' : '✓ Lo hicimos'}
          </button>
          <button className={`action-toggle ${guardada ? 'saved' : ''}`} onClick={() => toggleActividad(rango, area, 'guardado')}>
            {guardada ? '★ Guardado' : '☆ Guardar'}
          </button>
        </div>
      )}
    </div>
  );
}

function Biblioteca({ rangoActual, activityRows, toggleActividad }) {
  const [filtro, setFiltro] = useState({ rango: 'actual', area: 'todas', duracion: 'todas', lugar: 'todos', sinMateriales: false });

  function buscar(duracionModo, usarLugar, usarSinMateriales) {
    const rangos = filtro.rango === 'actual' ? [rangoActual] : [filtro.rango];
    const areas = filtro.area === 'todas' ? AREAS : [filtro.area];
    const resultado = [];
    rangos.forEach((r) => {
      areas.forEach((a) => {
        const act = DATA.actividades[r][a];
        if (duracionModo === 'exacta' && filtro.duracion !== 'todas' && String(act.duracion) !== String(filtro.duracion)) return;
        if (duracionModo === 'hasta' && filtro.duracion !== 'todas' && act.duracion > parseInt(filtro.duracion)) return;
        if (usarLugar && filtro.lugar !== 'todos' && !act.lugar.includes(filtro.lugar)) return;
        if (usarSinMateriales && filtro.sinMateriales && !act.sin_materiales) return;
        resultado.push({ rango: r, area: a, act });
      });
    });
    return resultado;
  }

  let lista = buscar('exacta', true, true);
  let exacto = true;
  if (!lista.length) { lista = buscar('hasta', true, true); }
  if (!lista.length) { lista = buscar('hasta', false, true); exacto = false; }
  if (!lista.length) { lista = buscar('hasta', false, false); exacto = false; }
  if (!lista.length) { lista = buscar('ninguna', false, false); exacto = false; }
  if (lista.length && lista !== buscar('exacta', true, true)) exacto = false;

  return (
    <>
      <p className="section-title">Biblioteca de actividades</p>
      <p className="section-sub">Filtra por edad, área o el tiempo que tengas disponible.</p>

      <div className="card no-print">
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Edad</p>
        <div className="chip-select" style={{ marginBottom: 14 }}>
          <span className={`chip-option ${filtro.rango === 'actual' ? 'selected' : ''}`} onClick={() => setFiltro({ ...filtro, rango: 'actual' })}>Etapa actual</span>
          {RANGOS.map((r) => (
            <span key={r} className={`chip-option ${filtro.rango === r ? 'selected' : ''}`} onClick={() => setFiltro({ ...filtro, rango: r })}>{DATA.rango_labels[r]}</span>
          ))}
        </div>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Área</p>
        <div className="chip-select" style={{ marginBottom: 14 }}>
          <span className={`chip-option ${filtro.area === 'todas' ? 'selected' : ''}`} onClick={() => setFiltro({ ...filtro, area: 'todas' })}>Todas</span>
          {AREAS.map((a) => (
            <span key={a} className={`chip-option ${filtro.area === a ? 'selected' : ''}`} onClick={() => setFiltro({ ...filtro, area: a })}>{DATA.area_labels[a]}</span>
          ))}
        </div>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Duración</p>
        <div className="chip-select" style={{ marginBottom: 14 }}>
          {[['todas', 'Cualquiera'], ['5', 'Hasta 5 min'], ['10', 'Hasta 10 min'], ['15', 'Hasta 15 min']].map(([v, l]) => (
            <span key={v} className={`chip-option ${filtro.duracion === v ? 'selected' : ''}`} onClick={() => setFiltro({ ...filtro, duracion: v })}>{l}</span>
          ))}
        </div>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Lugar</p>
        <div className="chip-select" style={{ marginBottom: 14 }}>
          {[['todos', 'Cualquiera'], ['casa', 'En casa'], ['aire_libre', 'Al aire libre'], ['bano', 'Baño'], ['comida', 'Comida'], ['antes_dormir', 'Antes de dormir']].map(([v, l]) => (
            <span key={v} className={`chip-option ${filtro.lugar === v ? 'selected' : ''}`} onClick={() => setFiltro({ ...filtro, lugar: v })}>{l}</span>
          ))}
        </div>
        <span className={`chip-option ${filtro.sinMateriales ? 'selected' : ''}`} onClick={() => setFiltro({ ...filtro, sinMateriales: !filtro.sinMateriales })}>Sin comprar materiales</span>
      </div>

      {!lista.length && <div className="empty-state">Aún no tenemos una actividad para esa combinación exacta. Prueba con otra edad o área.</div>}
      {!!lista.length && !exacto && (
        <p className="section-sub no-print">No hay una coincidencia exacta con esos filtros, así que te mostramos la actividad más cercana para esta edad 👇</p>
      )}
      {lista.map(({ rango, area, act }) => (
        <ActivityCard key={rango + area} rango={rango} area={area} act={act} activityRows={activityRows} toggleActividad={toggleActividad} />
      ))}
    </>
  );
}

function QueHacemos({ rangoActual }) {
  const [f, setF] = useState({ tiempo: '10', lugar: 'casa', area: 'cualquiera', estado: 'curioso', sinMateriales: false });
  const [excluir, setExcluir] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [exacto, setExacto] = useState(true);

  function buscar(excluirLista) {
    let candidatas = AREAS.filter((a) => (f.area === 'cualquiera' ? true : a === f.area)).filter((a) => !excluirLista.includes(a));
    candidatas = candidatas.filter((a) => {
      const act = DATA.actividades[rangoActual][a];
      if (String(act.duracion) !== String(f.tiempo)) return false;
      if (!act.lugar.includes(f.lugar)) return false;
      if (f.sinMateriales && !act.sin_materiales) return false;
      return true;
    });

    let elegido, esExacto = true;
    if (!candidatas.length) {
      let cercanas = AREAS.filter((a) => (f.area === 'cualquiera' ? true : a === f.area)).filter((a) => !excluirLista.includes(a));
      if (!cercanas.length) cercanas = AREAS;
      const preferida = ESTADO_AREA_PREFERIDA[f.estado];
      elegido = cercanas.includes(preferida) ? preferida : cercanas[0];
      esExacto = false;
    } else {
      const preferida = ESTADO_AREA_PREFERIDA[f.estado];
      elegido = candidatas.includes(preferida) ? preferida : candidatas[Math.floor(Math.random() * candidatas.length)];
    }
    setExacto(esExacto);
    setExcluir([...excluirLista, elegido]);
    setResultado({ rango: rangoActual, area: elegido, act: DATA.actividades[rangoActual][elegido] });
  }

  return (
    <>
      <p className="section-title">¿Qué hacemos ahora?</p>
      <p className="section-sub">Cuéntame el momento y te sugiero algo a la medida.</p>

      <div className="card">
        <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>¿Cuánto tiempo tienes?</p>
        <div className="chip-select" style={{ marginBottom: 14 }}>
          {['5', '10', '15'].map((v) => <span key={v} className={`chip-option ${f.tiempo === v ? 'selected' : ''}`} onClick={() => setF({ ...f, tiempo: v })}>{v} min</span>)}
        </div>
        <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>¿Dónde están?</p>
        <div className="chip-select" style={{ marginBottom: 14 }}>
          {Object.entries(LUGAR_LABELS).map(([v, l]) => <span key={v} className={`chip-option ${f.lugar === v ? 'selected' : ''}`} onClick={() => setF({ ...f, lugar: v })}>{l}</span>)}
        </div>
        <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>¿Qué área quieres acompañar?</p>
        <div className="chip-select" style={{ marginBottom: 14 }}>
          <span className={`chip-option ${f.area === 'cualquiera' ? 'selected' : ''}`} onClick={() => setF({ ...f, area: 'cualquiera' })}>Cualquiera</span>
          {AREAS.map((a) => <span key={a} className={`chip-option ${f.area === a ? 'selected' : ''}`} onClick={() => setF({ ...f, area: a })}>{DATA.area_labels[a]}</span>)}
        </div>
        <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>¿Cómo está tu bebé ahora?</p>
        <div className="chip-select" style={{ marginBottom: 14 }}>
          {[['activo', 'Activo'], ['tranquilo', 'Tranquilo'], ['cansado', 'Cansado'], ['curioso', 'Curioso']].map(([v, l]) => (
            <span key={v} className={`chip-option ${f.estado === v ? 'selected' : ''}`} onClick={() => setF({ ...f, estado: v })}>{l}</span>
          ))}
        </div>
        <span className={`chip-option ${f.sinMateriales ? 'selected' : ''}`} onClick={() => setF({ ...f, sinMateriales: !f.sinMateriales })}>Solo con lo que tengo en casa</span>
        <div className="btn-row"><button className="btn-solid" onClick={() => buscar([])}>Buscar actividad</button></div>
      </div>

      {resultado && (
        <>
          {!exacto && <p className="section-sub no-print">No encontramos una coincidencia exacta, así que te dejamos la opción más cercana y segura para esta etapa 👇</p>}
          <ActivityCard rango={resultado.rango} area={resultado.area} act={resultado.act} activityRows={[]} toggleActividad={null} />
          <div className="btn-row no-print"><button className="btn-outline" onClick={() => buscar(excluir)}>Ver otra opción</button></div>
        </>
      )}
    </>
  );
}

const HITOS_EJEMPLO = DATA.hitos_ejemplo;

function Hitos({ baby, rangoActual, milestoneRows, setMilestoneEstado, setMilestoneCampo }) {
  const [rango, setRango] = useState(rangoActual);

  return (
    <>
      <p className="section-title">Hitos de {baby.nombre}</p>
      <p className="section-sub">Marca lo que observas. Esto no es una calificación ni un diagnóstico, solo un acompañamiento.</p>

      <div className="card no-print">
        <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Etapa</p>
        <div className="chip-select">
          {RANGOS.map((r) => <span key={r} className={`chip-option ${rango === r ? 'selected' : ''}`} onClick={() => setRango(r)}>{DATA.rango_labels[r]}</span>)}
        </div>
      </div>

      {AREAS_HITOS.map((area) => {
        const lista = DATA.hitos[rango][area];
        const logrados = lista.filter((_, i) => milestoneRows.find((m) => m.rango === rango && m.area === area && m.hito_index === i)?.estado === 'frecuente').length;
        const pct = Math.round((logrados / lista.length) * 100);
        const ejemplo = (HITOS_EJEMPLO[rango] || {})[area];

        return (
          <div key={area}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: 'var(--blue-dark)', marginTop: 22 }}>{DATA.area_labels[area]}</p>
            <div className="progress-row">
              <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
              <div className="progress-label">{logrados}/{lista.length}</div>
            </div>
            {lista.map((texto, i) => {
              const registro = milestoneRows.find((m) => m.rango === rango && m.area === area && m.hito_index === i) || { estado: 'pendiente', fecha_observada: '', nota: '' };
              const actividadRelacionada = DATA.actividades[rango][area];
              return (
                <div key={i} className="hito-item">
                  <p className="hito-texto">{texto}</p>
                  {i === 0 && ejemplo && <p style={{ fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 12px' }}>Ejemplo: {ejemplo}</p>}
                  <div className="estado-row">
                    {[['pendiente', 'Todavía no'], ['comenzando', 'Comenzando'], ['frecuente', 'Con frecuencia'], ['comentar', 'Comentar con pediatra']].map(([v, l]) => (
                      <button key={v} className={`estado-btn ${registro.estado === v ? 'sel-' + v : ''}`} onClick={() => setMilestoneEstado(rango, area, i, v)}>{l}</button>
                    ))}
                  </div>
                  <input type="date" value={registro.fecha_observada || ''} onChange={(e) => setMilestoneCampo(rango, area, i, 'fecha_observada', e.target.value)} style={{ marginBottom: 8, fontSize: 13, padding: '9px 12px' }} />
                  <textarea placeholder="Nota opcional..." defaultValue={registro.nota || ''} onBlur={(e) => setMilestoneCampo(rango, area, i, 'nota', e.target.value)} style={{ fontSize: 13, padding: '9px 12px' }} />
                  <p className="section-sub" style={{ margin: '8px 0 0' }}>Actividad relacionada: <b>{actividadRelacionada.nombre}</b> ({DATA.area_labels[area]})</p>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

const LOGROS_EJEMPLO = ['Primera sonrisa social', 'Se sentó sin apoyo', 'Comenzó a gatear', 'Dio sus primeros pasos', 'Dijo su primera palabra', 'Señaló para pedir algo'];

function Logros({ baby, achievements, agregarLogro }) {
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [area, setArea] = useState(AREAS[0]);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    if (!nombre.trim()) return alert('Ponle un nombre al logro para guardarlo.');
    setGuardando(true);
    await agregarLogro({ nombre: nombre.trim(), fecha, area, nota: nota.trim() || null, foto_url: null });
    setGuardando(false);
    setNombre(''); setNota('');
  }

  return (
    <>
      <p className="section-title">Sus pequeños grandes logros</p>
      <p className="section-sub">Guarda los momentos que quieres recordar siempre.</p>

      <div className="card no-print">
        <div className="field">
          <label htmlFor="lg-nombre">Nombre del logro</label>
          <input id="lg-nombre" list="lg-sug" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Dio sus primeros pasos" />
          <datalist id="lg-sug">{LOGROS_EJEMPLO.map((e) => <option key={e} value={e} />)}</datalist>
        </div>
        <div className="field">
          <label htmlFor="lg-fecha">Fecha</label>
          <input id="lg-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="lg-area">Área relacionada</label>
          <select id="lg-area" value={area} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map((a) => <option key={a} value={a}>{DATA.area_labels[a]}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lg-nota">Nota o recuerdo</label>
          <textarea id="lg-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Cuéntanos cómo fue ese momento..." />
        </div>
        <div className="btn-row"><button className="btn-solid" onClick={handleGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar logro'}</button></div>
      </div>

      {!achievements.length && <div className="empty-state">Aún no has registrado logros. ¡El primero está por venir! 🌱</div>}
      {achievements.map((l) => (
        <div key={l.id} className="logro-card">
          {l.foto_url ? <img className="logro-photo" src={l.foto_url} alt="" /> : <div className="logro-photo" />}
          <div>
            <b style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 15 }}>{l.nombre}</b>
            <br /><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: 'var(--muted)' }}>{formatearFecha(l.fecha)} · {DATA.area_labels[l.area]}</span>
            {l.nota && <p style={{ fontSize: 13, margin: '6px 0 0' }}>{l.nota}</p>}
          </div>
        </div>
      ))}
    </>
  );
}

function Resumen({ baby, cronMeses, corrMeses, rangoActual, milestoneRows, activityRows, achievements, supabase }) {
  const [notas, setNotas] = useState(baby.notas_familia || '');
  const [preguntas, setPreguntas] = useState(baby.preguntas_consulta || '');
  const [guardadoOk, setGuardadoOk] = useState(false);

  const comentar = milestoneRows.filter((m) => m.estado === 'comentar');
  const comenzando = milestoneRows.filter((m) => m.estado === 'comenzando');
  const frecuente = milestoneRows.filter((m) => m.estado === 'frecuente');
  const hechas = activityRows.filter((a) => a.hecho);
  const favoritas = activityRows.filter((a) => a.guardado);

  function textoHito(m) { return DATA.hitos[m.rango][m.area][m.hito_index]; }
  function nombreActividad(a) { return `${DATA.actividades[a.rango][a.area].nombre} (${DATA.area_labels[a.area]})`; }

  async function guardarNotas() {
    await supabase.from('baby_profiles').update({ notas_familia: notas, preguntas_consulta: preguntas }).eq('id', baby.id);
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 1800);
  }

  async function compartir() {
    const texto = `Resumen del desarrollo de ${baby.nombre} (${edadTexto(cronMeses)}) — generado con Mi Bebé Crece de Mami a mil Store.`;
    if (navigator.share) { try { await navigator.share({ title: 'Resumen del desarrollo', text: texto }); } catch (e) {} }
    else { try { await navigator.clipboard.writeText(texto); alert('Copiado. Puedes pegarlo donde quieras compartirlo.'); } catch (e) {} }
  }

  return (
    <>
      <p className="section-title">Resumen del desarrollo</p>
      <p className="section-sub">Un documento informativo para compartir o llevar a la consulta. No sustituye una evaluación profesional.</p>

      <div className="card">
        <p className="field-label" style={{ marginTop: 0 }}>Datos de {baby.nombre}</p>
        <p style={{ fontSize: 14, margin: '0 0 4px' }}>Edad cronológica: <b>{edadTexto(cronMeses)}</b></p>
        {corrMeses !== null && <p style={{ fontSize: 14, margin: '0 0 4px' }}>Edad corregida: <b>{edadTexto(corrMeses)}</b></p>}
        <p style={{ fontSize: 14, margin: 0 }}>Etapa actual: <b>{DATA.rango_labels[rangoActual]}</b></p>
      </div>

      <div className="card">
        <p className="field-label" style={{ marginTop: 0 }}>Hitos con frecuencia ({frecuente.length})</p>
        {frecuente.length ? <ul>{frecuente.map((m) => <li key={m.id}>{textoHito(m)}</li>)}</ul> : <p className="section-sub" style={{ margin: 0 }}>Aún ninguno marcado.</p>}
        <p className="field-label">Comenzando ({comenzando.length})</p>
        {comenzando.length ? <ul>{comenzando.map((m) => <li key={m.id}>{textoHito(m)}</li>)}</ul> : <p className="section-sub" style={{ margin: 0 }}>Aún ninguno marcado.</p>}
        <p className="field-label">Para comentar con el pediatra ({comentar.length})</p>
        {comentar.length ? <ul>{comentar.map((m) => <li key={m.id}>{textoHito(m)}</li>)}</ul> : <p className="section-sub" style={{ margin: 0 }}>Ninguno por ahora.</p>}
      </div>

      <div className="card">
        <p className="field-label" style={{ marginTop: 0 }}>Actividades realizadas ({hechas.length})</p>
        {hechas.length ? <ul>{hechas.map((a) => <li key={a.id}>{nombreActividad(a)}</li>)}</ul> : <p className="section-sub" style={{ margin: 0 }}>Aún ninguna registrada.</p>}
        <p className="field-label">Actividades favoritas ({favoritas.length})</p>
        {favoritas.length ? <ul>{favoritas.map((a) => <li key={a.id}>{nombreActividad(a)}</li>)}</ul> : <p className="section-sub" style={{ margin: 0 }}>Aún ninguna guardada.</p>}
      </div>

      <div className="card">
        <p className="field-label" style={{ marginTop: 0 }}>Logros registrados ({achievements.length})</p>
        {achievements.length ? <ul>{achievements.map((l) => <li key={l.id}>{l.nombre} — {formatearFecha(l.fecha)}</li>)}</ul> : <p className="section-sub" style={{ margin: 0 }}>Aún ninguno.</p>}
      </div>

      <div className="card no-print">
        <label htmlFor="rs-notas">Notas de la familia</label>
        <textarea id="rs-notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Cualquier observación que quieran recordar..." />
        <label htmlFor="rs-preg" style={{ marginTop: 14 }}>Preguntas para la próxima consulta pediátrica</label>
        <textarea id="rs-preg" value={preguntas} onChange={(e) => setPreguntas(e.target.value)} placeholder="Ej. ¿Es normal que...?" />
      </div>

      <div className="disclaimer-box">
        Este documento es informativo y no sustituye una evaluación profesional. Compártelo con el pediatra de {baby.nombre} si te ayuda a organizar la conversación.
      </div>

      <div className="btn-row no-print">
        <button className="btn-solid" onClick={() => window.print()}>Imprimir / Descargar PDF</button>
        <button className="btn-outline" onClick={compartir}>Compartir</button>
        <button className="btn-outline" onClick={guardarNotas}>{guardadoOk ? 'Guardado ✓' : 'Guardar notas'}</button>
      </div>
    </>
  );
}

function Consulta({ baby, milestoneRows, irA }) {
  const comentarCount = milestoneRows.filter((m) => m.estado === 'comentar').length;
  return (
    <>
      <p className="section-title">Cuándo consultar</p>
      <p className="section-sub">Información orientativa, sin alarmismo, para acompañarte a decidir.</p>

      {comentarCount > 0 && (
        <div className="card" style={{ background: 'var(--alert-bg)', borderColor: '#E8C3B8' }}>
          <p style={{ margin: '0 0 10px', fontSize: 14.5 }}>
            <b>Tienes {comentarCount} hito{comentarCount > 1 ? 's' : ''} marcado{comentarCount > 1 ? 's' : ''} como &quot;quiero comentarlo&quot;</b>. Esto no significa un diagnóstico — es información útil para tu próxima consulta.
          </p>
          <button className="btn-solid no-print" onClick={() => irA('resumen')}>Ver resumen para la consulta</button>
        </div>
      )}

      <div className="card"><p className="field-label" style={{ marginTop: 0 }}>Coméntalo en el próximo control si...</p>
        <p>Notas algo distinto en tu bebé, pero no te genera urgencia — por ejemplo, que prefiere mucho un lado del cuerpo, o que un hito tarda un poco más de lo esperado dentro de un rango amplio.</p></div>

      <div className="card"><p className="field-label" style={{ marginTop: 0 }}>Pide orientación más pronto si...</p>
        <p>Tu bebé <b>pierde una habilidad que ya tenía</b> (por ejemplo, dejó de sostener la cabeza o de balbucear como antes), o si tu instinto te dice que algo no está bien, aunque no sepas explicarlo del todo. Confía en esa señal.</p></div>

      <div className="card"><p className="field-label" style={{ marginTop: 0 }}>Qué registrar antes de la consulta</p>
        <ul><li>Qué observaste, y desde cuándo</li><li>Si el bebé nació prematuro, su edad corregida</li><li>Hitos marcados como &quot;comenzando&quot; o &quot;quiero comentarlo&quot; en esta app</li><li>Cualquier cambio reciente en sueño, alimentación o comportamiento</li></ul></div>

      <div className="card"><p className="field-label" style={{ marginTop: 0 }}>Preguntas que puedes llevar</p>
        <ul><li>¿Esto que observo está dentro de lo esperado para su edad?</li><li>¿Hay algo que podamos hacer en casa para acompañarlo mejor?</li><li>¿Cuándo deberíamos volver a revisarlo si seguimos con dudas?</li></ul></div>

      <div className="disclaimer-box">Este registro no permite diagnosticar condiciones del desarrollo. Si algo te preocupa, compártelo con el pediatra o profesional que acompaña a {baby.nombre}.</div>
    </>
  );
}

const RUTINAS = [
  { momento: 'Al despertar', texto: 'Antes de levantarlo, salúdalo con calma y una sonrisa. Nárrale lo que van a hacer: "buenos días, vamos a cambiarte y desayunar". Ese ratito de conexión antes de empezar el ajetreo del día vale mucho más que cualquier ejercicio.' },
  { momento: 'Durante el cambio de pañal', texto: 'Mientras cambias su pañal, nombra suavemente las partes de su cuerpo que vas tocando: "aquí están tus piecitos, aquí tu pancita". Es un momento perfecto para el lenguaje, sin que se sienta forzado.' },
  { momento: 'Durante la comida', texto: 'Deja que explore texturas de comida con las manos cuando ya coma sólidos, aunque ensucie. Nombra los alimentos y colores. No conviertas cada comida en una lección, disfrútenla juntos.' },
  { momento: 'Durante el baño', texto: 'El agua es puro estímulo sensorial: deja que salpique, que sienta la temperatura, que juegue con un vasito. Cántale mientras lo bañas, es un momento ideal para el vínculo.' },
  { momento: 'En un paseo', texto: 'Nombra lo que ven: un perro, un árbol, un carro. Si ya camina, deja que explore superficies distintas (pasto, banqueta) siempre con supervisión. No hace falta llevar juguetes, el entorno ya estimula.' },
  { momento: 'Antes de dormir', texto: 'Un cuento corto, una canción de cuna o simplemente unos minutos de brazos tranquilos. Este no es momento de estimulación activa, sino de calma y conexión antes de dormir.' },
];

function Rutinas({ baby }) {
  return (
    <>
      <p className="section-title">Rutinas de conexión</p>
      <p className="section-sub">Pequeños momentos del día a día que también acompañan su desarrollo, sin que todo sea &quot;ejercicio&quot;.</p>
      {RUTINAS.map((r) => (
        <div key={r.momento} className="card">
          <span className="badge badge-blue">{r.momento}</span>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, margin: '10px 0 0' }}>{r.texto}</p>
        </div>
      ))}
      <div className="disclaimer-box">No todo tiene que ser una actividad estructurada. El juego libre, el vínculo y el disfrute compartido son, en sí mismos, parte fundamental del desarrollo de {baby.nombre}.</div>
    </>
  );
}
