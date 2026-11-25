import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useConta } from './conta';
import { documentosPadrao } from './dominio';
import { apagarFotos } from './fotos';
import { sincronizarLembretes } from './notificacoes';
import { mensagemErro, supabase } from './supabase';
import type { Agendamento, Cliente, Empresa, Fase, Imovel, Negocio } from './types';

const T = {
  empresa: 'imobiliario_empresa',
  clientes: 'imobiliario_clientes',
  imoveis: 'imobiliario_imoveis',
  negocios: 'imobiliario_negocios',
  agendamentos: 'imobiliario_agendamentos',
} as const;

const EMPRESA_VAZIA: Empresa = { nome: '', slogan: '', creci: '', telefone: '', email: '', instagram: '', site: '', logo_url: null };

// Campos controlados pelo banco: nunca enviados nas gravações
const SO_LEITURA = ['owner_id', 'corretor_id', 'criado_em', 'atualizado_em'];
const limpar = <R extends object>(r: R) =>
  Object.fromEntries(Object.entries(r).filter(([k, v]) => !SO_LEITURA.includes(k) && v !== undefined));

/** Números do Postgres (numeric) chegam como texto: converte para número */
const numeros = <R extends Record<string, unknown>>(r: R, campos: string[]) => {
  const o: Record<string, unknown> = { ...r };
  for (const c of campos) if (o[c] !== null && o[c] !== undefined) o[c] = Number(o[c]);
  return o as R;
};
const CAMPOS_NUM_IMOVEL = ['preco_venda', 'valor_aluguel', 'condominio', 'iptu', 'area_util', 'area_total'];
const imovelApp = (r: Record<string, unknown>) =>
  numeros({ ...r, fotos: r.fotos ?? [], caracteristicas: r.caracteristicas ?? [], proximidades: r.proximidades ?? [] }, CAMPOS_NUM_IMOVEL) as unknown as Imovel;
const negocioApp = (r: Record<string, unknown>) => numeros(r, ['valor']) as unknown as Negocio;

type Salvar<X> = (x: Partial<X> & { id?: string }) => Promise<X>;

interface DadosCtx {
  carregado: boolean;
  erroCarga: string;
  empresa: Empresa;
  clientes: Cliente[];
  imoveis: Imovel[];
  negocios: Negocio[];
  agendamentos: Agendamento[];
  recarregar: () => Promise<void>;
  salvarEmpresa: (e: Partial<Empresa>) => Promise<void>;
  salvarCliente: Salvar<Cliente>;
  excluirCliente: (id: string) => Promise<void>;
  salvarImovel: Salvar<Imovel>;
  excluirImovel: (id: string) => Promise<void>;
  salvarNegocio: Salvar<Negocio>;
  /** Muda a fase do atendimento e registra na linha do tempo */
  moverFase: (n: Negocio, fase: Fase, nota?: string) => Promise<Negocio>;
  excluirNegocio: (id: string) => Promise<void>;
  salvarAgendamento: Salvar<Agendamento>;
  excluirAgendamento: (id: string) => Promise<void>;
  cliente: (id: string | null | undefined) => Cliente | undefined;
  imovel: (id: string | null | undefined) => Imovel | undefined;
}

