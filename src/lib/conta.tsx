import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { AVISO_SCRIPT, funcaoInexistente, supabase, tabelaInexistente } from './supabase';
import type { Imobiliaria, Membro } from './types';

/** Administrador geral: libera os acessos de todas as imobiliárias. */
export const ADMIN_PRINCIPAL = 'mapl11@hotmail.com';

export type Situacao = 'ok' | 'sem_acesso' | 'desativado';

interface ContaCtx {
  pronta: boolean;
  erro: string;
  situacao: Situacao;
  /** Imobiliária do usuário (owner_id dos dados). null = sem acesso. */
  dono: string | null;
  userId: string;
  nome: string;
  email: string;
  empresa: string;
  /** administrador da imobiliária (campo admin de imobiliario_usuario) */
  ehAdmin: boolean;
  /** administrador geral: cadastra acessos e imobiliárias */
  ehAdminGeral: boolean;
  /** ainda usa a senha provisória */
  trocarSenha: boolean;
  recarregarConta: () => Promise<void>;
  definirSenha: (nova: string) => Promise<void>;
}

type Estado = Pick<ContaCtx, 'pronta' | 'erro' | 'situacao' | 'dono' | 'trocarSenha' | 'empresa' | 'nome'> & {
  admin: boolean;
  adminGeral: boolean;
};

const Ctx = createContext<ContaCtx | null>(null);

// Lê em imobiliario_usuario (pela função imobiliario_minha_conta) se o login tem acesso,
// a qual imobiliária pertence e se é administrador.
export function ContaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const email = (user?.email ?? '').toLowerCase();
  const [estado, setEstado] = useState<Estado>({
    pronta: false, erro: '', situacao: 'ok', dono: null, trocarSenha: false, empresa: '', nome: '',
    admin: false, adminGeral: false,
  });

  const recarregarConta = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('imobiliario_minha_conta');
    if (funcaoInexistente(error)) {
      setEstado((s) => ({ ...s, pronta: true, erro: AVISO_SCRIPT }));
      return;
    }
    if (error) {
      setEstado((s) => ({ ...s, pronta: true, erro: error.message }));
      return;
    }
    const d = (data ?? {}) as {
      situacao?: Situacao; dono?: string | null; nome?: string; admin?: boolean; admin_geral?: boolean;
      trocar_senha?: boolean; empresa?: string | null;
    };
    setEstado({
      pronta: true, erro: '', situacao: d.situacao ?? 'sem_acesso', dono: d.dono ?? null,
      trocarSenha: !!d.trocar_senha, empresa: d.empresa ?? '', nome: d.nome ?? '',
      admin: !!d.admin, adminGeral: !!d.admin_geral,
    });
  }, [user]);

  useEffect(() => {
    Promise.resolve().then(recarregarConta);
  }, [recarregarConta]);

  const value = useMemo<ContaCtx>(() => {
    const { admin, adminGeral, ...resto } = estado;
    return {
      ...resto,
      email,
      userId: user?.id ?? '',
      ehAdminGeral: adminGeral,
      ehAdmin: admin || adminGeral,
      recarregarConta,
      definirSenha: async (nova) => {
        const { error } = await supabase.auth.updateUser({ password: nova });
        if (error) {
          if (/different from the old/i.test(error.message)) throw new Error('A nova senha precisa ser diferente da senha atual.');
          throw error;
        }
        const { error: e2 } = await supabase.rpc('imobiliario_senha_trocada');
        if (e2) throw e2;
        setEstado((s) => ({ ...s, trocarSenha: false }));
      },
    };
  }, [estado, email, user, recarregarConta]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConta() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConta deve ser usado dentro de ContaProvider');
  return c;
}

// ---------------- Acessos (somente administradores) ----------------

const membroApp = (r: Record<string, unknown>): Membro => ({
  id: r.id as string,
  email: r.email as string,
  nome: (r.nome as string) ?? '',
  admin: !!r.admin,
  ativo: r.ativo as boolean,
  dono: !!r.user_id && r.user_id === r.owner_id,
  trocarSenha: !!r.trocar_senha,
  criadoEm: r.criado_em as string,
});

export async function listarMembros(empresa: string): Promise<Membro[]> {
  const { data, error } = await supabase.from('imobiliario_usuario').select('*').eq('owner_id', empresa).order('criado_em');
  if (tabelaInexistente(error)) throw new Error(AVISO_SCRIPT);
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(membroApp);
}

export async function listarImobiliarias(): Promise<Imobiliaria[]> {
  const { data, error } = await supabase.rpc('imobiliario_empresas');
  if (funcaoInexistente(error)) throw new Error(AVISO_SCRIPT);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.owner_id as string,
    nome: (r.nome as string) || '',
    donoEmail: (r.dono_email as string) || '',
    usuarios: Number(r.usuarios) || 0,
  }));
}

/**
 * Cadastra um acesso com senha provisória. empresa = owner_id da imobiliária; sem empresa
 * (somente admin geral) cria uma nova imobiliária, e a pessoa vira dona e admin.
 */
export async function cadastrarUsuario(m: {
  nome: string; email: string; senha: string; admin: boolean; empresa: string | null; novaEmpresa?: string;
}) {
  const { data, error } = await supabase.rpc('imobiliario_criar_usuario', {
    p_email: m.email.trim().toLowerCase(),
    p_senha: m.senha,
    p_nome: m.nome.trim(),
    p_admin: m.admin,
    p_empresa: m.empresa,
    p_nova_empresa: m.novaEmpresa?.trim() || null,
  });
  if (funcaoInexistente(error)) throw new Error(AVISO_SCRIPT);
  if (error) throw error;
  const d = data as { ja_tinha_conta: boolean; empresa: string };
  return { jaTinhaConta: !!d.ja_tinha_conta, empresa: d.empresa };
}

export async function alterarMembro(id: string, campos: Partial<Pick<Membro, 'nome' | 'admin' | 'ativo'>>) {
  const { error } = await supabase.from('imobiliario_usuario').update(campos).eq('id', id);
  if (error) throw error;
}

export async function removerMembro(id: string) {
  const { error } = await supabase.from('imobiliario_usuario').delete().eq('id', id);
  if (error) throw error;
}

export async function redefinirSenha(id: string, senha: string) {
  const { error } = await supabase.rpc('imobiliario_redefinir_senha', { p_id: id, p_senha: senha });
  if (funcaoInexistente(error)) throw new Error(AVISO_SCRIPT);
  if (error) throw error;
}

/** Senha provisória simples de ditar: 3 letras + 4 números. */
export function gerarSenhaProvisoria() {
  const letras = 'abcdefghjkmnpqrstuvwxyz';
  let s = '';
  for (let i = 0; i < 3; i++) s += letras[Math.floor(Math.random() * letras.length)];
  for (let i = 0; i < 4; i++) s += Math.floor(Math.random() * 10);
  return s;
}
