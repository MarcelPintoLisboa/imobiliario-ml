import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useConta } from '../lib/conta';
import { mensagemErro } from '../lib/supabase';
import { colors } from '../theme';
import { Botao } from './ui';

// Telas entre o login e o app: e-mail sem acesso, acesso desativado ou erro ao ler a conta.
export function EstadoConta() {
  const { sair } = useAuth();
  const { erro, situacao, email, recarregarConta } = useConta();
  const [ocupado, setOcupado] = useState(false);

  const tentar = async () => {
    setOcupado(true);
    try {
      await recarregarConta();
    } catch (e) {
      Alert.alert('Não foi possível concluir', mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  };

  let icone: keyof typeof Ionicons.glyphMap = 'cloud-offline';
  let titulo = 'Sem conexão';
  let texto = mensagemErro(erro);
  if (!erro && situacao === 'desativado') {
    icone = 'lock-closed';
    titulo = 'Acesso desativado';
    texto = 'Seu acesso foi desativado pelo administrador da imobiliária. Fale com ele para reativar.';
  } else if (!erro) {
    icone = 'person-remove';
    titulo = 'Sem acesso liberado';
    texto =
      `O e-mail ${email} ainda não tem acesso ao Imobiliário ML. ` +
      'Peça ao administrador para liberar o seu acesso.';
  }

  return (
    <View style={st.tela}>
      <View style={st.icone}>
        <Ionicons name={icone} size={40} color={colors.primary} />
      </View>
      <Text style={st.titulo}>{titulo}</Text>
      <Text style={st.texto}>{texto}</Text>
      {ocupado ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 24 }}>
          <Botao label="Tentar de novo" icon="refresh" onPress={tentar} />
          <Botao label="Sair da conta" variante="secundario" icon="log-out-outline" onPress={sair} />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  icone: {
    width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary + '18', marginBottom: 16,
  },
  titulo: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  texto: { color: colors.textSec, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});
