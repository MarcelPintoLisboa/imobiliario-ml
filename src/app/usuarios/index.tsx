import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Botao, Card, Chips, Titulo } from '../../components/ui';
import {
  ADMIN_PRINCIPAL, alterarMembro, gerarSenhaProvisoria, listarImobiliarias, listarMembros, redefinirSenha, removerMembro, useConta,
} from '../../lib/conta';
import { mensagemErro } from '../../lib/supabase';
import type { Imobiliaria, Membro } from '../../lib/types';
import { colors, radius } from '../../theme';

// Equipe de uma imobiliária. O admin da imobiliária vê só a dele; o admin geral escolhe qualquer uma.
export default function Usuarios() {
  const { ehAdmin, ehAdminGeral, dono, email, empresa: nomeMinhaEmpresa } = useConta();
  const params = useLocalSearchParams<{ empresa?: string; nome?: string }>();
  const empresa = (ehAdminGeral && params.empresa) || dono;
  const nomeEmpresa = empresa === dono ? nomeMinhaEmpresa : params.nome ?? '';
  const [lista, setLista] = useState<Membro[] | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    if (!empresa) return;
    listarMembros(empresa)
      .then((l) => {
        setLista(l);
        setErro('');
      })
      .catch((e) => setErro(mensagemErro(e)));
  }, [empresa]);

  useFocusEffect(carregar);

  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (ehAdminGeral) listarImobiliarias().then(setImobiliarias).catch((e) => setErro(mensagemErro(e)));
    }, [ehAdminGeral]),
  );

  if (!ehAdmin) {
    return (
      <View style={st.centro}>
        <Ionicons name="lock-closed" size={40} color={colors.textSec} />
        <Text style={st.restrito}>Somente o administrador pode gerenciar usuários.</Text>
      </View>
    );
  }

  const fazer = async (fn: () => Promise<void>) => {
    try {
      await fn();
      carregar();
    } catch (e) {
      Alert.alert('Não foi possível alterar', mensagemErro(e));
    }
  };

  const novaSenha = (m: Membro) => {
    const senha = gerarSenhaProvisoria();
    Alert.alert('Nova senha provisória', `Gerar a senha provisória "${senha}" para ${m.email}? A senha atual deixa de funcionar.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Gerar',
        onPress: () =>
          fazer(async () => {
            await redefinirSenha(m.id, senha);
            Alert.alert('Senha redefinida', `Passe para ${m.email}:\n\nSenha provisória: ${senha}\n\nNo próximo acesso a pessoa cria a própria senha.`);
          }),
      },
    ]);
  };

  const opcoes = (m: Membro) => {
    const protegido = m.email === ADMIN_PRINCIPAL || m.dono || m.email === email;
    const botoes: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];
    if (!protegido) {
      botoes.push(
        { text: m.admin ? 'Tornar corretor' : 'Tornar administrador', onPress: () => fazer(() => alterarMembro(m.id, { admin: !m.admin })) },
        { text: m.ativo ? 'Desativar acesso' : 'Reativar acesso', onPress: () => fazer(() => alterarMembro(m.id, { ativo: !m.ativo })) },
      );
    }
    if (ehAdminGeral && m.email !== email) botoes.push({ text: 'Gerar nova senha provisória', onPress: () => novaSenha(m) });
    if (!protegido) {
      botoes.push({
        text: 'Remover da imobiliária',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Remover usuário', `${m.email} deixará de acessar os dados da imobiliária.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Remover', style: 'destructive', onPress: () => fazer(() => removerMembro(m.id)) },
          ]),
      });
    }
    if (!botoes.length) {
      const motivo = m.email === email
        ? 'Peça a outro administrador para alterar a sua permissão.'
        : `${m.email} é ${m.dono ? 'o dono da imobiliária' : 'o administrador geral'} e não pode ser alterado.`;
      return Alert.alert(m.nome || m.email, motivo);
    }
    Alert.alert(m.nome || m.email, m.email, [...botoes, { text: 'Fechar', style: 'cancel' }]);
  };

  return (
    <>
      <Stack.Screen options={{ title: nomeEmpresa ? `Equipe · ${nomeEmpresa}` : 'Equipe' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Botao
          label="Adicionar corretor"
          icon="person-add"
          onPress={() => router.push({ pathname: '/usuarios/novo', params: { empresa: empresa ?? '', nome: nomeEmpresa } })}
        />

        {ehAdminGeral && (
          <>
            <Titulo acao={{ label: '+ Nova imobiliária', onPress: () => router.push({ pathname: '/usuarios/novo', params: { nova: '1' } }) }}>
              Imobiliárias
            </Titulo>
            {imobiliarias === null ? (
              <ActivityIndicator color={colors.primary} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <Chips
                opcoes={imobiliarias.map((i) => ({ value: i.id, label: `${i.nome || i.donoEmail} (${i.usuarios})` }))}
                valor={empresa ?? ''}
                onChange={(id) => router.setParams({ empresa: id, nome: imobiliarias.find((i) => i.id === id)?.nome ?? '' })}
              />
            )}
          </>
        )}

        <Titulo>Equipe da imobiliária</Titulo>
        {!!erro && (
          <Card style={{ borderColor: colors.warning }}>
            <Text style={{ color: colors.warning, lineHeight: 20 }}>{erro}</Text>
          </Card>
        )}
        {!erro && lista === null && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
        {!erro && lista?.length === 0 && (
          <Card>
            <Text style={{ color: colors.textSec }}>Nenhum usuário cadastrado. Toque em “Adicionar corretor”.</Text>
          </Card>
        )}
        {lista && lista.length > 0 && (
          <Card style={{ paddingVertical: 4 }}>
            {lista.map((m, k) => (
              <Pressable key={m.id} onPress={() => opcoes(m)} style={({ pressed }) => [k > 0 && st.borda, pressed && { opacity: 0.7 }]}>
                <Linha m={m} voce={m.email === email} />
              </Pressable>
            ))}
          </Card>
        )}
        <Text style={st.nota}>
          Toque em um usuário para trocar a permissão, desativar ou remover. Administradores também alteram o nome e a logo da
          imobiliária e liberam acessos. Todos os corretores veem a carteira, o funil e a agenda da equipe.
        </Text>
      </ScrollView>
    </>
  );
}

function Linha({ m, voce }: { m: Membro; voce: boolean }) {
  const { nome, email, admin, ativo, trocarSenha } = m;
  return (
    <View style={st.linha}>
      <View style={st.avatar}>
        <Ionicons name={admin ? 'shield-checkmark' : 'person'} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
          {nome || email}
          {voce ? ' (você)' : ''}
        </Text>
        {!!nome && <Text style={{ color: colors.textSec, fontSize: 12 }} numberOfLines={1}>{email}</Text>}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Badge label={admin ? 'Administrador' : 'Corretor'} color={admin ? colors.primary : colors.textSec} />
          {m.dono && <Badge label="Dono da imobiliária" color={colors.good} icon="star-outline" />}
          {!ativo && <Badge label="Desativado" color={colors.critical} icon="close-circle-outline" />}
          {ativo && trocarSenha && <Badge label="Senha provisória" color={colors.warning} icon="key-outline" />}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  restrito: { color: colors.textSec, textAlign: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  borda: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  nota: { color: colors.textMuted, fontSize: 12, marginTop: 12, lineHeight: 18 },
});
