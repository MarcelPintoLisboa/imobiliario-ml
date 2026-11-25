import type { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { fmtMoeda, semAcento } from './format';
import type {
  Cliente, Fase, Finalidade, Imovel, ItemDoc, Negocio, StatusAgendamento, StatusImovel, TipoAgendamento, TipoImovel,
} from './types';

type IconName = keyof typeof Ionicons.glyphMap;

// ---------------- Funil do cliente ----------------

export const FASES: Record<Fase, { label: string; curto: string; icon: IconName; color: string; dica: string }> = {
  primeiro_contato: {
    label: 'Primeiro contato', curto: 'Contato', icon: 'chatbubbles-outline', color: colors.cyan,
    dica: 'Entenda o que o cliente procura e sugira imóveis compatíveis.',
  },
  agendamento: {
    label: 'Agendamento', curto: 'Agendar', icon: 'calendar-outline', color: colors.blue,
    dica: 'Marque a visita e confirme um dia antes pelo WhatsApp.',
  },
  visita: {
    label: 'Visita', curto: 'Visita', icon: 'walk-outline', color: '#6366F1',
    dica: 'Registre as impressões do cliente logo após a visita.',
  },
  negociacao: {
    label: 'Negociação', curto: 'Negociação', icon: 'swap-horizontal-outline', color: colors.primary,
    dica: 'Anote a proposta, contraproposta e condições de pagamento.',
  },
  documentacao: {
    label: 'Documentação', curto: 'Docs', icon: 'document-text-outline', color: colors.purple,
    dica: 'Acompanhe a lista de documentos até a escritura / contrato.',
  },
  entrega_chaves: {
    label: 'Entrega das chaves', curto: 'Chaves', icon: 'key-outline', color: colors.pink,
    dica: 'Combine a vistoria e a entrega das chaves com o cliente.',
  },
  concluido: {
    label: 'Concluído', curto: 'Concluído', icon: 'trophy-outline', color: colors.good,
    dica: 'Negócio fechado. Peça uma indicação ao cliente!',
  },
  perdido: {
    label: 'Perdido', curto: 'Perdido', icon: 'close-circle-outline', color: colors.textMuted,
    dica: 'Registre o motivo para melhorar os próximos atendimentos.',
  },
};

/** Etapas do funil. Documentação só existe na venda. */
export const fluxo = (tipo: 'venda' | 'aluguel'): Fase[] =>
  tipo === 'venda'
    ? ['primeiro_contato', 'agendamento', 'visita', 'negociacao', 'documentacao', 'entrega_chaves']
    : ['primeiro_contato', 'agendamento', 'visita', 'negociacao', 'entrega_chaves'];

/** Etapas mostradas como colunas no funil (todas as de venda) */
export const FASES_ATIVAS: Fase[] = fluxo('venda');

export const proximaFase = (n: Pick<Negocio, 'tipo' | 'fase'>): Fase | null => {
  const f = fluxo(n.tipo);
  const i = f.indexOf(n.fase);
  if (i < 0) return null;
  return i === f.length - 1 ? 'concluido' : f[i + 1]!;
};

export const faseAnterior = (n: Pick<Negocio, 'tipo' | 'fase'>): Fase | null => {
  const f = fluxo(n.tipo);
  if (n.fase === 'concluido' || n.fase === 'perdido') return f[f.length - 1]!;
  const i = f.indexOf(n.fase);
  return i > 0 ? f[i - 1]! : null;
};

export const ativo = (n: Negocio) => n.fase !== 'concluido' && n.fase !== 'perdido';

/** Valor do negócio: o negociado ou, sem ele, o anunciado (venda → preço; aluguel → aluguel mensal) */
export const valorNegocio = (n: Pick<Negocio, 'valor' | 'tipo'>, i?: Imovel) =>
  n.valor ?? (n.tipo === 'venda' ? i?.preco_venda : i?.valor_aluguel) ?? 0;

/** Fase para onde volta um atendimento concluído/perdido ao ser reaberto (a última fase ativa dele) */
export const faseAoReabrir = (n: Negocio): Fase => {
  const f = fluxo(n.tipo);
  const ultima = [...(n.historico ?? [])].reverse().find((h) => f.includes(h.fase));
  return ultima?.fase ?? 'primeiro_contato';
};

export const DOCUMENTOS_VENDA = [
  'RG e CPF dos compradores', 'Comprovante de estado civil', 'Comprovante de residência', 'Comprovante de renda',
  'Matrícula atualizada do imóvel', 'Certidões negativas do vendedor', 'Certidão negativa de IPTU',
  'Declaração de quitação do condomínio', 'Aprovação do financiamento', 'Guia do ITBI paga', 'Escritura assinada',
  'Registro em cartório',
];

export const DOCUMENTOS_ALUGUEL = [
  'RG e CPF do locatário', 'Comprovante de renda', 'Comprovante de residência', 'Análise cadastral aprovada',
  'Garantia (fiador, seguro-fiança ou caução)', 'Contrato assinado', 'Vistoria de entrada assinada',
];

export const documentosPadrao = (tipo: 'venda' | 'aluguel'): ItemDoc[] =>
  (tipo === 'venda' ? DOCUMENTOS_VENDA : DOCUMENTOS_ALUGUEL).map((nome) => ({ nome, ok: false }));

export const MOTIVOS_PERDA = [
  'Preço acima do orçamento', 'Comprou/alugou com outro corretor', 'Crédito não aprovado', 'Desistiu da mudança',
  'Não respondeu mais', 'Imóvel vendido/alugado',
];

export const ORIGENS = ['Indicação', 'Instagram', 'WhatsApp', 'Portal', 'Placa', 'Site', 'Plantão', 'Facebook'];

// ---------------- Imóveis ----------------

export const TIPOS_IMOVEL: Record<TipoImovel, { label: string; icon: IconName }> = {
  apartamento: { label: 'Apartamento', icon: 'business-outline' },
  casa: { label: 'Casa', icon: 'home-outline' },
  casa_condominio: { label: 'Casa em condomínio', icon: 'home-outline' },
  cobertura: { label: 'Cobertura', icon: 'sunny-outline' },
  flat: { label: 'Flat', icon: 'bed-outline' },
  kitnet: { label: 'Kitnet / Studio', icon: 'cube-outline' },
  terreno: { label: 'Terreno', icon: 'map-outline' },
  sala_comercial: { label: 'Sala comercial', icon: 'briefcase-outline' },
  loja: { label: 'Loja', icon: 'storefront-outline' },
  galpao: { label: 'Galpão', icon: 'archive-outline' },
  sitio: { label: 'Sítio / Chácara', icon: 'leaf-outline' },
  lancamento: { label: 'Lançamento', icon: 'rocket-outline' },
};

export const FINALIDADES: Record<Finalidade, string> = {
  venda: 'Venda',
  aluguel: 'Aluguel',
  venda_aluguel: 'Venda e aluguel',
};

export const STATUS_IMOVEL: Record<StatusImovel, { label: string; color: string; icon: IconName }> = {
  disponivel: { label: 'Disponível', color: colors.good, icon: 'checkmark-circle-outline' },
  reservado: { label: 'Reservado', color: colors.warning, icon: 'time-outline' },
  vendido: { label: 'Vendido', color: colors.primary, icon: 'trophy-outline' },
  alugado: { label: 'Alugado', color: colors.blue, icon: 'key-outline' },
  inativo: { label: 'Inativo', color: colors.textMuted, icon: 'pause-circle-outline' },
};

export const CARACTERISTICAS_SUGERIDAS = [
  'Varanda', 'Varanda gourmet', 'Piscina', 'Academia', 'Salão de festas', 'Playground', 'Portaria 24h',
  'Elevador', 'Área de serviço', 'Armários planejados', 'Nascente', 'Vista mar', 'Churrasqueira', 'Quintal',
  'Pet friendly', 'Ar-condicionado', 'Gás encanado', 'Gerador', 'Quadra', 'Espaço gourmet',
];

export const tituloImovel = (i: Imovel) =>
  i.titulo ||
  [TIPOS_IMOVEL[i.tipo]?.label, i.quartos ? `${i.quartos} quartos` : '', i.bairro ? `em ${i.bairro}` : '']
    .filter(Boolean)
    .join(' ') ||
  'Imóvel sem título';

export const enderecoImovel = (i: Imovel, completo = false) => {
  const rua = [i.logradouro, i.numero].filter(Boolean).join(', ');
  const partes = completo ? [rua, i.complemento, i.bairro, i.cidade && i.uf ? `${i.cidade}/${i.uf}` : i.cidade] : [i.bairro, i.cidade];
  return partes.filter(Boolean).join(' · ');
};

/** Preço principal para cartões (venda tem prioridade; aluguel com "/mês") */
export const precoPrincipal = (i: Imovel) => {
  if (i.finalidade !== 'aluguel' && i.preco_venda) return fmtMoeda(i.preco_venda);
  if (i.valor_aluguel) return `${fmtMoeda(i.valor_aluguel)}/mês`;
  return 'Sob consulta';
};

/** Texto pronto para enviar ao cliente pelo WhatsApp */
export const textoCompartilhar = (i: Imovel, empresa?: string) => {
  const linhas = [
    `*${tituloImovel(i)}*`,
    enderecoImovel(i) && `📍 ${enderecoImovel(i)}`,
    '',
    i.finalidade !== 'aluguel' && i.preco_venda ? `Venda: ${fmtMoeda(i.preco_venda)}` : '',
    i.finalidade !== 'venda' && i.valor_aluguel ? `Aluguel: ${fmtMoeda(i.valor_aluguel)}/mês` : '',
    i.condominio ? `Condomínio: ${fmtMoeda(i.condominio)}` : '',
    i.iptu ? `IPTU: ${fmtMoeda(i.iptu)}` : '',
    '',
    [
      i.area_util ? `${i.area_util} m²` : '',
      i.quartos ? `${i.quartos} quartos${i.suites ? ` (${i.suites} suítes)` : ''}` : '',
      i.banheiros ? `${i.banheiros} banheiros` : '',
      i.vagas ? `${i.vagas} vagas` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    i.caracteristicas.length ? `✓ ${i.caracteristicas.slice(0, 8).join(' · ')}` : '',
    '',
    i.descricao,
    i.fotos.length ? `\nFotos:\n${i.fotos.slice(0, 5).map((f) => f.url).join('\n')}` : '',
    empresa ? `\n${empresa}` : '',
    i.codigo ? `Cód. ${i.codigo}` : '',
  ];
  return linhas
    .filter((l, idx, arr) => l !== '' || (arr[idx - 1] !== '' && idx > 0))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// ---------------- Compatibilidade cliente × imóvel ----------------

/**
 * Nota de 0 a 100 de quanto o imóvel combina com o perfil de busca do cliente.
 * null = cliente sem perfil suficiente para comparar.
 */
export function compatibilidade(c: Cliente, i: Imovel): number | null {
  const p = c.interesse ?? {};
  const criterios: number[] = [];
  if (i.status !== 'disponivel') return 0;
  if (p.finalidade) {
    const ok = i.finalidade === 'venda_aluguel' || i.finalidade === p.finalidade;
    if (!ok) return 0;
    criterios.push(1);
  }
  if (p.tipos?.length) criterios.push(p.tipos.includes(i.tipo) ? 1 : 0.2);
  if (p.preco_max) {
    const preco = p.finalidade === 'aluguel' ? i.valor_aluguel : i.preco_venda ?? i.valor_aluguel;
    if (preco) criterios.push(preco <= p.preco_max ? 1 : preco <= p.preco_max * 1.1 ? 0.6 : 0);
  }
  if (p.quartos_min) criterios.push((i.quartos ?? 0) >= p.quartos_min ? 1 : (i.quartos ?? 0) === p.quartos_min - 1 ? 0.4 : 0);
  if (p.bairros?.trim()) {
    const lista = p.bairros.split(/[,;]/).map((b) => semAcento(b.trim())).filter(Boolean);
    const bairro = semAcento(i.bairro);
    criterios.push(lista.some((b) => bairro.includes(b) || b.includes(bairro)) && bairro ? 1 : 0.3);
  }
  if (!criterios.length) return null;
  return Math.round((criterios.reduce((a, b) => a + b, 0) / criterios.length) * 100);
}

export const imoveisCompativeis = (c: Cliente, imoveis: Imovel[], minimo = 60) =>
  imoveis
    .map((i) => ({ imovel: i, nota: compatibilidade(c, i) }))
    .filter((x): x is { imovel: Imovel; nota: number } => x.nota !== null && x.nota >= minimo)
    .sort((a, b) => b.nota - a.nota);

// ---------------- Agenda ----------------

export const TIPOS_AGENDAMENTO: Record<TipoAgendamento, { label: string; icon: IconName; color: string }> = {
  visita: { label: 'Visita', icon: 'walk-outline', color: colors.cyan },
  reuniao: { label: 'Reunião', icon: 'people-outline', color: colors.blue },
  ligacao: { label: 'Ligação', icon: 'call-outline', color: '#6366F1' },
  assinatura: { label: 'Assinatura', icon: 'create-outline', color: colors.primary },
  vistoria: { label: 'Vistoria', icon: 'clipboard-outline', color: colors.purple },
  entrega_chaves: { label: 'Entrega de chaves', icon: 'key-outline', color: colors.pink },
  outro: { label: 'Outro', icon: 'ellipsis-horizontal-circle-outline', color: colors.textSec },
};

export const STATUS_AGENDAMENTO: Record<StatusAgendamento, { label: string; color: string; icon: IconName }> = {
  agendado: { label: 'Agendado', color: colors.blue, icon: 'time-outline' },
  confirmado: { label: 'Confirmado', color: colors.good, icon: 'checkmark-circle-outline' },
  realizado: { label: 'Realizado', color: colors.textMuted, icon: 'checkmark-done-outline' },
  cancelado: { label: 'Cancelado', color: colors.critical, icon: 'close-circle-outline' },
};

export const LEMBRETES = [
  { value: 0, label: 'Sem aviso' },
  { value: 15, label: '15 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 180, label: '3 horas antes' },
  { value: 1440, label: '1 dia antes' },
];

/** Tipo de compromisso sugerido para cada fase do funil */
export const agendamentoDaFase = (f: Fase): TipoAgendamento =>
  f === 'documentacao' ? 'assinatura' : f === 'entrega_chaves' ? 'entrega_chaves' : f === 'negociacao' ? 'reuniao' : 'visita';
