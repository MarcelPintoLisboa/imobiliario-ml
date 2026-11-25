// Organizador sem IA: lê a fala transcrita (português) e preenche os campos com regras simples.
// Roda no próprio aparelho, sem internet e sem custo. É usado quando o assistente com IA não está
// disponível. Entende os jeitos mais comuns de falar ("3 quartos", "650 mil", "condomínio 900"…).
import type { ClienteExtraido, ImovelExtraido } from './ia';
import type { Finalidade, Mobiliado, TipoImovel } from './types';

// ---------------- Texto e números ----------------

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s: string) => semAcento(s).toLowerCase();

const NUM: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70,
  oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600,
  setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900, meio: 0.5,
};
const MULT: Record<string, number> = { mil: 1000, milhao: 1_000_000, milhoes: 1_000_000, mi: 1_000_000, k: 1000 };

const valorDigitos = (t: string) => {
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return parseFloat(t.replace(/\./g, '').replace(',', '.'));
  return parseFloat(t.replace(',', '.'));
};
const ehNumero = (t: string) => t in NUM || /^\d+([.,]\d+)*$/.test(t);

/** "seiscentos e cinquenta mil" → "650000"; "2 mil e 500" → "2500"; "1,2 milhão" → "1200000" */
export function converterNumeros(texto: string): string {
  const t = norm(texto)
    .replace(/r\$\s*/g, ' r$ ')
    .replace(/,(?!\d)/g, ' , ')
    .replace(/\.(?!\d)/g, ' . ')
    .replace(/[;:!?()]/g, ' $& ');
  const tk = t.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let i = 0;
  while (i < tk.length) {
    if (!ehNumero(tk[i]!) && !(tk[i]! in MULT && i > 0 && ehNumero(tk[i - 1]!))) {
      out.push(tk[i]!);
      i++;
      continue;
    }
    let total = 0;
    let atual = 0;
    let usou = false;
    let j = i;
    while (j < tk.length) {
      const w = tk[j]!;
      if (ehNumero(w)) {
        const v = w in NUM ? NUM[w]! : valorDigitos(w);
        // "três quartos e dois" não soma; "vinte e cinco" e "cento e vinte" somam
        if (usou && atual > 0 && !(atual % 10 === 0 && v < atual) && !(atual >= 100 && v < 100)) break;
        atual += v;
        usou = true;
        j++;
      } else if (w in MULT && usou) {
        const m = MULT[w]!;
        if (m === 1_000_000) {
          total = (total + (atual || 1)) * m;
        } else {
          total += (atual || 1) * m;
        }
        atual = 0;
        j++;
      } else if (w === 'e' && usou && j + 1 < tk.length && ehNumero(tk[j + 1]!) && (total > 0 || atual % 10 === 0 || atual >= 100)) {
        j++;
      } else break;
    }
    out.push(String(Math.round((total + atual) * 100) / 100));
    i = j;
  }
  return ' ' + out.join(' ') + ' ';
}

