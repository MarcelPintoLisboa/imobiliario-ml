import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Linking, Text, View } from 'react-native';
import { Avatar, BotaoIcone, Busca, Card, Fab, Vazio } from '../components/ui';
import { useGrade } from '../lib/desktop';
import { ativo, FASES } from '../lib/dominio';
import { fmtTelefone, linkWhatsApp, semAcento } from '../lib/format';
import { useDados } from '../lib/store';
import { colors } from '../theme';

export default function Clientes() {
  const { clientes, negocios } = useDados();
  const g = useGrade(380);
  const [q, setQ] = useState('');

  const lista = useMemo(() => {
    const t = semAcento(q.trim());
    if (!t) return clientes;
    return clientes.filter((c) => semAcento(`${c.nome} ${c.telefone} ${c.email} ${c.origem}`).includes(t));
  }, [clientes, q]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        {...g.lista}
        data={lista}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[{ paddingTop: 12, paddingBottom: 110 }, g.conteudo]}
        ListHeaderComponent={
          <View style={{ marginBottom: 12, paddingHorizontal: g.cols > 1 ? 6 : 0 }}>
            <Busca value={q} onChangeText={setQ} placeholder="Buscar por nome, telefone ou origem" />
          </View>
        }
        ListEmptyComponent={<Vazio icon="people-outline" texto={clientes.length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda. Cadastre por voz em segundos.'} />}
        renderItem={({ item: c }) => {
          const n = negocios.find((x) => x.cliente_id === c.id && ativo(x));
          return (
            <View style={g.celula}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, padding: 12 }} onPress={() => router.push({ pathname: '/cliente/[id]', params: { id: c.id } })}>
                <Avatar nome={c.nome} cor={n ? FASES[n.fase].color : colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{c.nome}</Text>
                  <Text style={{ color: colors.textSec, fontSize: 13 }} numberOfLines={1}>
                    {[fmtTelefone(c.telefone), c.origem].filter(Boolean).join(' · ') || 'Sem telefone'}
                  </Text>
                  {n && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Ionicons name={FASES[n.fase].icon} size={12} color={FASES[n.fase].color} />
                      <Text style={{ color: FASES[n.fase].color, fontSize: 12, fontWeight: '700' }}>{FASES[n.fase].label}</Text>
                    </View>
                  )}
                </View>
                {!!c.telefone && (
                  <BotaoIcone icon="logo-whatsapp" rotulo="WhatsApp" cor={colors.good} fundo={colors.good + '22'} tamanho={38} onPress={() => Linking.openURL(linkWhatsApp(c.telefone))} />
                )}
              </Card>
            </View>
          );
        }}
      />
      <Fab onPress={() => router.push('/cliente/editar')} icon="person-add" label="Novo cliente" />
    </View>
  );
}
