// Conexão com a base de dados (Supabase) da ML Softwares — mesma base do Assistência ML.
// A chave publishable é pública por natureza: a segurança fica nas regras (RLS) do banco,
// onde cada imobiliária só acessa os próprios dados. NUNCA coloque aqui a chave service_role/secret.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

export const SUPABASE_URL = 'https://eoowbybfrbmjxcjfniuu.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_n5kj7FP4nEklOtYOt5GgKw_GpRUXs_t';
export const BUCKET_FOTOS = 'imobiliario-fotos';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renova o login automaticamente só com o app aberto (recomendação do Supabase para React Native)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const AVISO_SCRIPT =
  'A base ainda não tem as tabelas do Imobiliário ML. Rode o script supabase/migrations/20261125_imobiliario.sql no SQL Editor do Supabase.';

// Mensagem amigável para erros de rede / banco
export function mensagemErro(e: unknown): string {
  const msg = String((e as { message?: string })?.message || e || '');
  if (/network|fetch|timeout|internet/i.test(msg)) return 'Sem conexão com a internet. Verifique a rede e tente de novo.';
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Database error (granting|querying)/i.test(msg)) return 'O servidor recusou o login por um erro no banco de dados. Tente de novo.';
  if (/banned/i.test(msg)) return 'Sua conta foi desativada. Fale com a ML Softwares: (81) 98805-5220.';
  if (/relation "?(public\.)?imobiliario_|function public\.imobiliario_|could not find the (table|function)/i.test(msg)) return AVISO_SCRIPT;
  if (/row-level security/i.test(msg)) return 'Sua conta está desativada ou sem permissão para esta ação.';
  if (/Bucket not found/i.test(msg)) return 'O armazenamento de fotos ainda não foi criado. ' + AVISO_SCRIPT;
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (/Password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/JWT|session|not authenticated/i.test(msg)) return 'Sua sessão expirou. Entre novamente.';
  return msg || 'Erro inesperado.';
}

export const funcaoInexistente = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function/i.test(e.message ?? ''));

export const tabelaInexistente = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST205' || e.code === '42P01' || /could not find the table|does not exist/i.test(e.message ?? ''));
