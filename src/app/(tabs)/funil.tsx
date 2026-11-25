import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Busca, CabecalhoTela, Chips, emHover, Fab, Vazio } from '../../components/ui';
import { useAvancarFase } from '../../lib/acoes';
import { useDesktop, useMargem } from '../../lib/desktop';
import { FASES, FASES_ATIVAS, fluxo, proximaFase, tituloImovel } from '../../lib/dominio';
import { diasEntre, fmtMoedaCurta, semAcento } from '../../lib/format';
import { useDados } from '../../lib/store';
import type { Fase, Negocio } from '../../lib/types';
import { colors, radius } from '../../theme';

type Filtro = 'todos' | 'venda' | 'aluguel';

export default function Funil() {
  const params = useLocalSearchParams<{ fase?: Fase }>();
  const { negocios, cliente, imovel, recarregar } = useDados();
  const desktop = useDesktop();
  const margem = useMargem();
  const [faseSel, setFaseSel] = useState<Fase>(params.fase ?? 'primeiro_contato');
  const [tipo, setTipo] = useState<Filtro>('todos');
  const [q, setQ] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const filtrados = useMemo(() => {
    const t = semAcento(q.trim());
    return negocios.filter((n) => {
      if (tipo !== 'todos' && n.tipo !== tipo) return false;
      if (!t) return true;
      const c = cliente(n.cliente_id);
      const im = imovel(n.imovel_id);
      return semAcento(`${c?.nome ?? ''} ${c?.telefone ?? ''} ${im ? tituloImovel(im) : ''} ${im?.codigo ?? ''}`).includes(t);
    });
  }, [negocios, tipo, q, cliente, imovel]);

  const colunas: Fase[] = [...FASES_ATIVAS, 'concluido', 'perdido'];
  const porFase = (f: Fase) => filtrados.filter((n) => n.fase === f);
  const atualizar = async () => {
    setAtualizando(true);
    await recarregar();
    setAtualizando(false);
  };

  const filtros = (
    <View style={{ gap: 10, marginBottom: 12 }}>
      <Busca value={q} onChangeText={setQ} placeholder="Buscar cliente, imóvel ou código" />
      <Chips<Filtro>
        opcoes={[
          { value: 'todos', label: 'Todos' },
          { value: 'venda', label: 'Venda', icon: 'pricetag-outline' },
          { value: 'aluguel', label: 'Aluguel', icon: 'key-outline' },
        ]}
        valor={tipo}
        onChange={setTipo}
      />
    </View>
  );

  if (desktop) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingHorizontal: margem, paddingTop: 20 }}>
          <CabecalhoTela
            titulo="Funil de clientes"
            subtitulo="Do primeiro contato à entrega das chaves"
            botao={{ label: 'Novo atendimento', icon: 'add', onPress: () => router.push('/negocio/novo') }}
          />
          {filtros}
        </View>
        <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: margem, paddingBottom: 20, gap: 12 }}>
          {colunas.map((f) => {
            const lista = porFase(f);
            const cfg = FASES[f];
            const total = lista.reduce((s, n) => s + (n.valor ?? imovel(n.imovel_id)?.preco_venda ?? 0), 0);
            return (
              <View key={f} style={st.coluna}>
                <View style={[st.colTopo, { borderTopColor: cfg.color }]}>
                  <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                  <Text style={st.colTitulo}>{cfg.label}</Text>
                  <Text style={st.colQtd}>{lista.length}</Text>
                </View>
                {total > 0 && <Text style={st.colTotal}>{fmtMoedaCurta(total)}</Text>}
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
                  {lista.map((n) => <CartaoNegocio key={n.id} n={n} />)}
                  {!lista.length && <Text style={st.colVazia}>{f === 'documentacao' ? 'Só para vendas' : 'Nenhum'}</Text>}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  const lista = porFase(faseSel);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <FlatList
        data={lista}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: margem, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            <CabecalhoTela titulo="Funil" subtitulo="Do primeiro contato à entrega das chaves" />
            {filtros}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
              {colunas.map((f) => {
                const cfg = FASES[f];
                const ativo = f === faseSel;
                return (
                  <Pressable key={f} onPress={() => setFaseSel(f)} style={[st.aba, ativo && { backgroundColor: cfg.color + '2A', borderColor: cfg.color }]}>
                    <Ionicons name={cfg.icon} size={15} color={ativo ? cfg.color : colors.textMuted} />
                    <Text style={[st.abaTxt, ativo && { color: colors.text }]}>{cfg.curto}</Text>
                    <View style={[st.abaQtd, ativo && { backgroundColor: cfg.color }]}>
                      <Text style={st.abaQtdTxt}>{porFase(f).length}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={st.dica}>
              <Ionicons name="bulb-outline" size={13} color={colors.warning} /> {FASES[faseSel].dica}
            </Text>
          </>
        }
        ListEmptyComponent={<Vazio icon={FASES[faseSel].icon} texto={`Nenhum atendimento em "${FASES[faseSel].label}".`} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => <CartaoNegocio n={item} />}
      />
      <Fab onPress={() => router.push('/negocio/novo')} label="Novo atendimento" />
    </SafeAreaView>
  );
}

function CartaoNegocio({ n }: { n: Negocio }) {
  const { cliente, imovel } = useDados();
  const avancar = useAvancarFase();
  const c = cliente(n.cliente_id);
  const im = imovel(n.imovel_id);
  const prox = proximaFase(n);
  const etapas = fluxo(n.tipo);
  const idx = etapas.indexOf(n.fase);
  const dias = diasEntre(new Date(n.atualizado_em), new Date());
  const cor = FASES[n.fase].color;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/negocio/[id]', params: { id: n.id } })}
      style={(e) => [st.card, emHover(e) && { borderColor: cor }, e.pressed && { opacity: 0.85 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar nome={c?.nome ?? '?'} tamanho={36} cor={cor} />
        <View style={{ flex: 1 }}>
          <Text style={st.nome} numberOfLines={1}>{c?.nome ?? 'Cliente removido'}</Text>
          <Text style={st.sub} numberOfLines={1}>{im ? tituloImovel(im) : 'Imóvel a definir'}</Text>
        </View>
        {prox && (
          <Pressable
            onPress={() => avancar(n)}
            hitSlop={8}
            accessibilityLabel={`Avançar para ${FASES[prox].label}`}
            style={(e) => [st.avancar, { backgroundColor: FASES[prox].color + '26' }, emHover(e) && { backgroundColor: FASES[prox].color + '44' }]}
          >
            <Ionicons name={prox === 'concluido' ? 'checkmark' : 'arrow-forward'} size={16} color={FASES[prox].color} />
          </Pressable>
        )}
      </View>
      {idx >= 0 && (
        <View style={st.progresso}>
          {etapas.map((f, i) => (
            <View key={f} style={[st.passo, { backgroundColor: i <= idx ? FASES[f].color : colors.border }]} />
          ))}
        </View>
      )}
      <View style={st.rodape}>
        <Text style={[st.tipo, { color: n.tipo === 'venda' ? colors.cyan : colors.pink }]}>{n.tipo === 'venda' ? 'Venda' : 'Aluguel'}</Text>
        {!!(n.valor ?? im?.preco_venda) && <Text style={st.valor}>{fmtMoedaCurta(n.valor ?? (n.tipo === 'venda' ? im?.preco_venda : im?.valor_aluguel))}</Text>}
        <Text style={[st.dias, dias >= 5 && { color: colors.warning }]}>{dias === 0 ? 'hoje' : `${dias}d`}</Text>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  coluna: { width: 280, backgroundColor: colors.bgAlt, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: colors.border },
  colTopo: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 3, paddingTop: 8, marginTop: -10, marginHorizontal: -10, paddingHorizontal: 12, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  colTitulo: { color: colors.text, fontWeight: '800', flex: 1 },
  colQtd: { color: colors.textSec, fontWeight: '800' },
  colTotal: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginLeft: 2 },
  colVazia: { color: colors.textMuted, textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10, marginTop: 8 },
  nome: { color: colors.text, fontWeight: '700', fontSize: 15 },
  sub: { color: colors.textSec, fontSize: 12, marginTop: 1 },
  avancar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  progresso: { flexDirection: 'row', gap: 4 },
  passo: { flex: 1, height: 4, borderRadius: 2 },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipo: { fontSize: 12, fontWeight: '800' },
  valor: { color: colors.text, fontSize: 12, fontWeight: '700' },
  dias: { color: colors.textMuted, fontSize: 12, marginLeft: 'auto' },
  aba: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  abaTxt: { color: colors.textSec, fontWeight: '700', fontSize: 13 },
  abaQtd: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  abaQtdTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  dica: { color: colors.textSec, fontSize: 13, marginBottom: 12, lineHeight: 18 },
});
