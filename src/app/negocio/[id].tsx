import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Seletor } from '../../components/Seletor';
import { Avatar, Badge, Botao, BotaoIcone, Card, Chips, Titulo, toque, Vazio } from '../../components/ui';
import { useAvancarFase } from '../../lib/acoes';
import { useDesktop, useMargem } from '../../lib/desktop';
import {
  ativo, documentosPadrao, enderecoImovel, faseAnterior, faseAoReabrir, FASES, fluxo, MOTIVOS_PERDA, precoPrincipal, proximaFase, TIPOS_AGENDAMENTO,
  tituloImovel,
} from '../../lib/dominio';
import { fmtDataHora, fmtMoeda, fmtTelefone, linkWhatsApp, numParaCampo, parseNumero } from '../../lib/format';
import { useDados } from '../../lib/store';
import { mensagemErro } from '../../lib/supabase';
import type { Fase, ItemDoc } from '../../lib/types';
import { colors, radius } from '../../theme';

export default function DetalheNegocio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { negocios, cliente, imovel, imoveis, agendamentos, salvarNegocio, moverFase, excluirNegocio } = useDados();
  const avancar = useAvancarFase();
  const desktop = useDesktop();
  const margem = useMargem();
  const n = negocios.find((x) => x.id === id);
  const [nota, setNota] = useState('');
  const [valor, setValor] = useState(numParaCampo(n?.valor));
  const [perdendo, setPerdendo] = useState(false);
  const [novoDoc, setNovoDoc] = useState('');

  if (!n) return <Vazio icon="alert-circle-outline" texto="Atendimento não encontrado." />;

  const c = cliente(n.cliente_id);
  const im = imovel(n.imovel_id);
  const etapas = fluxo(n.tipo);
  const idx = etapas.indexOf(n.fase);
  const prox = proximaFase(n);
  const ant = faseAnterior(n);
  const compromissos = agendamentos.filter((a) => a.negocio_id === n.id);
  const docs = n.documentos?.length ? n.documentos : documentosPadrao(n.tipo);
  const docsOk = docs.filter((d) => d.ok).length;

  const tentar = async (f: () => Promise<unknown>) => {
    try {
      await f();
    } catch (e) {
      Alert.alert('Não foi possível salvar', mensagemErro(e));
    }
  };

  const irPara = (f: Fase) => {
    if (f === n.fase) return;
    Alert.alert('Mudar fase', `Mover o atendimento para "${FASES[f].label}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Mover', onPress: () => tentar(() => moverFase(n, f)) },
    ]);
  };

  const marcarDoc = (i: number) => {
    toque();
    const lista: ItemDoc[] = docs.map((d, k) => (k === i ? { ...d, ok: !d.ok } : d));
    tentar(() => salvarNegocio({ id: n.id, documentos: lista }));
  };
  const addDoc = () => {
    if (!novoDoc.trim()) return;
    tentar(() => salvarNegocio({ id: n.id, documentos: [...docs, { nome: novoDoc.trim(), ok: false }] }));
    setNovoDoc('');
  };

  const registrarNota = () => {
    if (!nota.trim()) return;
    const historico = [...(n.historico ?? []), { fase: n.fase, data: new Date().toISOString(), nota: nota.trim() }];
    tentar(() => salvarNegocio({ id: n.id, historico }));
    setNota('');
  };

  const perder = (motivo: string) => {
    setPerdendo(false);
    tentar(() => moverFase({ ...n }, 'perdido', `Perdido: ${motivo}`).then(() => salvarNegocio({ id: n.id, motivo_perda: motivo })));
  };

  const excluir = () =>
    Alert.alert('Excluir atendimento?', 'O histórico deste atendimento será apagado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => tentar(async () => { await excluirNegocio(n.id); router.back(); }) },
    ]);

  const cor = FASES[n.fase].color;

  return (
    <>
      <Stack.Screen options={{ title: n.tipo === 'venda' ? 'Atendimento · Venda' : 'Atendimento · Aluguel' }} />
      <ScrollView contentContainerStyle={{ padding: margem, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Cliente */}
        <Card style={st.cliente} onPress={c ? () => router.push({ pathname: '/cliente/[id]', params: { id: c.id } }) : undefined}>
          <Avatar nome={c?.nome ?? '?'} tamanho={48} cor={cor} />
          <View style={{ flex: 1 }}>
            <Text style={st.nome}>{c?.nome ?? 'Cliente removido'}</Text>
            <Text style={st.sub}>{fmtTelefone(c?.telefone ?? '')}</Text>
          </View>
          {!!c?.telefone && (
            <>
              <BotaoIcone icon="call-outline" rotulo="Ligar" onPress={() => Linking.openURL(`tel:${c.telefone}`)} />
              <BotaoIcone icon="logo-whatsapp" rotulo="WhatsApp" cor={colors.good} fundo={colors.good + '22'} onPress={() => Linking.openURL(linkWhatsApp(c.telefone))} />
            </>
          )}
        </Card>

        {/* Fases */}
        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Badge label={FASES[n.fase].label} color={cor} icon={FASES[n.fase].icon} />
            {n.fase === 'perdido' && !!n.motivo_perda && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{n.motivo_perda}</Text>}
          </View>
          <View style={st.trilha}>
            {etapas.map((f, i) => {
              const feito = n.fase === 'concluido' || (idx >= 0 && i <= idx);
              const atual = f === n.fase;
              const cf = FASES[f];
              return (
                <Pressable key={f} onPress={() => irPara(f)} style={st.etapa} accessibilityLabel={`Mover para ${cf.label}`}>
                  {i > 0 && <View style={[st.linhaEtapa, { backgroundColor: feito ? cf.color : colors.border }]} />}
                  <View style={[st.bola, { borderColor: feito ? cf.color : colors.border, backgroundColor: atual ? cf.color : feito ? cf.color + '33' : colors.bgAlt }]}>
                    <Ionicons name={feito && !atual ? 'checkmark' : cf.icon} size={16} color={atual ? '#fff' : feito ? cf.color : colors.textMuted} />
                  </View>
                  <Text style={[st.etapaTxt, atual && { color: colors.text, fontWeight: '800' }]} numberOfLines={2}>{desktop ? cf.label : cf.curto}</Text>
                </Pressable>
              );
            })}
          </View>
          {ativo(n) && <Text style={st.dica}><Ionicons name="bulb-outline" size={13} color={colors.warning} /> {FASES[n.fase].dica}</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {ant && ativo(n) && <Botao label="Voltar" icon="arrow-back" variante="secundario" compacto onPress={() => tentar(() => moverFase(n, ant))} />}
            {prox && (
              <Botao
                label={prox === 'concluido' ? 'Concluir negócio' : `Avançar: ${FASES[prox].label}`}
                icon={prox === 'concluido' ? 'trophy-outline' : 'arrow-forward'}
                onPress={() => avancar(n)}
                style={{ flex: 1 }}
              />
            )}
            {!ativo(n) && <Botao label="Reabrir atendimento" icon="refresh" onPress={() => tentar(async () => { const r = await moverFase(n, faseAoReabrir(n), 'Reaberto'); if (n.motivo_perda) await salvarNegocio({ id: r.id, motivo_perda: '' }); })} style={{ flex: 1 }} />}
          </View>
          {ativo(n) && !perdendo && (
            <Pressable onPress={() => setPerdendo(true)} style={{ alignSelf: 'center', marginTop: 12 }}>
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Marcar como perdido</Text>
            </Pressable>
          )}
          {perdendo && (
            <View style={{ marginTop: 12 }}>
              <Text style={[st.sub, { marginBottom: 8 }]}>Qual o motivo?</Text>
              <Chips<string> opcoes={MOTIVOS_PERDA.map((m) => ({ value: m, label: m, color: colors.critical }))} valor="" onChange={perder} />
              <Botao label="Cancelar" variante="fantasma" compacto onPress={() => setPerdendo(false)} />
            </View>
          )}
        </Card>

        <View style={desktop ? { flexDirection: 'row', gap: 20, alignItems: 'flex-start' } : undefined}>
          <View style={{ flex: 1 }}>
            <Titulo>Imóvel e valor</Titulo>
            <Card>
              {im ? (
                <Pressable onPress={() => router.push({ pathname: '/imovel/[id]', params: { id: im.id } })} style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{tituloImovel(im)}</Text>
                  <Text style={st.sub}>{[precoPrincipal(im), enderecoImovel(im)].filter(Boolean).join(' · ')}</Text>
                </Pressable>
              ) : null}
              <Seletor
                label={im ? 'Trocar imóvel' : 'Imóvel'}
                valor={n.imovel_id}
                opcional
                onChange={(v) => tentar(() => salvarNegocio({ id: n.id, imovel_id: v }))}
                opcoes={imoveis
                  .filter((i) => (n.tipo === 'venda' ? i.finalidade !== 'aluguel' : i.finalidade !== 'venda'))
                  .map((i) => ({ id: i.id, titulo: tituloImovel(i), sub: precoPrincipal(i), busca: i.codigo }))}
              />
              <Text style={{ color: colors.textSec, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                {n.tipo === 'venda' ? 'Valor negociado (R$)' : 'Aluguel negociado (R$)'}
              </Text>
              <TextInput
                value={valor}
                onChangeText={setValor}
                onBlur={() => parseNumero(valor) !== n.valor && tentar(() => salvarNegocio({ id: n.id, valor: parseNumero(valor) }))}
                keyboardType="decimal-pad"
                placeholder={im ? precoPrincipal(im) : 'Ex.: 430.000'}
                placeholderTextColor={colors.textMuted}
                style={st.input}
              />
              {!!n.valor && im?.preco_venda && n.tipo === 'venda' ? (
                <Text style={[st.sub, { marginTop: 6 }]}>
                  {n.valor < im.preco_venda ? `Desconto de ${fmtMoeda(im.preco_venda - n.valor)} (${(((im.preco_venda - n.valor) / im.preco_venda) * 100).toFixed(1)}%)` : 'No valor anunciado'}
                </Text>
              ) : null}
            </Card>

            {(n.fase === 'negociacao' || n.fase === 'documentacao' || n.fase === 'entrega_chaves' || n.fase === 'concluido') && (
              <>
                <Titulo>{`Documentos (${docsOk}/${docs.length})`}</Titulo>
                <Card style={{ gap: 2 }}>
                  <View style={st.barraDocs}>
                    <View style={[st.barraDocsCheia, { width: `${docs.length ? (docsOk / docs.length) * 100 : 0}%` }]} />
                  </View>
                  {docs.map((d, i) => (
                    <Pressable key={`${d.nome}-${i}`} onPress={() => marcarDoc(i)} style={st.doc}>
                      <Ionicons name={d.ok ? 'checkbox' : 'square-outline'} size={22} color={d.ok ? colors.good : colors.textMuted} />
                      <Text style={[st.docTxt, d.ok && { color: colors.textMuted, textDecorationLine: 'line-through' }]}>{d.nome}</Text>
                    </Pressable>
                  ))}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TextInput value={novoDoc} onChangeText={setNovoDoc} onSubmitEditing={addDoc} placeholder="Outro documento…" placeholderTextColor={colors.textMuted} style={[st.input, { flex: 1 }]} />
                    <Pressable onPress={addDoc} style={st.addBtn} accessibilityLabel="Adicionar documento">
                      <Ionicons name="add" size={20} color="#fff" />
                    </Pressable>
                  </View>
                </Card>
              </>
            )}

            <Titulo acao={{ label: 'Agendar', onPress: () => router.push({ pathname: '/agendamento/editar', params: { negocio: n.id, cliente: n.cliente_id, imovel: n.imovel_id ?? '' } }) }}>
              Compromissos
            </Titulo>
            {compromissos.length === 0 ? (
              <Card><Text style={st.sub}>Nenhum compromisso ligado a este atendimento.</Text></Card>
            ) : (
              compromissos.map((a) => (
                <Card key={a.id} style={st.compromisso} onPress={() => router.push({ pathname: '/agendamento/editar', params: { id: a.id } })}>
                  <Ionicons name={TIPOS_AGENDAMENTO[a.tipo].icon} size={20} color={TIPOS_AGENDAMENTO[a.tipo].color} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{a.titulo || TIPOS_AGENDAMENTO[a.tipo].label}</Text>
                    <Text style={st.sub}>{fmtDataHora(a.inicio)}</Text>
                  </View>
                </Card>
              ))
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Titulo>Linha do tempo</Titulo>
            <Card>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <TextInput
                  value={nota}
                  onChangeText={setNota}
                  placeholder="Registrar retorno, proposta, impressão da visita…"
                  placeholderTextColor={colors.textMuted}
                  style={[st.input, { flex: 1 }]}
                  onSubmitEditing={registrarNota}
                  multiline
                />
                <Pressable onPress={registrarNota} style={st.addBtn} accessibilityLabel="Registrar anotação">
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
              {[...(n.historico ?? [])].reverse().map((h, i) => (
                <View key={i} style={st.evento}>
                  <View style={[st.eventoPonto, { backgroundColor: FASES[h.fase]?.color ?? colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.eventoFase}>{FASES[h.fase]?.label ?? h.fase}</Text>
                    {!!h.nota && <Text style={st.eventoNota}>{h.nota}</Text>}
                    <Text style={st.eventoData}>{fmtDataHora(h.data)}</Text>
                  </View>
                </View>
              ))}
            </Card>
            <Botao label="Excluir atendimento" icon="trash-outline" variante="perigo" compacto onPress={excluir} style={{ marginTop: 20, alignSelf: 'flex-start' }} />
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  cliente: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nome: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.textSec, fontSize: 13 },
  trilha: { flexDirection: 'row' },
  etapa: { flex: 1, alignItems: 'center', gap: 6 },
  linhaEtapa: { position: 'absolute', top: 16, right: '50%', width: '100%', height: 3, borderRadius: 2 },
  bola: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  etapaTxt: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  dica: { color: colors.textSec, fontSize: 13, marginTop: 14, lineHeight: 18 },
  input: {
    backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, color: colors.text,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },
  barraDocs: { height: 6, borderRadius: 3, backgroundColor: colors.bgAlt, overflow: 'hidden', marginBottom: 8 },
  barraDocsCheia: { height: '100%', backgroundColor: colors.good },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  docTxt: { color: colors.text, fontSize: 14, flex: 1 },
  addBtn: { width: 44, minHeight: 42, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  compromisso: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, padding: 12 },
  evento: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  eventoPonto: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  eventoFase: { color: colors.text, fontWeight: '700', fontSize: 14 },
  eventoNota: { color: colors.textSec, fontSize: 14, marginTop: 2, lineHeight: 20 },
  eventoData: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
