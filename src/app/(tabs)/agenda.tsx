import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, CabecalhoTela, Card, emHover, Fab, Vazio } from '../../components/ui';
import { useConta } from '../../lib/conta';
import { useDesktop, useMargem } from '../../lib/desktop';
import { STATUS_AGENDAMENTO, TIPOS_AGENDAMENTO, tituloImovel } from '../../lib/dominio';
import { DIAS_SEMANA, fmtHora, inicioDoDia, linkWhatsApp, MESES_LONGOS, mesmoDia, primeiroNome } from '../../lib/format';
import { useDados } from '../../lib/store';
import { mensagemErro } from '../../lib/supabase';
import type { Agendamento } from '../../lib/types';
import { colors, radius } from '../../theme';

export default function Agenda() {
  const { agendamentos, recarregar } = useDados();
  const { userId } = useConta();
  const desktop = useDesktop();
  const margem = useMargem();
  const [dia, setDia] = useState(() => inicioDoDia(new Date()));
  const [soMeus, setSoMeus] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  // semana (domingo a sábado) do dia escolhido
  const semana = useMemo(() => {
    const ini = new Date(dia);
    ini.setDate(ini.getDate() - ini.getDay());
    return Array.from({ length: 7 }, (_, i) => new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + i));
  }, [dia]);

  const visiveis = useMemo(
    () => agendamentos.filter((a) => !soMeus || a.corretor_id === userId),
    [agendamentos, soMeus, userId],
  );
  const doDia = visiveis.filter((a) => mesmoDia(new Date(a.inicio), dia));
  const qtd = (d: Date) => visiveis.filter((a) => a.status !== 'cancelado' && mesmoDia(new Date(a.inicio), d)).length;
  const proximos = visiveis
    .filter((a) => new Date(a.inicio) > new Date() && !mesmoDia(new Date(a.inicio), dia) && a.status !== 'cancelado' && a.status !== 'realizado')
    .slice(0, 6);

  const mudarSemana = (d: number) => setDia(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + d * 7));
  const hoje = new Date();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: margem, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={async () => { setAtualizando(true); await recarregar(); setAtualizando(false); }} tintColor={colors.primary} />
        }
      >
        <CabecalhoTela
          titulo="Agenda"
          subtitulo={`${MESES_LONGOS[dia.getMonth()]} de ${dia.getFullYear()}`}
          botao={desktop ? { label: 'Agendar', icon: 'add', onPress: () => router.push({ pathname: '/agendamento/editar', params: { data: dia.toISOString() } }) } : undefined}
        />

        <View style={st.semanaTopo}>
          <Pressable onPress={() => mudarSemana(-1)} hitSlop={10} accessibilityLabel="Semana anterior">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => setDia(inicioDoDia(new Date()))} style={st.hojeBtn}>
            <Text style={st.hojeTxt}>Hoje</Text>
          </Pressable>
          <Pressable onPress={() => setSoMeus((v) => !v)} style={[st.hojeBtn, soMeus && { borderColor: colors.primary, backgroundColor: colors.primary + '22' }]}>
            <Text style={st.hojeTxt}>{soMeus ? 'Só os meus' : 'Equipe toda'}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => mudarSemana(1)} hitSlop={10} accessibilityLabel="Próxima semana">
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={st.semana}>
          {semana.map((d) => {
            const sel = mesmoDia(d, dia);
            const n = qtd(d);
            return (
              <Pressable key={d.toISOString()} onPress={() => setDia(d)} style={(e) => [st.dia, sel && st.diaSel, !sel && emHover(e) && { backgroundColor: colors.card }]}>
                <Text style={[st.diaSemana, sel && { color: '#fff' }]}>{DIAS_SEMANA[d.getDay()]}</Text>
                <Text style={[st.diaNum, sel && { color: '#fff' }, !sel && mesmoDia(d, hoje) && { color: colors.cyan }]}>{d.getDate()}</Text>
                <View style={st.pontos}>
                  {Array.from({ length: Math.min(n, 3) }).map((_, i) => (
                    <View key={i} style={[st.ponto, { backgroundColor: sel ? '#fff' : colors.pink }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={st.secao}>
          {mesmoDia(dia, hoje) ? 'Hoje' : `${DIAS_SEMANA[dia.getDay()]}, ${dia.getDate()} de ${MESES_LONGOS[dia.getMonth()].toLowerCase()}`}
        </Text>
        {doDia.length === 0 ? (
          <Card>
            <Vazio icon="calendar-clear-outline" texto="Nenhum compromisso neste dia." />
          </Card>
        ) : (
          doDia.map((a) => <ItemAgenda key={a.id} a={a} />)
        )}

        {proximos.length > 0 && (
          <>
            <Text style={[st.secao, { marginTop: 22 }]}>Próximos</Text>
            {proximos.map((a) => <ItemAgenda key={a.id} a={a} comData />)}
          </>
        )}
      </ScrollView>
      {!desktop && <Fab onPress={() => router.push({ pathname: '/agendamento/editar', params: { data: dia.toISOString() } })} label="Agendar" />}
    </SafeAreaView>
  );
}

function ItemAgenda({ a, comData }: { a: Agendamento; comData?: boolean }) {
  const { cliente, imovel, salvarAgendamento } = useDados();
  const c = cliente(a.cliente_id);
  const im = imovel(a.imovel_id);
  const t = TIPOS_AGENDAMENTO[a.tipo];
  const s = STATUS_AGENDAMENTO[a.status];
  const encerrado = a.status === 'realizado' || a.status === 'cancelado';
  const d = new Date(a.inicio);

  const concluir = async () => {
    try {
      await salvarAgendamento({ id: a.id, status: 'realizado' });
    } catch (e) {
      Alert.alert('Não foi possível salvar', mensagemErro(e));
    }
  };

  return (
    <Card style={[st.item, encerrado && { opacity: 0.6 }]} onPress={() => router.push({ pathname: '/agendamento/editar', params: { id: a.id } })}>
      <View style={[st.faixa, { backgroundColor: t.color }]} />
      <View style={st.horaBox}>
        {comData && <Text style={st.data}>{`${d.getDate()}/${d.getMonth() + 1}`}</Text>}
        <Text style={st.hora}>{fmtHora(a.inicio)}</Text>
        <Text style={st.duracao}>{a.duracao_min} min</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={t.icon} size={15} color={t.color} />
          <Text style={st.titulo} numberOfLines={1}>{a.titulo || t.label}</Text>
        </View>
        {!!c && <Text style={st.sub} numberOfLines={1}>{c.nome}</Text>}
        {!!(im || a.local) && (
          <Text style={st.sub} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} /> {im ? tituloImovel(im) : a.local}
          </Text>
        )}
        <Badge label={s.label} color={s.color} icon={s.icon} />
      </View>
      {!encerrado && (
        <View style={{ gap: 8 }}>
          {!!c?.telefone && (
            <Pressable
              hitSlop={6}
              accessibilityLabel="Enviar WhatsApp"
              style={[st.acao, { backgroundColor: colors.good + '22' }]}
              onPress={() =>
                Linking.openURL(linkWhatsApp(c.telefone, `Olá, ${primeiroNome(c.nome)}! Confirmando nossa ${t.label.toLowerCase()} em ${d.getDate()}/${d.getMonth() + 1} às ${fmtHora(a.inicio)}.`))
              }
            >
              <Ionicons name="logo-whatsapp" size={17} color={colors.good} />
            </Pressable>
          )}
          <Pressable hitSlop={6} accessibilityLabel="Marcar como realizado" style={[st.acao, { backgroundColor: colors.primary + '22' }]} onPress={concluir}>
            <Ionicons name="checkmark-done" size={17} color={colors.primary} />
          </Pressable>
        </View>
      )}
    </Card>
  );
}

const st = StyleSheet.create({
  semanaTopo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  hojeBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  hojeTxt: { color: colors.text, fontWeight: '700', fontSize: 13 },
  semana: { flexDirection: 'row', gap: 6 },
  dia: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, gap: 2 },
  diaSel: { backgroundColor: colors.primary },
  diaSemana: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  diaNum: { color: colors.text, fontSize: 18, fontWeight: '800' },
  pontos: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  ponto: { width: 5, height: 5, borderRadius: 3 },
  secao: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  item: { flexDirection: 'row', gap: 12, marginBottom: 8, padding: 12, paddingLeft: 16, overflow: 'hidden' },
  faixa: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  horaBox: { width: 54, alignItems: 'flex-start' },
  data: { color: colors.cyan, fontSize: 12, fontWeight: '800' },
  hora: { color: colors.text, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  duracao: { color: colors.textMuted, fontSize: 11 },
  titulo: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  sub: { color: colors.textSec, fontSize: 13 },
  acao: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
