import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useConta } from '../lib/conta';
import { mensagemErro } from '../lib/supabase';
import { colors } from '../theme';
import { Botao, Campo, Card } from './ui';

/**
 * Criação da senha pessoal. primeiroAcesso = tela obrigatória para quem ainda usa a senha
 * provisória; sem ele, é a troca de senha comum (Menu → Trocar senha).
 */
export function TrocarSenha({ primeiroAcesso, aoConcluir }: { primeiroAcesso?: boolean; aoConcluir?: () => void }) {
  const { sair } = useAuth();
  const { definirSenha, email } = useConta();
  const [senha, setSenha] = useState('');
  const [repetir, setRepetir] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const salvar = async () => {
    setErro('');
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    if (senha !== repetir) return setErro('As duas senhas não são iguais.');
    setEnviando(true);
    try {
      await definirSenha(senha);
      aoConcluir?.();
    } catch (e) {
      setErro(mensagemErro(e));
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[st.scroll, primeiroAcesso && { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
        {primeiroAcesso && (
          <>
            <View style={st.icone}>
              <Ionicons name="key" size={38} color={colors.primary} />
            </View>
            <Text style={st.titulo}>Crie a sua senha</Text>
            <Text style={st.texto}>
              Você entrou com a senha provisória enviada pelo administrador. Para continuar, crie uma senha só sua para {email}.
            </Text>
          </>
        )}
        <Card>
          <Campo label="Nova senha" value={senha} onChangeText={setSenha} secureTextEntry autoCapitalize="none" placeholder="Mínimo de 6 caracteres" textContentType="newPassword" />
          <Campo label="Repita a nova senha" value={repetir} onChangeText={setRepetir} secureTextEntry autoCapitalize="none" textContentType="newPassword" onSubmitEditing={salvar} />
        </Card>
        {!!erro && <Text style={{ color: colors.critical, fontWeight: '600', marginTop: 14 }}>{erro}</Text>}
        {enviando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={{ gap: 10, marginTop: 20 }}>
            <Botao label="Salvar senha" icon="checkmark" onPress={salvar} />
            {primeiroAcesso && <Botao label="Sair da conta" variante="secundario" icon="log-out-outline" onPress={sair} />}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20 },
  icone: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    backgroundColor: colors.primary + '18', marginBottom: 16,
  },
  titulo: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  texto: { color: colors.textSec, textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 21 },
});
