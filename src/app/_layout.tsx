import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertaWebHost } from '../components/AlertaWeb';
import { EstadoConta } from '../components/EstadoConta';
import Login from '../components/Login';
import { LogoMarca } from '../components/Marca';
import { MenuLateral } from '../components/MenuLateral';
import { TrocarSenha } from '../components/TrocarSenha';
import { Botao } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth';
import { ContaProvider, useConta } from '../lib/conta';
import { useDesktop } from '../lib/desktop';
import { prepararNotificacoes } from '../lib/notificacoes';
import { DataProvider, useDados } from '../lib/store';
import { colors } from '../theme';

const tema = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, text: colors.text, border: colors.border },
};

export default function RootLayout() {
  useEffect(() => {
    prepararNotificacoes();
    if (Platform.OS === 'web') return;
    // Ao tocar no lembrete, abre o compromisso
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as Record<string, string> | undefined;
      if (data?.agendamentoId) router.push({ pathname: '/agendamento/editar', params: { id: data.agendamentoId } });
    });
    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider value={tema}>
      <AuthProvider>
        <StatusBar style="light" />
        <Portao />
        <AlertaWebHost />
      </AuthProvider>
    </ThemeProvider>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg }}>{children}</View>;
}

function Carregando({ texto }: { texto?: string }) {
  return (
    <Centro>
      <LogoMarca tamanho={72} />
      <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 22 }} />
      {!!texto && <Text style={{ marginTop: 12, color: colors.textSec }}>{texto}</Text>}
    </Centro>
  );
}

// Sem login: tela de entrar. Com login: confere o acesso em imobiliario_usuario e carrega os dados.
function Portao() {
  const { pronto, user } = useAuth();
  if (!pronto) return <Carregando />;
  if (!user) return <Login />;
  return (
    <ContaProvider key={user.id}>
      <PortaoConta />
    </ContaProvider>
  );
}

function PortaoConta() {
  const conta = useConta();
  if (!conta.pronta) return <Carregando />;
  if (conta.erro || conta.situacao !== 'ok' || !conta.dono) return <EstadoConta />;
  if (conta.trocarSenha) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <TrocarSenha primeiroAcesso />
      </SafeAreaView>
    );
  }
  return (
    <DataProvider key={conta.dono}>
      <App />
    </DataProvider>
  );
}

function App() {
  const { carregado, erroCarga, recarregar, clientes, imoveis } = useDados();
  const { sair } = useAuth();
  const desktop = useDesktop();
  if (!carregado) return <Carregando texto="Carregando sua carteira…" />;
  if (erroCarga && !clientes.length && !imoveis.length) {
    return (
      <Centro>
        <Ionicons name="cloud-offline" size={48} color={colors.textSec} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 }}>Não foi possível carregar</Text>
        <Text style={{ color: colors.textSec, textAlign: 'center', marginTop: 6, maxWidth: 420 }}>{erroCarga}</Text>
        <View style={{ gap: 10, marginTop: 20, alignSelf: 'stretch', maxWidth: 320, width: '100%', marginHorizontal: 'auto' }}>
          <Botao label="Tentar de novo" icon="refresh" onPress={recarregar} />
          <Botao label="Sair da conta" variante="secundario" icon="log-out-outline" onPress={sair} />
        </View>
      </Centro>
    );
  }

  const pilha = (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: '700', ...(desktop && { fontSize: 20 }) },
        // desktop: formulários e detalhes centralizados, sem esticar na tela inteira
        contentStyle: desktop ? { backgroundColor: colors.bg, width: '100%', maxWidth: 1080, alignSelf: 'center' } : { backgroundColor: colors.bg },
        headerShadowVisible: false,
        animation: desktop ? 'none' : undefined,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      <Stack.Screen name="imovel/editar" options={{ title: 'Imóvel', presentation: 'modal' }} />
      <Stack.Screen name="imovel/[id]" options={{ title: 'Imóvel' }} />
      <Stack.Screen name="cliente/editar" options={{ title: 'Cliente', presentation: 'modal' }} />
      <Stack.Screen name="cliente/[id]" options={{ title: 'Cliente' }} />
      <Stack.Screen name="clientes" options={{ title: 'Clientes' }} />
      <Stack.Screen name="negocio/novo" options={{ title: 'Novo atendimento', presentation: 'modal' }} />
      <Stack.Screen name="negocio/[id]" options={{ title: 'Atendimento' }} />
      <Stack.Screen name="agendamento/editar" options={{ title: 'Compromisso', presentation: 'modal' }} />
      <Stack.Screen name="empresa" options={{ title: 'Minha imobiliária' }} />
      <Stack.Screen name="usuarios/index" options={{ title: 'Acessos' }} />
      <Stack.Screen name="usuarios/novo" options={{ title: 'Novo acesso', presentation: 'modal' }} />
      <Stack.Screen name="senha" options={{ title: 'Trocar senha', presentation: 'modal' }} />
    </Stack>
  );
  if (!desktop) return pilha;
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <MenuLateral />
      <View style={{ flex: 1 }}>{pilha}</View>
    </View>
  );
}
