// Chama a Edge Function "imobiliario-ia" (Claude) que transforma a fala do corretor em dados.
import { FunctionsHttpError } from '@supabase/supabase-js';
import { organizarClienteLocal, organizarImovelLocal } from './organizadorLocal';
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

/** Resultado da organização. semIA = preenchido pelo organizador local (motivo explica por quê). */
export interface Organizado<T> {
  dados: T;
  semIA: boolean;
  motivo?: string;
}

class ErroDefinitivo extends Error {}

async function chamarIA<T>(modo: 'imovel' | 'cliente', texto: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke('imobiliario-ia', { body: { modo, texto } });
  if (error) {
    let naoPublicada = /Failed to send|not found|404/i.test(error.message);
    if (error instanceof FunctionsHttpError) {
      const resp = error.context as Response;
      const corpo = await resp.json().catch(() => null);
      // sem acesso ou texto curto demais: o organizador local não resolve
      if (resp.status === 403 || resp.status === 400) throw new ErroDefinitivo(corpo?.erro ?? error.message);
      if (corpo?.erro) throw new Error(corpo.erro);
      if (resp.status === 404 || corpo?.code === 'NOT_FOUND') naoPublicada = true;
    }
    if (naoPublicada) throw new Error('assistente com IA ainda não publicado no Supabase');
    throw error;
  }
  return (data as { dados: T }).dados;
}

/** Tenta o assistente com IA; se ele não estiver disponível, organiza no próprio aparelho. */
async function organizar<T>(modo: 'imovel' | 'cliente', texto: string, local: (t: string) => T): Promise<Organizado<T>> {
  try {
    // internet ruim em campo: depois de 25 s segue no modo básico em vez de ficar esperando
    const limite = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('o assistente demorou para responder')), 25000));
    return { dados: await Promise.race([chamarIA<T>(modo, texto), limite]), semIA: false };
  } catch (e) {
    if (e instanceof ErroDefinitivo) throw e;
    const motivo = /network|fetch|Failed to send/i.test(String((e as Error)?.message)) ? 'sem internet' : String((e as Error)?.message || e);
    return { dados: local(texto), semIA: true, motivo };
  }
}

export const estruturarImovel = (texto: string) => organizar<ImovelExtraido>('imovel', texto, organizarImovelLocal);
export const estruturarCliente = (texto: string) => organizar<ClienteExtraido>('cliente', texto, organizarClienteLocal);
