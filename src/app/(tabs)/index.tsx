import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Marca } from '../../components/Marca';
import { Avatar, Card, emHover, type IconName, Metrica, Titulo, Vazio } from '../../components/ui';
import { useConta } from '../../lib/conta';
import { useDesktop, useMargem } from '../../lib/desktop';
import { ativo, FASES, FASES_ATIVAS, TIPOS_AGENDAMENTO, tituloImovel, valorNegocio } from '../../lib/dominio';
import { diasEntre, fmtHora, fmtMoedaCurta, linkWhatsApp, mesmoDia, primeiroNome, saudacao } from '../../lib/format';
import { useDados } from '../../lib/store';
import { colors, radius } from '../../theme';

export default function Inicio() {
  const { empresa, negocios, agendamentos, imoveis, cliente, imovel, recarregar } = useDados();
  const { nome, email } = useConta();
  const desktop = useDesktop();
  const margem = useMargem();
  const [atualizando, setAtualizando] = useState(false);

  const dados = useMemo(() => {
    const hoje = new Date();
    const ativos = negocios.filter(ativo);
    const deHoje = agendamentos.filter((a) => a.status !== 'cancelado' && mesmoDia(new Date(a.inicio), hoje));
    const emNegociacao = ativos.filter((n) => n.fase === 'negociacao' || n.fase === 'documentacao');
    const parados = ativos
      .filter((n) => diasEntre(new Date(n.atualizado_em), hoje) >= 5)
      .sort((a, b) => a.atualizado_em.localeCompare(b.atualizado_em))
      .slice(0, 5);
    const mes = negocios.filter((n) => n.fase === 'concluido' && new Date(n.atualizado_em).getMonth() === hoje.getMonth() && new Date(n.atualizado_em).getFullYear() === hoje.getFullYear());
    return {
      ativos,
      deHoje,
      emNegociacao,
      vgv: emNegociacao.filter((n) => n.tipo === 'venda').reduce((s, n) => s + valorNegocio(n, imovel(n.imovel_id)), 0),
      parados,
      fechadosMes: mes.length,
      disponiveis: imoveis.filter((i) => i.status === 'disponivel').length,
      porFase: FASES_ATIVAS.map((f) => ({ fase: f, qtd: ativos.filter((n) => n.fase === f).length })),
    };
  }, [negocios, agendamentos, imoveis, imovel]);

  const atualizar = async () => {
    setAtualizando(true);
    await recarregar();
    setAtualizando(false);
  };

  const acoes: { icon: IconName; label: string; cor: string; onPress: () => void }[] = [
    { icon: 'mic', label: 'Captar imóvel', cor: colors.cyan, onPress: () => router.push('/imovel/editar') },
    { icon: 'person-add', label: 'Atendimento', cor: colors.primary, onPress: () => router.push('/negocio/novo') },
    { icon: 'calendar', label: 'Agendar', cor: colors.blue, onPress: () => router.push('/agendamento/editar') },
    { icon: 'people', label: 'Cliente', cor: colors.pink, onPress: () => router.push('/cliente/editar') },
  ];

  const maxFase = Math.max(1, ...dados.porFase.map((f) => f.qtd));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: margem, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={colors.primary} />}
      >
        {!desktop && (
          <View style={{ marginBottom: 18 }}>
            <Marca nome={empresa.nome} logo={empresa.logo_url} slogan={empresa.slogan} tamanho={36} />
          </View>
        )}
        <Text style={st.ola}>
          {saudacao()}, {primeiroNome(nome) || email.split('@')[0]}
        </Text>
        <Text style={st.resumo}>
          {dados.deHoje.length
            ? `Você tem ${dados.deHoje.length} compromisso${dados.deHoje.length > 1 ? 's' : ''} hoje.`
            : 'Nenhum compromisso hoje. Bom momento para prospectar!'}
        </Text>

        <View style={st.acoes}>
          {acoes.map((a) => (
            <Pressable key={a.label} onPress={a.onPress} style={(e) => [st.acao, emHover(e) && { borderColor: a.cor }, e.pressed && { opacity: 0.8 }]}>
              <View style={[st.acaoIcone, { backgroundColor: a.cor + '26' }]}>
                <Ionicons name={a.icon} size={22} color={a.cor} />
              </View>
              <Text style={st.acaoTxt} numberOfLines={1}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={st.metricas}>
          <Metrica icon="git-branch-outline" valor={String(dados.ativos.length)} label="Atendimentos ativos" onPress={() => router.navigate('/funil')} />
          <Metrica icon="swap-horizontal-outline" valor={fmtMoedaCurta(dados.vgv)} label={`Em negociação (${dados.emNegociacao.length})`} cor={colors.purple} onPress={() => router.navigate('/funil')} />
          <Metrica icon="trophy-outline" valor={String(dados.fechadosMes)} label="Fechados no mês" cor={colors.good} />
          <Metrica icon="business-outline" valor={String(dados.disponiveis)} label="Imóveis disponíveis" cor={colors.cyan} onPress={() => router.navigate('/imoveis')} />
        </View>

        <View style={desktop ? { flexDirection: 'row', gap: 20, alignItems: 'flex-start' } : undefined}>
          <View style={{ flex: 1 }}>
            <Titulo acao={{ label: 'Ver agenda', onPress: () => router.navigate('/agenda') }}>Hoje</Titulo>
            {dados.deHoje.length === 0 ? (
              <Card>
                <Vazio icon="sunny-outline" texto="Agenda livre hoje." />
              </Card>
            ) : (
              dados.deHoje.map((a) => {
                const c = cliente(a.cliente_id);
                const im = imovel(a.imovel_id);
                const t = TIPOS_AGENDAMENTO[a.tipo];
                const feito = a.status === 'realizado';
                return (
                  <Card key={a.id} style={[st.compromisso, feito && { opacity: 0.55 }]} onPress={() => router.push({ pathname: '/agendamento/editar', params: { id: a.id } })}>
                    <View style={st.hora}>
                      <Text style={st.horaTxt}>{fmtHora(a.inicio)}</Text>
                      <Ionicons name={t.icon} size={16} color={t.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.compTitulo} numberOfLines={1}>{a.titulo || t.label}</Text>
                      <Text style={st.compSub} numberOfLines={1}>
                        {[c?.nome, im ? tituloImovel(im) : a.local].filter(Boolean).join(' · ') || t.label}
                      </Text>
                    </View>
                    {!!c?.telefone && !feito && (
                      <Pressable
                        hitSlop={8}
                        accessibilityLabel="Confirmar pelo WhatsApp"
                        onPress={() =>
                          Linking.openURL(
                            linkWhatsApp(
                              c.telefone,
                              `Olá, ${primeiroNome(c.nome)}! Tudo bem? Confirmando nossa ${t.label.toLowerCase()} hoje às ${fmtHora(a.inicio)}${im ? ` no imóvel ${tituloImovel(im)}` : a.local ? ` em ${a.local}` : ''}.`,
                            ),
                          )
                        }
                        style={st.whats}
                      >
                        <Ionicons name="logo-whatsapp" size={18} color={colors.good} />
                      </Pressable>
                    )}
                  </Card>
                );
              })
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Titulo acao={{ label: 'Abrir funil', onPress: () => router.navigate('/funil') }}>Funil</Titulo>
            <Card style={{ gap: 10 }}>
              {dados.porFase.map(({ fase, qtd }) => {
                const f = FASES[fase];
                return (
                  <Pressable key={fase} onPress={() => router.navigate({ pathname: '/funil', params: { fase } })} style={st.barraLinha}>
                    <Ionicons name={f.icon} size={16} color={f.color} />
                    <Text style={st.barraLabel}>{f.label}</Text>
                    <View style={st.barraFundo}>
                      <View style={[st.barra, { width: `${(qtd / maxFase) * 100}%`, backgroundColor: f.color }]} />
                    </View>
                    <Text style={st.barraQtd}>{qtd}</Text>
                  </Pressable>
                );
              })}
            </Card>

            {dados.parados.length > 0 && (
              <>
                <Titulo>Precisam de retorno</Titulo>
                {dados.parados.map((n) => {
                  const c = cliente(n.cliente_id);
                  const dias = diasEntre(new Date(n.atualizado_em), new Date());
                  return (
                    <Card key={n.id} style={st.parado} onPress={() => router.push({ pathname: '/negocio/[id]', params: { id: n.id } })}>
                      <Avatar nome={c?.nome ?? '?'} tamanho={36} cor={FASES[n.fase].color} />
                      <View style={{ flex: 1 }}>
                        <Text style={st.compTitulo} numberOfLines={1}>{c?.nome ?? 'Cliente'}</Text>
                        <Text style={st.compSub}>
                          {FASES[n.fase].label} · sem movimento há {dias} dias
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </Card>
                  );
                })}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  ola: { color: colors.text, fontSize: 26, fontWeight: '800' },
  resumo: { color: colors.textSec, fontSize: 15, marginTop: 4, marginBottom: 18 },
  acoes: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  acao: {
    flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 4, backgroundColor: colors.card,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  acaoIcone: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  acaoTxt: { color: colors.text, fontSize: 12, fontWeight: '700' },
  metricas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  compromisso: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, padding: 12 },
  hora: { alignItems: 'center', gap: 4, width: 52 },
  horaTxt: { color: colors.text, fontWeight: '800', fontSize: 15, fontVariant: ['tabular-nums'] },
  compTitulo: { color: colors.text, fontWeight: '700', fontSize: 15 },
  compSub: { color: colors.textSec, fontSize: 13, marginTop: 2 },
  whats: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.good + '22', alignItems: 'center', justifyContent: 'center' },
  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barraLabel: { color: colors.textSec, fontSize: 13, width: 120 },
  barraFundo: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.bgAlt, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: 4, minWidth: 4 },
  barraQtd: { color: colors.text, fontWeight: '800', width: 24, textAlign: 'right', fontVariant: ['tabular-nums'] },
  parado: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, padding: 12 },
});
