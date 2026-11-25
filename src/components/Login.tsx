import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { mensagemErro } from '../lib/supabase';
import { colors, radius } from '../theme';
import { Marca } from './Marca';
import { Botao } from './ui';

const DESTAQUES: { icon: keyof typeof Ionicons.glyphMap; texto: string }[] = [
  { icon: 'mic-outline', texto: 'Cadastre imóveis falando' },
  { icon: 'git-branch-outline', texto: 'Funil do contato às chaves' },
  { icon: 'calendar-outline', texto: 'Agenda de visitas com lembrete' },
];

// Tela de entrada (aparece quando não há usuário logado)
export default function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const enviar = async () => {
    setErro('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Informe um e-mail válido.');
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* brilho da marca no fundo */}
      <LinearGradient
        colors={[colors.primary + '40', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.6 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <Marca vertical tamanho={92} slogan="O dia a dia do corretor, num só lugar." />

            <View style={s.destaques}>
              {DESTAQUES.map((d) => (
                <View key={d.texto} style={s.destaque}>
                  <Ionicons name={d.icon} size={16} color={colors.cyan} />
                  <Text style={s.destaqueTxt}>{d.texto}</Text>
                </View>
              ))}
            </View>

            <View style={s.card}>
              <Text style={s.titulo}>Entrar</Text>

              <Text style={s.label}>E-mail</Text>
              <TextInput
                style={s.input} value={email} onChangeText={setEmail} placeholder="voce@imobiliaria.com.br"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
                textContentType="emailAddress" placeholderTextColor={colors.textMuted}
              />

              <Text style={s.label}>Senha</Text>
              <View style={s.senhaBox}>
                <TextInput
                  style={[s.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]} value={senha} onChangeText={setSenha}
                  placeholder="mínimo 6 caracteres" secureTextEntry={!verSenha} autoCapitalize="none"
                  textContentType="password" placeholderTextColor={colors.textMuted} onSubmitEditing={enviar} returnKeyType="go"
                />
                <Pressable onPress={() => setVerSenha((v) => !v)} hitSlop={8} style={{ paddingHorizontal: 12 }} accessibilityLabel="Mostrar senha">
                  <Ionicons name={verSenha ? 'eye-off' : 'eye'} size={20} color={colors.textSec} />
                </Pressable>
              </View>

              {erro ? <Text style={s.erro}>{erro}</Text> : null}

              <Botao label="Entrar" icon="log-in-outline" onPress={enviar} carregando={enviando} />

              <Text style={s.aviso}>
                Sem acesso? O administrador da imobiliária libera seu e-mail com uma senha provisória. No primeiro acesso você
                cria a sua própria senha.
              </Text>
            </View>
            <Text style={s.rodape}>ML Softwares</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, width: '100%', maxWidth: 460, alignSelf: 'center' },
  destaques: { gap: 8, marginTop: 22, marginBottom: 22, alignSelf: 'center' },
  destaque: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  destaqueTxt: { color: colors.textSec, fontSize: 14 },
  card: { backgroundColor: colors.card + 'EE', borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.border },
  titulo: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSec, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: colors.text, backgroundColor: colors.bgAlt, marginBottom: 14,
  },
  senhaBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.bgAlt, marginBottom: 14,
  },
  erro: { color: colors.critical, marginBottom: 12 },
  aviso: { textAlign: 'center', color: colors.textSec, marginTop: 16, fontSize: 13, lineHeight: 19 },
  rodape: { color: colors.textMuted, textAlign: 'center', marginTop: 20, fontSize: 12 },
});