const Ctx = createContext<DadosCtx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { dono, userId } = useConta();
  const [carregado, setCarregado] = useState(false);
  const [erroCarga, setErroCarga] = useState('');
  const [empresa, setEmpresa] = useState<Empresa>(EMPRESA_VAZIA);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const carregando = useRef(false);

  const recarregar = useCallback(async () => {
    if (!dono || carregando.current) return;
    carregando.current = true;
    try {
      const [e, c, i, n, a] = await Promise.all([
        supabase.from(T.empresa).select('*').eq('owner_id', dono).maybeSingle(),
        supabase.from(T.clientes).select('*').order('nome'),
        supabase.from(T.imoveis).select('*').order('atualizado_em', { ascending: false }),
        supabase.from(T.negocios).select('*').order('atualizado_em', { ascending: false }),
        supabase.from(T.agendamentos).select('*').order('inicio'),
      ]);
      const erro = e.error || c.error || i.error || n.error || a.error;
      if (erro) throw erro;
      setEmpresa({ ...EMPRESA_VAZIA, ...(e.data ?? {}) });
      setClientes((c.data ?? []) as Cliente[]);
      setImoveis((i.data ?? []).map(imovelApp));
      setNegocios((n.data ?? []).map(negocioApp));
      setAgendamentos((a.data ?? []) as Agendamento[]);
      setErroCarga('');
    } catch (err) {
      setErroCarga(mensagemErro(err));
    } finally {
      carregando.current = false;
      setCarregado(true);
    }
  }, [dono]);

  useEffect(() => {
    Promise.resolve().then(recarregar);
    // Ao voltar para o app, busca o que outros corretores da equipe mudaram
    const sub = AppState.addEventListener('change', (s) => s === 'active' && recarregar());
    return () => sub.remove();
  }, [recarregar]);

  // Lembretes no celular para os compromissos do próprio corretor
  useEffect(() => {
    if (carregado) sincronizarLembretes(agendamentos.filter((a) => a.corretor_id === userId), clientes);
  }, [carregado, agendamentos, clientes, userId]);

  const gravar = useCallback(
    async <X extends { id: string }>(
      tabela: string,
      x: Partial<X> & { id?: string },
      converter: (r: Record<string, unknown>) => X,
      set: React.Dispatch<React.SetStateAction<X[]>>,
    ): Promise<X> => {
      const { id, ...resto } = limpar(x) as { id?: string } & Record<string, unknown>;
      const q = id
        ? supabase.from(tabela).update(resto).eq('id', id).select().single()
        : supabase.from(tabela).insert(resto).select().single();
      const { data, error } = await q;
      if (error) throw error;
      const salvo = converter(data as Record<string, unknown>);
      set((lista) => (id ? lista.map((l) => (l.id === id ? salvo : l)) : [salvo, ...lista]));
      return salvo;
    },
    [],
  );

  const apagar = useCallback(async (tabela: string, id: string) => {
    const { error } = await supabase.from(tabela).delete().eq('id', id);
    if (error) throw error;
  }, []);

  const value = useMemo<DadosCtx>(() => {
    const salvarNegocio: Salvar<Negocio> = async (n) => {
      const novo = !n.id;
      const tipo = n.tipo ?? 'venda';
      return gravar<Negocio>(
        T.negocios,
        novo
          ? {
              documentos: documentosPadrao(tipo),
              historico: [{ fase: n.fase ?? 'primeiro_contato', data: new Date().toISOString(), nota: 'Atendimento iniciado' }],
              ...n,
            }
          : n,
        negocioApp,
        setNegocios,
      );
    };
    return {
      carregado,
      erroCarga,
      empresa,
      clientes,
      imoveis,
      negocios,
      agendamentos,
      recarregar,
      salvarEmpresa: async (e) => {
        const { data, error } = await supabase
          .from(T.empresa)
          .upsert({ ...limpar(e), owner_id: dono }, { onConflict: 'owner_id' })
          .select()
          .single();
        if (error) throw error;
        setEmpresa({ ...EMPRESA_VAZIA, ...data });
      },
      salvarCliente: async (c) => {
        const salvo = await gravar<Cliente>(T.clientes, c, (r) => r as unknown as Cliente, setClientes);
        setClientes((l) => [...l].sort((a, b) => a.nome.localeCompare(b.nome)));
        return salvo;
      },
      excluirCliente: async (id) => {
        await apagar(T.clientes, id);
        setClientes((l) => l.filter((x) => x.id !== id));
        // o banco apaga os atendimentos em cascata e solta os agendamentos
        setNegocios((l) => l.filter((x) => x.cliente_id !== id));
        setAgendamentos((l) => l.map((x) => (x.cliente_id === id ? { ...x, cliente_id: null } : x)));
      },
      salvarImovel: (i) => gravar<Imovel>(T.imoveis, i, imovelApp, setImoveis),
      excluirImovel: async (id) => {
        const fotos = imoveis.find((x) => x.id === id)?.fotos ?? [];
        await apagar(T.imoveis, id);
        apagarFotos(fotos.map((f) => f.path)).catch(() => {});
        setImoveis((l) => l.filter((x) => x.id !== id));
        setNegocios((l) => l.map((x) => (x.imovel_id === id ? { ...x, imovel_id: null } : x)));
      },
      salvarNegocio,
      moverFase: async (n, fase, nota) => {
        const historico = [...(n.historico ?? []), { fase, data: new Date().toISOString(), ...(nota ? { nota } : {}) }];
        const salvo = await salvarNegocio({ id: n.id, fase, historico });
        // imóvel fechado sai do portfólio disponível
        if (fase === 'concluido' && n.imovel_id) {
          const im = imoveis.find((x) => x.id === n.imovel_id);
          if (im && im.status === 'disponivel') {
            await gravar<Imovel>(T.imoveis, { id: im.id, status: n.tipo === 'venda' ? 'vendido' : 'alugado' }, imovelApp, setImoveis);
          }
        }
        return salvo;
      },
      excluirNegocio: async (id) => {
        await apagar(T.negocios, id);
        setNegocios((l) => l.filter((x) => x.id !== id));
      },
      salvarAgendamento: async (a) => {
        const salvo = await gravar<Agendamento>(T.agendamentos, a, (r) => r as unknown as Agendamento, setAgendamentos);
        setAgendamentos((l) => [...l].sort((x, y) => x.inicio.localeCompare(y.inicio)));
        return salvo;
      },
      excluirAgendamento: async (id) => {
        await apagar(T.agendamentos, id);
        setAgendamentos((l) => l.filter((x) => x.id !== id));
      },
      cliente: (id) => (id ? clientes.find((c) => c.id === id) : undefined),
      imovel: (id) => (id ? imoveis.find((i) => i.id === id) : undefined),
    };
  }, [carregado, erroCarga, empresa, clientes, imoveis, negocios, agendamentos, recarregar, gravar, apagar, dono]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDados() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDados deve ser usado dentro de DataProvider');
  return c;
}