const primeiro = (t: string, re: RegExp) => {
  const m = t.match(re);
  return m ? parseFloat(m[1]!) : null;
};
const titulo = (s: string) =>
  s
    .split(/\s+/)
    .map((p, i) => (i > 0 && /^(d[aeo]s?|e)$/i.test(p) ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');

// ---------------- Dicionários ----------------

const TIPOS: [RegExp, TipoImovel][] = [
  [/casa (em|de) condominio/, 'casa_condominio'],
  [/\bcobertura/, 'cobertura'],
  [/\bflat\b/, 'flat'],
  [/\b(kitnet|kitinete|quitinete|studio|estudio)\b/, 'kitnet'],
  [/\bsala (comercial)?/, 'sala_comercial'],
  [/\b(loja|ponto comercial)\b/, 'loja'],
  [/\bgalpao\b/, 'galpao'],
  [/\b(sitio|chacara|fazenda|granja)\b/, 'sitio'],
  [/\b(terreno|lote)\b/, 'terreno'],
  [/\b(lancamento|na planta)\b/, 'lancamento'],
  [/\b(apartamento|apto|ape)\b/, 'apartamento'],
  [/\b(casa|sobrado)\b/, 'casa'],
];
const NOME_TIPO: Record<TipoImovel, string> = {
  apartamento: 'Apartamento', casa: 'Casa', casa_condominio: 'Casa em condomínio', cobertura: 'Cobertura', flat: 'Flat',
  kitnet: 'Studio', terreno: 'Terreno', sala_comercial: 'Sala comercial', loja: 'Loja', galpao: 'Galpão', sitio: 'Sítio',
  lancamento: 'Lançamento',
};

const CARACTERISTICAS: [RegExp, string][] = [
  [/varanda gourmet/, 'Varanda gourmet'],
  [/\bvaranda(?! gourmet)|\bsacada/, 'Varanda'],
  [/\bpiscina/, 'Piscina'],
  [/\bacademia|\bfitness/, 'Academia'],
  [/salao de festas?/, 'Salão de festas'],
  [/salao de jogos/, 'Salão de jogos'],
  [/\bplayground|parquinho/, 'Playground'],
  [/portaria 24|portaria vinte e quatro|seguranca 24/, 'Portaria 24h'],
  [/\belevador/, 'Elevador'],
  [/area de servico/, 'Área de serviço'],
  [/armarios?|planejad/, 'Armários planejados'],
  [/\bnascente/, 'Nascente'],
  [/vista (para o |pro |do )?mar/, 'Vista mar'],
  [/churrasqueira/, 'Churrasqueira'],
  [/\bquintal/, 'Quintal'],
  [/\bpet\b|aceita animais|pet friendly/, 'Pet friendly'],
  [/ar[ -]condicionado|climatizad/, 'Ar-condicionado'],
  [/gas encanado/, 'Gás encanado'],
  [/\bgerador/, 'Gerador'],
  [/\bquadras?\b/, 'Quadra'],
  [/espaco gourmet/, 'Espaço gourmet'],
  [/\bsauna/, 'Sauna'],
  [/brinquedoteca/, 'Brinquedoteca'],
  [/coworking/, 'Coworking'],
  [/\bjardim/, 'Jardim'],
  [/\bcloset/, 'Closet'],
  [/\blavabo/, 'Lavabo'],
  [/dependencia (completa|de empregada)/, 'Dependência completa'],
  [/energia solar|placas? solar/, 'Energia solar'],
  [/\breformad/, 'Reformado'],
  [/\bbicicletario/, 'Bicicletário'],
  [/\bcameras?|monitoramento/, 'Câmeras de segurança'],
];

const PROXIMIDADES: [RegExp, string][] = [
  [/\bmetro\b/, 'Metrô'],
  [/\bshopping/, 'Shopping'],
  [/\bpraia/, 'Praia'],
  [/\b(escolas?|colegios?)\b/, 'Escolas'],
  [/\bhospita(l|is)\b/, 'Hospital'],
  [/\b(super)?mercados?\b/, 'Supermercado'],
  [/\bparques?\b/, 'Parque'],
  [/\b(faculdades?|universidades?)\b/, 'Universidade'],
  [/\bpadaria/, 'Padaria'],
  [/\bfarmacia/, 'Farmácia'],
  [/\baeroporto/, 'Aeroporto'],
  [/\b(onibus|parada|ponto de onibus)\b/, 'Transporte público'],
];

const CAPITAIS: Record<string, string> = {
  'rio branco': 'AC', maceio: 'AL', macapa: 'AP', manaus: 'AM', salvador: 'BA', fortaleza: 'CE', brasilia: 'DF',
  vitoria: 'ES', goiania: 'GO', 'sao luis': 'MA', cuiaba: 'MT', 'campo grande': 'MS', 'belo horizonte': 'MG',
  belem: 'PA', 'joao pessoa': 'PB', curitiba: 'PR', recife: 'PE', teresina: 'PI', 'rio de janeiro': 'RJ', natal: 'RN',
  'porto alegre': 'RS', 'porto velho': 'RO', 'boa vista': 'RR', florianopolis: 'SC', 'sao paulo': 'SP', aracaju: 'SE',
  palmas: 'TO', olinda: 'PE', 'jaboatao dos guararapes': 'PE', jaboatao: 'PE', paulista: 'PE', caruaru: 'PE',
  campinas: 'SP', santos: 'SP', guarulhos: 'SP', niteroi: 'RJ', 'feira de santana': 'BA', uberlandia: 'MG',
  joinville: 'SC', londrina: 'PR', 'campina grande': 'PB', 'balneario camboriu': 'SC',
};

// Lugares: palavras com inicial maiúscula depois de "em/no/na/bairro"
const NOME = "[A-ZÀ-Ý][a-zà-ÿ'-]+(?:\\s+(?:d[aeo]s?\\s+)?[A-ZÀ-Ý][a-zà-ÿ'-]+)*";
const NAO_LUGAR = /^(edif|ed\b|condom|residencial|rua|avenida|av\b|travessa|alameda|estrada|apartamento|casa|andar|metro|shopping|praia|bairro)/i;

function lugares(original: string): string[] {
  const achados: { pos: number; nome: string }[] = [];
  const re = new RegExp(`\\b(?:[Bb]airros?\\s+(?:d[aeo]\\s+)?|[Ee]m\\s+|[Nn][oa]\\s+|[Cc]idade\\s+(?:d[aeo]\\s+)?)(${NOME}(?:\\s*(?:,|\\bou\\b|\\be\\b)\\s*${NOME})*)`, 'g');
  for (const m of original.matchAll(re)) {
    m[1]!.split(/\s*(?:,|\bou\b|\be\b)\s*/).forEach((n, k) => n && achados.push({ pos: m.index! + k, nome: n.trim() }));
  }
  // "Boa Viagem, Recife" logo após um lugar
  return [...new Set(achados.sort((a, b) => a.pos - b.pos).map((a) => a.nome).filter((n) => !NAO_LUGAR.test(semAcento(n))))];
}

const ufDe = (cidade: string, textoNorm: string) => {
  const c = CAPITAIS[norm(cidade)];
  if (c) return c;
  const m = textoNorm.match(/\b(?:\/|estado d[eo] )\s*([a-z]{2})\b/);
  return m ? m[1]!.toUpperCase() : '';
};

/** Procura o valor em R$ mais próximo de uma palavra-chave (antes ou logo depois dela) */
function valoresEmReais(t: string) {
  const res: { v: number; pos: number; antes: string; depois: string }[] = [];
  const re = /(?:r\$\s*)?(\d+(?:\.\d+)?)(?!\s*(?:quartos?|suites?|banheiros?|vagas?|m2|m²|metros|mts|andar|anos?|minutos?|min\b|km|carros?|dormitorios?|wc|º|o andar|pavimentos?))/g;
  for (const m of t.matchAll(re)) {
    const v = parseFloat(m[1]!);
    const pos = m.index!;
    const antes = t.slice(Math.max(0, pos - 40), pos);
    const depois = t.slice(pos + m[0].length, pos + m[0].length + 25);
    const ano = v >= 1950 && v <= 2040 && /(constru|ano|entreg|de\s*$|em\s*$)/.test(antes.slice(-20));
    if (ano) continue;
    if (/(numero|n[o°º]\.?)\s*$/.test(antes)) continue; // número do endereço
    if (v < 50 && !/reais/.test(depois) && !m[0].startsWith('r$')) continue;
    res.push({ v, pos, antes, depois });
  }
  return res;
}

const ultimo = (s: string, re: RegExp) => {
  let pos = -1;
  for (const m of s.matchAll(new RegExp(re.source, 'g'))) pos = m.index!;
  return pos;
};

// ---------------- Imóvel ----------------

export function organizarImovelLocal(fala: string): ImovelExtraido {
  const original = fala.replace(/\s+/g, ' ').trim();
  const n = norm(original);
  const t = converterNumeros(original);

  const tipo = TIPOS.find(([re]) => re.test(n))?.[1] ?? 'apartamento';

  // Valores
  let preco: number | null = null;
  let aluguel: number | null = null;
  let condominio: number | null = null;
  let iptu: number | null = null;
  const temAluguel = /\b(alug|locacao|locar|aluguel)/.test(n);
  const temVenda = /\b(venda|vender|vendo|vende|compra)\b/.test(n);
  for (const x of valoresEmReais(t)) {
    const chaves: [string, RegExp][] = [
      ['condominio', /condominio|taxa/],
      ['iptu', /iptu/],
      ['aluguel', /alug|locacao|mensal|por mes/],
      ['venda', /venda|vend|valor|preco|por\b|custa|pedindo/],
    ];
    // palavra-chave mais próxima antes do número
    let melhor = '';
    let dist = Infinity;
    for (const [k, re] of chaves) {
      const p = ultimo(x.antes, re);
      if (p >= 0 && x.antes.length - p < dist) {
        dist = x.antes.length - p;
        melhor = k;
      }
    }
    if (!melhor) {
      if (/condominio/.test(x.depois)) melhor = 'condominio';
      else if (/iptu/.test(x.depois)) melhor = 'iptu';
      else if (/(por mes|mensal|de aluguel)/.test(x.depois)) melhor = 'aluguel';
    }
    if (!melhor) melhor = x.v >= 20000 ? 'venda' : temAluguel ? 'aluguel' : '';
    if (melhor === 'condominio' && condominio === null) condominio = x.v;
    else if (melhor === 'iptu' && iptu === null) iptu = x.v;
    else if (melhor === 'aluguel' && aluguel === null) aluguel = x.v;
    else if (melhor === 'venda' && preco === null && x.v >= 1000) preco = x.v;
  }

  let finalidade: Finalidade = temAluguel && (temVenda || preco) ? 'venda_aluguel' : temAluguel || (aluguel && !preco) ? 'aluguel' : 'venda';
  if (finalidade === 'venda_aluguel' && !aluguel) finalidade = 'venda';

  // Números do imóvel
  const quartos = primeiro(t, /(\d+)\s*(?:quartos?|dormitorios?|dorms?)\b/);
  const suites = primeiro(t, /(\d+)\s*suites?\b/) ?? (/\bsuite\b/.test(t) ? 1 : null);
  const banheiros = primeiro(t, /(\d+)\s*(?:banheiros?|wcs?)\b/);
  const vagas = primeiro(t, /(\d+)\s*vagas?\b/) ?? primeiro(t, /garagem (?:para|pra) (\d+)/);
  let areaUtil: number | null = null;
  let areaTotal: number | null = null;
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(?:m2|m²|metros quadrados|metros|mts)\b/g)) {
    const antes = t.slice(Math.max(0, m.index! - 25), m.index!);
    const v = parseFloat(m[1]!);
    if (/total|terreno|lote/.test(antes) && areaTotal === null) areaTotal = v;
    else if (areaUtil === null) areaUtil = v;
  }
  areaUtil ??= primeiro(t, /area (?:util |privativa |construida )?(?:de )?(\d+(?:\.\d+)?)/);
  const andarN = primeiro(t, /(\d+)\s*(?:o|º)?\s*andar/);
  const andar = andarN !== null ? `${andarN}º` : /\bterreo\b/.test(n) ? 'Térreo' : '';
  const ano = primeiro(t, /(?:construid[oa]|construcao|ano|entregue|entrega)\s*(?:em|de)?\s*(\d{4})\b/);

  let mobiliado: Mobiliado = '';
  if (/semi ?mobiliad/.test(n)) mobiliado = 'semi';
  else if (/(nao|sem) (e )?mobiliad|sem mobilia/.test(n)) mobiliado = 'nao';
  else if (/mobiliad/.test(n)) mobiliado = 'sim';

  const caracteristicas = CARACTERISTICAS.filter(([re]) => re.test(n)).map(([, l]) => l);
  const temPerto = /(pert|proxim|ao lado|minutos|caminhando|vizinh|acesso)/.test(n);
  const proximidades = temPerto ? PROXIMIDADES.filter(([re]) => re.test(n)).map(([, l]) => l) : [];

  // Empreendimento
  let empreendimento = '';
  const emp = original.match(/\b(edif[ií]cio|edf\.?|ed\.|condom[ií]nio|residencial)\s+((?:[\wÀ-ÿ'-]+\s*){1,4})/i);
  if (emp) {
    const palavras = emp[2]!.trim().split(/\s+/);
    const nome: string[] = [];
    for (const p of palavras) {
      if (/^(em|no|na|com|que|localizado|sendo|tem|bairro|rua|avenida|perto|de)$/i.test(p) || /[,.]$/.test(nome.at(-1) ?? '')) break;
      nome.push(p);
    }
    const prefixo = /^condom/i.test(emp[1]!) ? 'Condomínio' : /^resid/i.test(emp[1]!) ? 'Residencial' : 'Edifício';
    if (nome.length) empreendimento = `${prefixo} ${titulo(nome.join(' ').replace(/[,.]$/, ''))}`;
  }

  // Endereço
  let logradouro = '';
  let numero = '';
  const rua = original.match(/\b(rua|avenida|av\.?|travessa|alameda|estrada|rodovia|pra[cç]a)\s+([^,.;]+?)(?:,?\s*(?:n[uú]mero|n[º°o]\.?)\s*(\d+)|,?\s+(\d+))?(?=\s*[,.;]|\s+(?:em|no|na|bairro|perto|pr[oó]xim\w*|com|sendo)\b|$)/i);
  if (rua) {
    const tipoRua = /^av/i.test(rua[1]!) ? 'Avenida' : rua[1]!.toLowerCase();
    logradouro = titulo(`${tipoRua} ${rua[2]!.trim()}`);
    numero = rua[3] ?? rua[4] ?? '';
  }
  const empNome = semAcento(empreendimento.replace(/^\S+\s/, ''));
  const locais = lugares(original).filter((l) => semAcento(l) !== empNome && !logradouro.includes(l));
  let bairro = '';
  let cidade = '';
  for (const l of locais) {
    if (CAPITAIS[norm(l)] && !cidade) cidade = l;
    else if (!bairro) bairro = l;
    else if (!cidade) cidade = l;
  }
  const uf = cidade ? ufDe(cidade, n) : '';

  // Título e texto do anúncio
  const nomeTipo = NOME_TIPO[tipo];
  const tituloAnuncio = [nomeTipo, quartos ? `com ${quartos} quarto${quartos > 1 ? 's' : ''}` : '', bairro ? `em ${bairro}` : cidade ? `em ${cidade}` : '']
    .filter(Boolean)
    .join(' ')
    .slice(0, 70);

  const moeda = (v: number) => 'R$ ' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const lista = (itens: string[]) => (itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`);
  const local = [empreendimento && `no ${empreendimento}`, bairro && `em ${bairro}`, cidade && (bairro ? `, ${cidade}` : `em ${cidade}`)]
    .filter(Boolean)
    .join(' ')
    .replace(' , ', ', ');
  const specs = [
    areaUtil ? `${areaUtil} m²` : '',
    quartos ? `${quartos} quarto${quartos > 1 ? 's' : ''}${suites ? ` (${suites} suíte${suites > 1 ? 's' : ''})` : ''}` : '',
    banheiros ? `${banheiros} banheiro${banheiros > 1 ? 's' : ''}` : '',
    vagas ? `${vagas} vaga${vagas > 1 ? 's' : ''} de garagem` : '',
  ].filter(Boolean);
  const valores = [
    preco && finalidade !== 'aluguel' ? `Valor de venda: ${moeda(preco)}.` : '',
    aluguel && finalidade !== 'venda' ? `Aluguel: ${moeda(aluguel)}/mês.` : '',
    condominio ? `Condomínio: ${moeda(condominio)}.` : '',
    iptu ? `IPTU: ${moeda(iptu)}.` : '',
  ].filter(Boolean);
  const descricao = [
    `${nomeTipo} ${finalidade === 'aluguel' ? 'para alugar' : finalidade === 'venda_aluguel' ? 'para venda ou aluguel' : 'à venda'}${local ? ` ${local}` : ''}.`,
    specs.length ? `O imóvel tem ${lista(specs)}${andar ? `, no ${andar} andar` : ''}${mobiliado === 'sim' ? ', mobiliado' : mobiliado === 'semi' ? ', semimobiliado' : ''}.` : '',
    caracteristicas.length ? `Destaques: ${lista(caracteristicas.map((c) => c.toLowerCase()))}.` : '',
    proximidades.length ? `Perto de ${lista(proximidades.map((p) => p.toLowerCase()))}.` : '',
    valores.join(' '),
    'Agende sua visita!',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    titulo: tituloAnuncio, tipo, finalidade, empreendimento, construtora: '',
    preco_venda: preco, valor_aluguel: aluguel, condominio, iptu, area_util: areaUtil, area_total: areaTotal,
    quartos, suites, banheiros, vagas, andar, ano_construcao: ano, mobiliado,
    logradouro, numero, complemento: '', bairro, cidade, uf,
    caracteristicas, proximidades, descricao,
  };
}

// ---------------- Cliente ----------------

export function organizarClienteLocal(fala: string): ClienteExtraido {
  let original = fala.replace(/\s+/g, ' ').trim();

  // Telefone antes de tudo (senão os números viram valores)
  let telefone = '';
  for (const m of original.matchAll(/\+?\d[\d\s().-]{7,}\d/g)) {
    let d = m[0].replace(/\D/g, '');
    if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
    if (d.length >= 8 && d.length <= 11) {
      telefone = d;
      original = original.replace(m[0], ' ');
      break;
    }
  }

  // E-mail ("joao ponto silva arroba gmail ponto com")
  let email = '';
  const n0 = norm(original);
  const em =
    n0.match(/[a-z0-9._-]+@[a-z0-9-]+(\.[a-z0-9-]+)+/) ??
    n0.match(/([a-z0-9_-]+(?:\s+ponto\s+[a-z0-9_-]+)*)\s+arroba\s+([a-z0-9-]+(?:\s+ponto\s+[a-z0-9-]+)+)/);
  if (em) {
    email = em[0].replace(/\s+arroba\s+/, '@').replace(/\s+ponto\s+/g, '.').replace(/\s+/g, '');
    original = original.replace(new RegExp(em[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
  }

  const n = norm(original);
  const t = converterNumeros(original);

  // Nome
  let nome = '';
  const nm = original.match(/(?:[Cc]liente|[Cc]hama(?:-se)?|[Ss]e chama|[Nn]ome(?: dele| dela)?(?: é)?|[Ss]enhora?|[Ss]ra?\.?)\s+(?:é\s+)?(?:o\s+|a\s+)?([A-ZÀ-Ý][a-zà-ÿ]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ý][a-zà-ÿ]+){0,4})/);
  if (nm) nome = nm[1]!;
  else {
    const m2 = original.match(/^(?:o |a )?(?:cliente )?([a-zà-ÿ]+(?:\s+[a-zà-ÿ]+){0,2})(?=,|\s+(?:telefone|whats\w*|zap|celular|fone|quer|procura|busca|veio|está|esta|é)\b)/i);
    if (m2) nome = titulo(m2[1]!);
  }

  const origens: [RegExp, string][] = [
    [/instagram|insta\b/, 'Instagram'], [/indica/, 'Indicação'], [/facebook|face\b/, 'Facebook'],
    [/\b(portal|olx|zap imoveis|viva ?real|imovelweb|quinto andar)\b/, 'Portal'], [/\bplaca\b/, 'Placa'],
    [/\bsite\b/, 'Site'], [/plantao|stand/, 'Plantão'], [/whats ?app|zap\b/, 'WhatsApp'],
  ];
  const origem = origens.find(([re]) => re.test(n))?.[1] ?? '';

  const finalidade = /\b(alug|locacao|locar)/.test(n) ? 'aluguel' : /\b(compr|financ|fgts|adquirir|investir)/.test(n) ? 'venda' : '';
  const tipos: TipoImovel[] = [];
  for (const [re, tp] of TIPOS) if (re.test(n) && !tipos.includes(tp)) tipos.push(tp);
  if (tipos.includes('casa_condominio')) tipos.splice(tipos.indexOf('casa'), tipos.includes('casa') ? 1 : 0);

  const precoMax =
    primeiro(t, /(?:ate|maximo(?: de)?|no maximo|orcamento(?: de)?|teto(?: de)?|faixa de|em torno de|uns|limite de)\s*(?:r\$\s*)?(\d+(?:\.\d+)?)/) ??
    (valoresEmReais(t).map((x) => x.v).filter((v) => v >= 500).sort((a, b) => b - a)[0] ?? null);
  const quartosMin = primeiro(t, /(\d+)\s*(?:(?:a|ou)\s*\d+\s*)?(?:quartos?|dormitorios?)/);

  const locais = lugares(original).filter((l) => !CAPITAIS[norm(l)] && semAcento(l) !== semAcento(nome));
  const notas = [
    /fgts/.test(n) && 'Vai usar FGTS.',
    /financ/.test(n) && 'Pretende financiar.',
    /a vista/.test(n) && 'Pagamento à vista.',
    /(urgen|o quanto antes|rapido|com pressa)/.test(n) && 'Tem urgência.',
    /permuta/.test(n) && 'Fala em permuta.',
    /(cachorro|gato|\bpet\b|animal)/.test(n) && 'Tem animal de estimação.',
    `Fala registrada: "${fala.trim()}"`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    nome, telefone, email, origem, notas,
    interesse: {
      finalidade, tipos, bairros: locais.join(', '),
      preco_max: precoMax, quartos_min: quartosMin,
    },
  };
}
