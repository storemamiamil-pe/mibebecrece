'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { AREAS, esPrematuro } from '../../lib/helpers';
import { DATA } from '../../lib/data';

const INTERESES = [
  { val: 'musica', label: 'Música' },
  { val: 'cuentos', label: 'Cuentos' },
  { val: 'movimiento', label: 'Movimiento' },
  { val: 'agua', label: 'Agua' },
  { val: 'texturas', label: 'Texturas' },
  { val: 'carros', label: 'Carros' },
  { val: 'animales', label: 'Animales' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [babyId, setBabyId] = useState(null);

  const [nombre, setNombre] = useState('');
  const [nacimiento, setNacimiento] = useState('');
  const [semanas, setSemanas] = useState('40');
  const [fpp, setFpp] = useState('');
  const [fotoUrl, setFotoUrl] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [intereses, setIntereses] = useState([]);
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: baby } = await supabase
        .from('baby_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (baby) {
        setBabyId(baby.id);
        setNombre(baby.nombre || '');
        setNacimiento(baby.fecha_nacimiento || '');
        setSemanas(String(baby.semanas_gestacion || 40));
        setFpp(baby.fecha_probable_parto || '');
        setFotoUrl(baby.foto_url || null);
        setIntereses(baby.intereses || []);
        setAreas(baby.areas_prioritarias || []);
      }
      setCargando(false);
    }
    cargar();
  }, []);

  function toggleChip(list, setList, val) {
    setList(list.includes(val) ? list.filter((v) => v !== val) : [...list, val]);
  }

  function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!nombre.trim() || !nacimiento) {
      setError('Por favor completa al menos el nombre y la fecha de nacimiento.');
      return;
    }

    setGuardando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let urlFotoFinal = fotoUrl;
    if (fotoFile) {
      const rutaArchivo = `${user.id}/${Date.now()}-${fotoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('baby-photos')
        .upload(rutaArchivo, fotoFile, { upsert: true });
      if (uploadError) {
        setError('No pudimos subir la foto, pero guardamos el resto de la información.');
      } else {
        const { data: publicUrlData } = supabase.storage.from('baby-photos').getPublicUrl(rutaArchivo);
        urlFotoFinal = publicUrlData.publicUrl;
      }
    }

    const payload = {
      user_id: user.id,
      nombre: nombre.trim(),
      fecha_nacimiento: nacimiento,
      semanas_gestacion: parseInt(semanas) || null,
      fecha_probable_parto: esPrematuro(semanas) ? fpp || null : null,
      foto_url: urlFotoFinal,
      intereses,
      areas_prioritarias: areas,
    };

    let resultado;
    if (babyId) {
      resultado = await supabase.from('baby_profiles').update(payload).eq('id', babyId);
    } else {
      resultado = await supabase.from('baby_profiles').insert(payload);
    }

    setGuardando(false);
    if (resultado.error) {
      setError('No pudimos guardar el perfil. Intenta de nuevo.');
      return;
    }
    router.push('/app');
    router.refresh();
  }

  if (cargando) {
    return (
      <div className="auth-shell">
        <p className="section-sub">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="Mami a mil Store" />
        </div>
        <p className="section-title" style={{ textAlign: 'center' }}>
          {babyId ? 'Edita el perfil de tu bebé' : 'Conozcamos a tu bebé'}
        </p>
        <p className="section-sub" style={{ textAlign: 'center' }}>
          Con estos datos personalizamos toda la app para acompañar su desarrollo.
        </p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="nombre">Nombre del bebé</label>
            <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Bastián" />
          </div>

          <div className="field">
            <label htmlFor="nacimiento">Fecha de nacimiento</label>
            <input id="nacimiento" type="date" value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="foto">Foto (opcional)</label>
            <input id="foto" type="file" accept="image/*" onChange={handleFoto} />
            {(fotoPreview || fotoUrl) && (
              <div style={{ marginTop: 8 }}>
                <img src={fotoPreview || fotoUrl} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 14, border: '1px solid var(--line)' }} />
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="semanas">Semanas de gestación al nacer</label>
            <input id="semanas" type="number" min="22" max="42" value={semanas} onChange={(e) => setSemanas(e.target.value)} />
            <p className="section-sub" style={{ marginBottom: 0, fontSize: 12 }}>
              Si nació antes de la semana 37, calculamos también su edad corregida.
            </p>
          </div>

          {esPrematuro(semanas) && (
            <div className="field">
              <label htmlFor="fpp">Fecha probable de parto original</label>
              <input id="fpp" type="date" value={fpp} onChange={(e) => setFpp(e.target.value)} />
            </div>
          )}

          <div className="field">
            <label>¿Qué le encanta a tu bebé?</label>
            <div className="chip-select">
              {INTERESES.map((i) => (
                <span
                  key={i.val}
                  className={`chip-option ${intereses.includes(i.val) ? 'selected' : ''}`}
                  onClick={() => toggleChip(intereses, setIntereses, i.val)}
                >
                  {i.label}
                </span>
              ))}
            </div>
          </div>

          <div className="field">
            <label>¿Qué áreas quieren acompañar más de cerca?</label>
            <div className="chip-select">
              {AREAS.map((a) => (
                <span
                  key={a}
                  className={`chip-option ${areas.includes(a) ? 'selected' : ''}`}
                  onClick={() => toggleChip(areas, setAreas, a)}
                >
                  {DATA.area_labels[a]}
                </span>
              ))}
            </div>
          </div>

          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <button type="submit" className="btn-solid" disabled={guardando}>
              {guardando ? 'Guardando...' : babyId ? 'Guardar cambios' : 'Comenzar'}
            </button>
          </div>
        </form>
        <p className="section-sub" style={{ textAlign: 'center', marginTop: 14, fontSize: 12 }}>
          Esta información se guarda de forma privada. Solo tú puedes verla.
        </p>
      </div>
    </div>
  );
}
