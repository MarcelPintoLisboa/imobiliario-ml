// Imobiliário ML — Edge Function "imobiliario-ia"
//
// Recebe o texto ditado pelo corretor (transcrito no próprio aparelho) e devolve os dados
// estruturados para o formulário:
//   modo "imovel"  → características do imóvel + texto de anúncio
//   modo "cliente" → dados do cliente e perfil de busca
//
// Segredo necessário (Supabase > Edge Functions > Secrets): ANTHROPIC_API_KEY
// SUPABASE_URL e SUPABASE_ANON_KEY já existem automaticamente nas Edge Functions.
import Anthropic from 'npm:@anthropic-ai/sdk@1.14.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Schema = Record<string, unknown>;
const texto: Schema = { type: 'string' };
const nulo = (type: 'number' | 'integer' | 'string'): Schema => ({ anyOf: [{ type }, { type: 'null' }] });
const lista: Schema = { type: 'array', items: { type: 'string' } };
const objeto = (properties: Record<string, Schema>): Schema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const TIPOS_IMOVEL = ['apartamento', 'casa', 'casa_condominio', 'cobertura', 'flat', 'kitnet', 'terreno', 'sala_comercial', 'loja', 'galpao', 'sitio', 'lancamento'];

const SCHEMA_IMOVEL = objeto({
  titulo: texto,
  tipo: { type: 'string', enum: TIPOS_IMOVEL },
  finalidade: { type: 'string', enum: ['venda', 'aluguel', 'venda_aluguel'] },
  empreendimento: texto,
  construtora: texto,
  preco_venda: nulo('number'),
  valor_aluguel: nulo('number'),
  condominio: nulo('number'),
  iptu: nulo('number'),
  area_util: nulo('number'),
  area_total: nulo('number'),
  quartos: nulo('integer'),
  suites: nulo('integer'),
  banheiros: nulo('integer'),
  vagas: nulo('integer'),
  andar: texto,
  ano_construcao: nulo('integer'),
  mobiliado: { type: 'string', enum: ['', 'sim', 'nao', 'semi'] },
  logradouro: texto,
  numero: texto,
  complemento: texto,
  bairro: texto,
  cidade: texto,
  uf: texto,
  caracteristicas: lista,
  proximidades: lista,
  descricao: texto,
});

const SCHEMA_CLIENTE = objeto({
  nome: texto,
  telefone: texto,
  email: texto,
  origem: texto,
  notas: texto,
  interesse: objeto({
    finalidade: { type: 'string', enum: ['', 'venda', 'aluguel'] },
    tipos: { type: 'array', items: { type: 'string', enum: TIPOS_IMOVEL } },
    bairros: texto,
    preco_max: nulo('number'),
    quartos_min: nulo('integer'),
  }),
});

// Instruções fixas (ficam no início para aproveitar o cache de prompt)
const SISTEMA_IMOVEL = `Você é o assistente de captação de imóveis de um corretor brasileiro.
O corretor descreveu um imóvel falando; o texto veio de reconhecimento de voz e pode ter erros de transcrição, números por extenso e falta de pontuação.

Extraia os dados do imóvel:
- Valores em reais como número (ex.: "quatrocentos e cinquenta mil" → 450000; "2 mil e 500 de aluguel" → 2500). "Meio milhão" → 500000.
- Áreas em m² como número. Quantidades (quartos, suítes, banheiros, vagas) como inteiro. Suítes contam como quartos.
- Deixe null (ou texto vazio) o que não foi dito. Nunca invente dados.
- finalidade: "venda_aluguel" só se o corretor falar das duas opções; use "venda" quando houver só preço de venda e "aluguel" quando houver só valor de aluguel.
- caracteristicas: itens curtos do imóvel e do condomínio, com inicial maiúscula (ex.: "Varanda gourmet", "Piscina", "Portaria 24h", "Nascente").
- proximidades: o que há perto (ex.: "Metrô", "Shopping", "Escolas").
- uf com 2 letras maiúsculas quando a cidade for conhecida.
- titulo: chamada curta para anúncio, até 70 caracteres (ex.: "Apartamento 3 quartos com varanda gourmet em Boa Viagem").
- descricao: texto de anúncio em português do Brasil, 2 a 4 parágrafos curtos, tom profissional e acolhedor, destacando os diferenciais ditos pelo corretor. Sem emojis, sem inventar informações, sem informar dados do proprietário.`;

