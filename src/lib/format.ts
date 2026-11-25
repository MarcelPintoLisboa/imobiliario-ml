const pad = (n: number) => String(n).padStart(2, '0');

export const fmtData = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const fmtHora = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fmtDataHora = (iso: string | null | undefined) => (iso ? `${fmtData(iso)} às ${fmtHora(iso)}` : '—');

/** R$ 450.000 (sem centavos quando inteiro) */
export const fmtMoeda = (v: number | null | undefined, centavos = false) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const casas = centavos || v % 1 !== 0 ? 2 : 0;
  const [int, dec] = v.toFixed(casas).split('.');
  return 'R$ ' + int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : '');
};

/** R$ 450 mil · R$ 1,2 mi — para cartões e indicadores */
export const fmtMoedaCurta = (v: number | null | undefined) => {
  if (!v) return '—';
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0).replace('.', ',')} mi`;
  if (v >= 10_000) return `R$ ${Math.round(v / 1000)} mil`;
  return fmtMoeda(v);
};

/** Texto digitado → número (aceita "450.000", "450000,50", "R$ 2.500"). Vazio = null. */
export const parseNumero = (s: string): number | null => {
  const limpo = s.replace(/[^\d,.-]/g, '');
  if (!limpo) return null;
  const n = parseFloat(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo.replace(/\.(?=\d{3}(\D|$))/g, ''));
  return isNaN(n) ? null : n;
};

export const numParaCampo = (v: number | null | undefined) =>
  v === null || v === undefined ? '' : String(v).replace('.', ',');

export const soDigitos = (s: string) => s.replace(/\D/g, '');

export const fmtTelefone = (s: string) => {
  const d = soDigitos(s);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return s;
};

/** Link do WhatsApp (adiciona 55 quando o número é brasileiro sem DDI) */
export const linkWhatsApp = (telefone: string, texto = '') => {
  let d = soDigitos(telefone);
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return `https://wa.me/${d}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
};

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const diasEntre = (a: Date, b: Date) =>
  Math.round((inicioDoDia(b).getTime() - inicioDoDia(a).getTime()) / 86400000);

/** "hoje", "amanhã", "ontem", "seg, 02/12" */
export const fmtDiaRelativo = (iso: string) => {
  const d = new Date(iso);
  const dif = diasEntre(new Date(), d);
  if (dif === 0) return 'Hoje';
  if (dif === 1) return 'Amanhã';
  if (dif === -1) return 'Ontem';
  return `${DIAS_SEMANA[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? '';

export const iniciais = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

export const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
