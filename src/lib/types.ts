export type Finalidade = 'venda' | 'aluguel' | 'venda_aluguel';
export type StatusImovel = 'disponivel' | 'reservado' | 'vendido' | 'alugado' | 'inativo';
export type TipoImovel =
  | 'apartamento' | 'casa' | 'casa_condominio' | 'cobertura' | 'flat' | 'kitnet' | 'terreno'
  | 'sala_comercial' | 'loja' | 'galpao' | 'sitio' | 'lancamento';
export type Mobiliado = '' | 'sim' | 'nao' | 'semi';

export interface Foto {
  /** caminho no bucket (para apagar) */
  path: string;
  /** endereço público da imagem */
  url: string;
}

/** Imóvel / empreendimento do portfólio (tabela imobiliario_imoveis) */
export interface Imovel {
  id: string;
  codigo: string;
  titulo: string;
  tipo: TipoImovel;
  finalidade: Finalidade;
  status: StatusImovel;
  empreendimento: string;
  construtora: string;
  preco_venda: number | null;
  valor_aluguel: number | null;
  condominio: number | null;
  iptu: number | null;
  area_util: number | null;
  area_total: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  andar: string;
  ano_construcao: number | null;
  mobiliado: Mobiliado;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  caracteristicas: string[];
  proximidades: string[];
  descricao: string;
  fotos: Foto[];
  transcricao: string;
  proprietario_nome: string;
  proprietario_telefone: string;
  criado_em: string;
  atualizado_em: string;
}

export interface Interesse {
  finalidade?: '' | 'venda' | 'aluguel';
  tipos?: TipoImovel[];
  bairros?: string;
  preco_max?: number | null;
  quartos_min?: number | null;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  documento: string;
  origem: string;
  interesse: Interesse;
  notas: string;
  criado_em: string;
}

export type Fase =
  | 'primeiro_contato' | 'agendamento' | 'visita' | 'negociacao' | 'documentacao' | 'entrega_chaves'
  | 'concluido' | 'perdido';

export interface ItemDoc {
  nome: string;
  ok: boolean;
}

export interface EventoHistorico {
  fase: Fase;
  data: string;
  nota?: string;
}

/** Atendimento do cliente no funil (tabela imobiliario_negocios) */
export interface Negocio {
  id: string;
  cliente_id: string;
  imovel_id: string | null;
  tipo: 'venda' | 'aluguel';
  fase: Fase;
  valor: number | null;
  motivo_perda: string;
  documentos: ItemDoc[];
  historico: EventoHistorico[];
  notas: string;
  criado_em: string;
  atualizado_em: string;
}

export type TipoAgendamento = 'visita' | 'reuniao' | 'ligacao' | 'assinatura' | 'vistoria' | 'entrega_chaves' | 'outro';
export type StatusAgendamento = 'agendado' | 'confirmado' | 'realizado' | 'cancelado';

export interface Agendamento {
  id: string;
  corretor_id: string | null;
  titulo: string;
  tipo: TipoAgendamento;
  inicio: string;
  duracao_min: number;
  cliente_id: string | null;
  imovel_id: string | null;
  negocio_id: string | null;
  local: string;
  notas: string;
  status: StatusAgendamento;
  lembrete_min: number;
}

/** Nome e logo customizados da imobiliária (tabela imobiliario_empresa) */
export interface Empresa {
  nome: string;
  slogan: string;
  creci: string;
  telefone: string;
  email: string;
  instagram: string;
  site: string;
  logo_url: string | null;
}

/** Usuário da imobiliária (tabela imobiliario_usuario) */
export interface Membro {
  id: string;
  email: string;
  nome: string;
  admin: boolean;
  ativo: boolean;
  dono: boolean;
  trocarSenha: boolean;
  criadoEm: string;
}

export interface Imobiliaria {
  id: string;
  nome: string;
  donoEmail: string;
  usuarios: number;
}