const SISTEMA_CLIENTE = `Você é o assistente de um corretor de imóveis brasileiro.
O corretor falou sobre um cliente (lead); o texto veio de reconhecimento de voz e pode ter erros de transcrição.

Extraia os dados do cliente:
- telefone só com dígitos, incluindo DDD quando dito.
- origem: como o cliente chegou (ex.: "Instagram", "Indicação", "Portal", "Placa"), ou vazio.
- interesse: o que o cliente procura. preco_max em reais como número; quartos_min inteiro; bairros como texto separado por vírgulas.
- notas: resumo objetivo das demais informações úteis (urgência, financiamento, FGTS, prazo, preferências).
- Deixe vazio ou null o que não foi dito. Nunca invente dados.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405);

  // Só usuários com acesso liberado em imobiliario_usuario
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: dono, error: erroConta } = await supabase.rpc('imobiliario_dono');
  if (erroConta || !dono) return json({ erro: 'Acesso não liberado para este usuário.' }, 403);

  let corpo: { modo?: string; texto?: string };
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: 'Corpo da requisição inválido.' }, 400);
  }
  const modo = corpo.modo === 'cliente' ? 'cliente' : 'imovel';
  const fala = String(corpo.texto ?? '').trim();
  if (fala.length < 5) return json({ erro: 'Fale um pouco mais sobre o ' + (modo === 'cliente' ? 'cliente.' : 'imóvel.') }, 400);
  if (fala.length > 20000) return json({ erro: 'O texto ficou longo demais. Divida em partes menores.' }, 400);

  if (!Deno.env.get('ANTHROPIC_API_KEY')) {
    return json({ erro: 'A chave ANTHROPIC_API_KEY não foi configurada nos Secrets das Edge Functions.' }, 500);
  }
  const client = new Anthropic();

  try {
    const resposta = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // extração simples: esforço baixo deixa a resposta mais rápida para quem está em campo
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: modo === 'cliente' ? SCHEMA_CLIENTE : SCHEMA_IMOVEL },
      },
      // se o modelo recusar por política, o próprio servidor tenta de novo em outro modelo
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: modo === 'cliente' ? SISTEMA_CLIENTE : SISTEMA_IMOVEL, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: `Fala do corretor:\n"""\n${fala}\n"""` }],
    });

    if (resposta.stop_reason === 'refusal') {
      return json({ erro: 'Não foi possível processar este texto. Revise e tente de novo.' }, 422);
    }
    if (resposta.stop_reason === 'max_tokens') {
      return json({ erro: 'A resposta ficou incompleta. Tente um texto mais curto.' }, 422);
    }
    const bloco = resposta.content.find((b) => b.type === 'text');
    if (!bloco || bloco.type !== 'text') return json({ erro: 'Resposta vazia do assistente.' }, 502);
    return json({ modo, dados: JSON.parse(bloco.text) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return json({ erro: 'Muitos pedidos ao mesmo tempo. Aguarde alguns segundos e tente de novo.' }, 429);
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return json({ erro: 'Chave ANTHROPIC_API_KEY inválida. Confira os Secrets das Edge Functions.' }, 500);
    }
    if (e instanceof Anthropic.APIError) {
      console.error('Claude API', e.status, e.message);
      return json({ erro: 'O assistente está indisponível agora. Tente de novo em instantes.' }, 502);
    }
    if (e instanceof SyntaxError) {
      return json({ erro: 'O assistente devolveu dados inválidos. Tente de novo.' }, 502);
    }
    console.error(e);
    return json({ erro: 'Erro inesperado ao estruturar o texto.' }, 500);
  }
});
