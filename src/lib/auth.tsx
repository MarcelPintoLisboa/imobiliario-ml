import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

interface AuthCtx {
  session: Session | null;
  user: User | null;
  pronto: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

// Guarda a sessão do usuário logado (Supabase Auth) e expõe entrar / sair.
// Não há cadastro livre: os acessos são criados pelo administrador (ver lib/conta.tsx).
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPronto(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: session?.user ?? null,
      pronto,
      entrar: async (email, senha) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
      },
      sair: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, pronto],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
