import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Linking, Modal, type NativeScrollEvent, type NativeSyntheticEvent, Platform, Pressable, ScrollView, Share, StyleSheet, Text,
  useWindowDimensions, View,
} from 'react-native';
import { Avatar, Badge, Botao, BotaoIcone, Card, Info, Titulo, Vazio } from '../../components/ui';
import { useDesktop, useMargem } from '../../lib/desktop';
import {
  compatibilidade, enderecoImovel, FASES, FINALIDADES, precoPrincipal, STATUS_IMOVEL, textoCompartilhar, TIPOS_IMOVEL, tituloImovel,
} from '../../lib/dominio';
import { fmtMoeda, fmtTelefone, linkWhatsApp, primeiroNome } from '../../lib/format';
import { useDados } from '../../lib/store';
import { colors, radius } from '../../theme';

export default function DetalheImovel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { imovel, clientes, negocios, cliente, empresa } = useDados();
  const desktop = useDesktop();
  const margem = useMargem();
  const { width } = useWindowDimensions();
  const [foto, setFoto] = useState(0);
  const [tela, setTela] = useState<number | null>(null);
  const i = imovel(id);

  const interessados = useMemo(
    () =>
      i
        ? clientes
            .map((c) => ({ c, nota: compatibilidade(c, i) }))
            .filter((x): x is { c: typeof x.c; nota: number } => x.nota !== null && x.nota >= 60)
            .sort((a, b) => b.nota - a.nota)
            .slice(0, 8)
        : [],
    [i, clientes],
  );
  const atendimentos = negocios.filter((n) => n.imovel_id === id);

  if (!i) return <Vazio icon="alert-circle-outline" texto="Imóvel não encontrado." />;

  const larguraFoto = desktop ? Math.min(width - 256 - margem * 2, 1080 - margem * 2) : width;
  const alturaFoto = desktop ? 420 : Math.round(width * 0.72);
  const assinatura = [empresa.nome, empresa.creci && `CRECI ${empresa.creci}`, empresa.telefone].filter(Boolean).join(' · ');

  const compartilhar = () => Share.share({ message: textoCompartilhar(i, assinatura), title: tituloImovel(i) });
  const abrirMapa = () => {
    const q = encodeURIComponent(enderecoImovel(i, true).replace(/ · /g, ', '));
    Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
  };
  const aoRolar = (e: NativeSyntheticEvent<NativeScrollEvent>) => setFoto(Math.round(e.nativeEvent.contentOffset.x / larguraFoto));
  const st_ = STATUS_IMOVEL[i.status];

  return (
    <>
      <Stack.Screen
        options={{
          title: i.codigo ? `Imóvel #${i.codigo}` : 'Imóvel',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <BotaoIcone icon="share-social-outline" rotulo="Compartilhar" onPress={compartilhar} tamanho={36} />
              <BotaoIcone icon="create-outline" rotulo="Editar" onPress={() => router.push({ pathname: '/imovel/editar', params: { id: i.id } })} tamanho={36} />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {i.fotos.length ? (
          <View style={desktop ? { marginHorizontal: margem, marginTop: 8, borderRadius: radius.lg, overflow: 'hidden' } : undefined}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={aoRolar} onScroll={Platform.OS === 'web' ? aoRolar : undefined} scrollEventThrottle={100}>
              {i.fotos.map((f, k) => (
                <Pressable key={f.path} onPress={() => setTela(k)}>
                  <Image source={{ uri: f.url }} style={{ width: larguraFoto, height: alturaFoto }} contentFit="cover" transition={200} />
                </Pressable>
              ))}
            </ScrollView>
            <View style={st.contador}>
              <Ionicons name="images" size={12} color="#fff" />
              <Text style={st.contadorTxt}>{foto + 1}/{i.fotos.length}</Text>
            </View>
          </View>
        ) : (
          <View style={[st.semFoto, { height: alturaFoto * 0.6 }]}>
            <Ionicons name={TIPOS_IMOVEL[i.tipo].icon} size={44} color={colors.textMuted} />
            <Botao label="Adicionar fotos" icon="camera-outline" variante="secundario" compacto onPress={() => router.push({ pathname: '/imovel/editar', params: { id: i.id } })} />
          </View>
        )}

        <View style={{ padding: margem }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <Badge label={st_.label} color={st_.color} icon={st_.icon} />
            <Badge label={FINALIDADES[i.finalidade]} color={colors.primary} />
            <Badge label={TIPOS_IMOVEL[i.tipo].label} color={colors.cyan} icon={TIPOS_IMOVEL[i.tipo].icon} />
          </View>
          <Text style={st.titulo}>{tituloImovel(i)}</Text>
          {!!enderecoImovel(i, true) && (
            <Pressable onPress={abrirMapa} style={st.endereco}>
              <Ionicons name="location" size={15} color={colors.pink} />
              <Text style={st.enderecoTxt}>{enderecoImovel(i, true)}</Text>
              <Ionicons name="open-outline" size={14} color={colors.textMuted} />
            </Pressable>
          )}

          <View style={st.precos}>
            <View>
              <Text style={st.precoLabel}>{i.finalidade === 'aluguel' ? 'Aluguel' : 'Venda'}</Text>
              <Text style={st.preco}>{precoPrincipal(i)}</Text>
            </View>
            {i.finalidade === 'venda_aluguel' && !!i.valor_aluguel && (
              <View>
                <Text style={st.precoLabel}>Aluguel</Text>
                <Text style={[st.preco, { fontSize: 20 }]}>{fmtMoeda(i.valor_aluguel)}/mês</Text>
              </View>
            )}
            {(!!i.condominio || !!i.iptu) && (
              <View>
                <Text style={st.precoLabel}>Condomínio · IPTU</Text>
                <Text style={st.extras}>{fmtMoeda(i.condominio)} · {fmtMoeda(i.iptu)}</Text>
              </View>
            )}
          </View>

          <View style={st.numeros}>
            <Numero icon="resize-outline" valor={i.area_util ? `${i.area_util} m²` : '—'} label="Área útil" />
            <Numero icon="bed-outline" valor={i.quartos ?? '—'} label={i.suites ? `Quartos (${i.suites} suítes)` : 'Quartos'} />
            <Numero icon="water-outline" valor={i.banheiros ?? '—'} label="Banheiros" />
            <Numero icon="car-outline" valor={i.vagas ?? '—'} label="Vagas" />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <Botao label="Enviar ao cliente" icon="logo-whatsapp" onPress={compartilhar} style={{ flex: 1, minWidth: 160 }} />
            <Botao
              label="Agendar visita"
              icon="calendar-outline"
              variante="secundario"
              onPress={() => router.push({ pathname: '/agendamento/editar', params: { imovel: i.id, tipo: 'visita' } })}
              style={{ flex: 1, minWidth: 160 }}
            />
          </View>

          <View style={desktop ? { flexDirection: 'row', gap: 20, alignItems: 'flex-start' } : undefined}>
            <View style={{ flex: 3 }}>
              {!!i.descricao && (
                <>
                  <Titulo>Descrição</Titulo>
                  <Card>
                    <Text style={st.descricao}>{i.descricao}</Text>
                  </Card>
                </>
              )}
              {i.caracteristicas.length > 0 && (
                <>
                  <Titulo>Características</Titulo>
                  <View style={st.itens}>
                    {i.caracteristicas.map((c) => (
                      <View key={c} style={st.item}>
                        <Ionicons name="checkmark-circle" size={15} color={colors.good} />
                        <Text style={st.itemTxt}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              <Titulo>Ficha técnica</Titulo>
              <Card>
                <Info icon="business-outline" label="Empreendimento" valor={i.empreendimento} />
                <Info icon="construct-outline" label="Construtora" valor={i.construtora} />
                <Info icon="expand-outline" label="Área total" valor={i.area_total ? `${i.area_total} m²` : ''} />
                <Info icon="layers-outline" label="Andar" valor={i.andar} />
                <Info icon="calendar-number-outline" label="Ano" valor={i.ano_construcao ? String(i.ano_construcao) : ''} />
                <Info icon="cube-outline" label="Mobiliado" valor={{ '': '', sim: 'Sim', nao: 'Não', semi: 'Semimobiliado' }[i.mobiliado]} />
                <Info icon="navigate-outline" label="Proximidades" valor={i.proximidades.join(', ')} />
              </Card>
              {(!!i.proprietario_nome || !!i.proprietario_telefone) && (
                <>
                  <Titulo>Proprietário</Titulo>
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar nome={i.proprietario_nome || '?'} tamanho={38} cor={colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{i.proprietario_nome || 'Proprietário'}</Text>
                      <Text style={{ color: colors.textSec, fontSize: 13 }}>{fmtTelefone(i.proprietario_telefone)}</Text>
                    </View>
                    {!!i.proprietario_telefone && (
                      <BotaoIcone icon="logo-whatsapp" rotulo="WhatsApp do proprietário" cor={colors.good} fundo={colors.good + '22'} onPress={() => Linking.openURL(linkWhatsApp(i.proprietario_telefone))} />
                    )}
                  </Card>
                </>
              )}
            </View>

            <View style={{ flex: 2 }}>
              <Titulo>Clientes com perfil</Titulo>
              {interessados.length === 0 ? (
                <Card>
                  <Text style={{ color: colors.textSec, fontSize: 13, lineHeight: 19 }}>
                    Nenhum cliente com perfil compatível ainda. Preencha o perfil de busca dos clientes para receber sugestões aqui.
                  </Text>
                </Card>
              ) : (
                interessados.map(({ c, nota }) => (
                  <Card key={c.id} style={st.interessado} onPress={() => router.push({ pathname: '/cliente/[id]', params: { id: c.id } })}>
                    <Avatar nome={c.nome} tamanho={36} cor={colors.good} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{c.nome}</Text>
                      <Text style={{ color: colors.good, fontSize: 12, fontWeight: '700' }}>{nota}% compatível</Text>
                    </View>
                    {!!c.telefone && (
                      <BotaoIcone
                        icon="logo-whatsapp"
                        rotulo={`Oferecer a ${c.nome}`}
                        cor={colors.good}
                        fundo={colors.good + '22'}
                        tamanho={36}
                        onPress={() => Linking.openURL(linkWhatsApp(c.telefone, `Olá, ${primeiroNome(c.nome)}! Separei um imóvel com o seu perfil:\n\n${textoCompartilhar(i, assinatura)}`))}
                      />
                    )}
                  </Card>
                ))
              )}

              {atendimentos.length > 0 && (
                <>
                  <Titulo>Atendimentos</Titulo>
                  {atendimentos.map((n) => (
                    <Card key={n.id} style={st.interessado} onPress={() => router.push({ pathname: '/negocio/[id]', params: { id: n.id } })}>
                      <Ionicons name={FASES[n.fase].icon} size={20} color={FASES[n.fase].color} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{cliente(n.cliente_id)?.nome ?? 'Cliente'}</Text>
                        <Text style={{ color: colors.textSec, fontSize: 12 }}>{FASES[n.fase].label}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </Card>
                  ))}
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={tela !== null} transparent animationType="fade" onRequestClose={() => setTela(null)}>
        <View style={st.telaCheia}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (tela ?? 0) * width, y: 0 }}
          >
            {i.fotos.map((f) => (
              <Image key={f.path} source={{ uri: f.url }} style={{ width, height: '100%' }} contentFit="contain" />
            ))}
          </ScrollView>
          <Pressable onPress={() => setTela(null)} style={st.fechar} accessibilityLabel="Fechar" hitSlop={10}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

function Numero({ icon, valor, label }: { icon: keyof typeof Ionicons.glyphMap; valor: string | number; label: string }) {
  return (
    <View style={st.numero}>
      <Ionicons name={icon} size={20} color={colors.cyan} />
      <Text style={st.numeroValor}>{valor}</Text>
      <Text style={st.numeroLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  contador: {
    position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#000A',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  contadorTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  semFoto: { backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', gap: 12 },
  titulo: { color: colors.text, fontSize: 23, fontWeight: '800', lineHeight: 29 },
  endereco: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  enderecoTxt: { color: colors.textSec, fontSize: 14, flexShrink: 1 },
  precos: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginTop: 16 },
  precoLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  preco: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 2 },
  extras: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 6 },
  numeros: { flexDirection: 'row', gap: 8, marginTop: 16 },
  numero: {
    flex: 1, alignItems: 'center', gap: 3, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  numeroValor: { color: colors.text, fontSize: 16, fontWeight: '800' },
  numeroLabel: { color: colors.textMuted, fontSize: 11 },
  descricao: { color: colors.text, fontSize: 15, lineHeight: 23 },
  itens: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 7,
  },
  itemTxt: { color: colors.text, fontSize: 13, fontWeight: '600' },
  interessado: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, padding: 12 },
  telaCheia: { flex: 1, backgroundColor: '#000' },
  fechar: { position: 'absolute', top: 44, right: 18, backgroundColor: '#0008', borderRadius: 20, padding: 6 },
});
