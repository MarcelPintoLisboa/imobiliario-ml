import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CartaoImovel } from '../../components/CartaoImovel';
import { Avatar, Botao, BotaoIcone, Card, Info, Titulo, Vazio } from '../../components/ui';
import { useDesktop, useMargem } from '../../lib/desktop';
import { FASES, imoveisCompativeis, TIPOS_AGENDAMENTO, TIPOS_IMOVEL, tituloImovel } from '../../lib/dominio';
import { fmtDataHora, fmtMoeda, fmtTelefone, linkWhatsApp } from '../../lib/format';
import { useDados } from '../../lib/store';
import { colors } from '../../theme';

export default function DetalheCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cliente, imoveis, negocios, agendamentos, imovel } = useDados();
  const desktop = useDesktop();
  const margem = useMargem();
  const c = cliente(id);
  const sugestoes = useMemo(() => (c ? imoveisCompativeis(c, imoveis).slice(0, 6) : []), [c, imoveis]);

  if (!c) return <Vazio icon="alert-circle-outline" texto="Cliente não encontrado." />;

  const seus = negocios.filter((n) => n.cliente_id === c.id);
  const compromissos = agendamentos.filter((a) => a.cliente_id === c.id).slice(-5).reverse();
  const p = c.interesse ?? {};
  const perfil = [
    p.finalidade === 'venda' ? 'Comprar' : p.finalidade === 'aluguel' ? 'Alugar' : '',
    p.tipos?.map((t) => TIPOS_IMOVEL[t]?.label).join(', '),
    p.quartos_min ? `${p.quartos_min}+ quartos` : '',
    p.preco_max ? `até ${fmtMoeda(p.preco_max)}` : '',
  ].filter(Boolean);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Cliente',
          headerRight: () => <BotaoIcone icon="create-outline" rotulo="Editar" tamanho={36} onPress={() => router.push({ pathname: '/cliente/editar', params: { id: c.id } })} />,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: margem, paddingBottom: 40 }}>
        <View style={st.topo}>
          <Avatar nome={c.nome} tamanho={64} />
          <View style={{ flex: 1 }}>
            <Text style={st.nome}>{c.nome}</Text>
            <Text style={st.sub}>{[fmtTelefone(c.telefone), c.origem].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          {!!c.telefone && (
            <>
              <Botao label="WhatsApp" icon="logo-whatsapp" onPress={() => Linking.openURL(linkWhatsApp(c.telefone))} style={{ flex: 1 }} />
              <Botao label="Ligar" icon="call-outline" variante="secundario" onPress={() => Linking.openURL(`tel:${c.telefone}`)} style={{ flex: 1 }} />
            </>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Botao label="Novo atendimento" icon="add" variante="secundario" onPress={() => router.push({ pathname: '/negocio/novo', params: { cliente: c.id } })} style={{ flex: 1 }} />
          <Botao label="Agendar" icon="calendar-outline" variante="secundario" onPress={() => router.push({ pathname: '/agendamento/editar', params: { cliente: c.id } })} style={{ flex: 1 }} />
        </View>

        <View style={desktop ? { flexDirection: 'row', gap: 20, alignItems: 'flex-start' } : undefined}>
          <View style={{ flex: 1 }}>
            <Titulo>Perfil de busca</Titulo>
            <Card>
              {perfil.length ? (
                <>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 22 }}>{perfil.join(' · ')}</Text>
                  {!!p.bairros && <Info icon="location-outline" label="Bairros" valor={p.bairros} />}
                </>
              ) : (
                <Text style={{ color: colors.textSec }}>Preencha o perfil para receber sugestões de imóveis.</Text>
              )}
              {!!c.email && <Info icon="mail-outline" label="E-mail" valor={c.email} />}
              {!!c.documento && <Info icon="card-outline" label="Documento" valor={c.documento} />}
              {!!c.notas && <Info icon="document-text-outline" label="Anotações" valor={c.notas} />}
            </Card>

            <Titulo acao={{ label: 'Novo', onPress: () => router.push({ pathname: '/negocio/novo', params: { cliente: c.id } }) }}>Atendimentos</Titulo>
            {seus.length === 0 ? (
              <Card>
                <Text style={{ color: colors.textSec }}>Nenhum atendimento aberto.</Text>
              </Card>
            ) : (
              seus.map((n) => {
                const im = imovel(n.imovel_id);
                return (
                  <Card key={n.id} style={st.linha} onPress={() => router.push({ pathname: '/negocio/[id]', params: { id: n.id } })}>
                    <Ionicons name={FASES[n.fase].icon} size={22} color={FASES[n.fase].color} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.linhaTitulo}>{FASES[n.fase].label} · {n.tipo === 'venda' ? 'Venda' : 'Aluguel'}</Text>
                      <Text style={st.linhaSub} numberOfLines={1}>{im ? tituloImovel(im) : 'Imóvel a definir'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Card>
                );
              })
            )}

            {compromissos.length > 0 && (
              <>
                <Titulo>Compromissos</Titulo>
                {compromissos.map((a) => (
                  <Card key={a.id} style={st.linha} onPress={() => router.push({ pathname: '/agendamento/editar', params: { id: a.id } })}>
                    <Ionicons name={TIPOS_AGENDAMENTO[a.tipo].icon} size={20} color={TIPOS_AGENDAMENTO[a.tipo].color} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.linhaTitulo}>{a.titulo || TIPOS_AGENDAMENTO[a.tipo].label}</Text>
                      <Text style={st.linhaSub}>{fmtDataHora(a.inicio)}</Text>
                    </View>
                  </Card>
                ))}
              </>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Titulo>Imóveis compatíveis</Titulo>
            {sugestoes.length === 0 ? (
              <Card>
                <Text style={{ color: colors.textSec, lineHeight: 20 }}>
                  {perfil.length ? 'Nenhum imóvel do portfólio combina com este perfil no momento.' : 'Sem perfil de busca para comparar.'}
                </Text>
              </Card>
            ) : (
              sugestoes.map(({ imovel: im, nota }) => (
                <CartaoImovel key={im.id} imovel={im} nota={nota} compacto onPress={() => router.push({ pathname: '/imovel/[id]', params: { id: im.id } })} />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nome: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: colors.textSec, fontSize: 14, marginTop: 2 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, padding: 12 },
  linhaTitulo: { color: colors.text, fontWeight: '700' },
  linhaSub: { color: colors.textSec, fontSize: 13, marginTop: 2 },
});
