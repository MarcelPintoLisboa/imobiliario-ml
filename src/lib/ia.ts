// Chama a Edge Function "imobiliario-ia" (Claude) que transforma a fala do corretor em dados.
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Finalidade, Interesse, Mobiliado, TipoImovel } from './types';

export interface ImovelExtraido {
  titulo: string;
  tipo: TipoImovel;
  finalidade: Finalidade;
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
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  caracteristicas: string[];
  proximidades: string[];
  descricao: string;
}

export interface ClienteExtraido {
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  notas: string;
  interesse: Required<Interesse>;
}

async function chamar<T>(modo: 'imovel' | 'cliente', texto: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke('imobiliario-ia', { body: { modo, texto } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const corpo = await error.context.json().catch(() => null);
      if (corpo?.erro) throw new Error(corpo.erro);
    }
    if (/Failed to send|not found|404/i.test(error.message)) {
      throw new Error('O assistente de voz ainda não foi publicado no Supabase (Edge Function imobiliario-ia). Veja docs/SUPABASE.md.');
    }
    throw error;
  }
  return (data as { dados: T }).dados;
}

export const estruturarImovel = (texto: string) => chamar<ImovelExtraido>('imovel', texto);
export const estruturarCliente = (texto: string) => chamar<ClienteExtraido>('cliente', texto);
