export const ICONS = {
  motriz_gruesa: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="10" r="5" fill="currentColor"/><path d="M24 16v14M24 20l-10 6M24 20l10 6M24 30l-7 12M24 30l7 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  motriz_fina: '<svg viewBox="0 0 48 48" fill="none"><path d="M14 26V14a3 3 0 0 1 6 0v8M20 22V10a3 3 0 0 1 6 0v12M26 22V12a3 3 0 0 1 6 0v10M32 24V18a3 3 0 0 1 6 0v10c0 7-5 12-12 12h-2c-5 0-8-2-11-6l-5-7a3 3 0 0 1 4.5-3.8L14 26" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lenguaje: '<svg viewBox="0 0 48 48" fill="none"><path d="M8 12h32v18H20l-7 7v-7H8V12z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="17" cy="21" r="1.8" fill="currentColor"/><circle cx="24" cy="21" r="1.8" fill="currentColor"/><circle cx="31" cy="21" r="1.8" fill="currentColor"/></svg>',
  cognitiva: '<svg viewBox="0 0 48 48" fill="none"><rect x="8" y="8" width="14" height="14" rx="3" stroke="currentColor" stroke-width="3"/><rect x="26" y="8" width="14" height="14" rx="3" stroke="currentColor" stroke-width="3"/><rect x="8" y="26" width="14" height="14" rx="3" stroke="currentColor" stroke-width="3"/><rect x="26" y="26" width="14" height="14" rx="3" fill="currentColor"/></svg>',
  social_emocional: '<svg viewBox="0 0 48 48" fill="none"><circle cx="16" cy="16" r="6" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="16" r="6" stroke="currentColor" stroke-width="3"/><path d="M6 38c1-7 6-11 10-11s9 4 10 11M22 38c1-7 6-11 10-11s9 4 10 11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  sensorial: '<svg viewBox="0 0 48 48" fill="none"><path d="M4 24c6-10 14-15 20-15s14 5 20 15c-6 10-14 15-20 15S10 34 4 24z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="6" stroke="currentColor" stroke-width="3"/></svg>'
};

export const AREAS = ["motriz_gruesa","motriz_fina","lenguaje","cognitiva","social_emocional","sensorial"];
export const AREAS_HITOS = ["motriz_gruesa","lenguaje","social_emocional","cognitiva"];
export const RANGOS = ["0-3","4-6","7-9","10-12","13-18","19-24","25-30","31-36"];
export const LUGAR_LABELS = {casa:'En casa', aire_libre:'Al aire libre', bano:'Durante el baño', comida:'Durante la comida', antes_dormir:'Antes de dormir'};

export function monthsBetween(d1, d2){
  let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if(d2.getDate() < d1.getDate()) months -= 1;
  return Math.max(0, months);
}

export function edadCronologicaMeses(fechaNacimiento){
  if(!fechaNacimiento) return 0;
  const nac = new Date(fechaNacimiento + 'T00:00:00');
  const hoy = new Date();
  return monthsBetween(nac, hoy);
}

export function esPrematuro(semanas){
  return semanas && parseInt(semanas) < 37;
}

export function edadCorregidaMeses(fechaNacimiento, semanas){
  if(!esPrematuro(semanas)) return null;
  const cron = edadCronologicaMeses(fechaNacimiento);
  if(cron >= 24) return null;
  const semanasFaltantes = 40 - parseInt(semanas);
  const mesesCorreccion = semanasFaltantes / 4.345;
  return Math.max(0, Math.round((cron - mesesCorreccion) * 10) / 10);
}

export function rangoDeMeses(meses){
  const m = Math.round(meses);
  if(m <= 3) return "0-3";
  if(m <= 6) return "4-6";
  if(m <= 9) return "7-9";
  if(m <= 12) return "10-12";
  if(m <= 18) return "13-18";
  if(m <= 24) return "19-24";
  if(m <= 30) return "25-30";
  return "31-36";
}

export function edadTexto(meses){
  meses = Math.round(meses);
  if(meses === 0) return 'Recién nacido';
  if(meses < 12) return meses + (meses === 1 ? ' mes' : ' meses');
  const anios = Math.floor(meses/12);
  const rest = meses % 12;
  let txt = anios + (anios === 1 ? ' año' : ' años');
  if(rest > 0) txt += ' ' + rest + (rest === 1 ? ' mes' : ' meses');
  return txt;
}

export function formatearFecha(iso){
  if(!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-MX', {day:'numeric', month:'long', year:'numeric'});
}
