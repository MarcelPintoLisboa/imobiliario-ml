import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartaoImovel } from '../../components/CartaoImovel';
import { Busca, CabecalhoTela, Chips, Fab, Vazio } from '../../components/ui';
import { useDesktop, useGrade } from '../../lib/desktop';
import { enderecoImovel, TIPOS_IMOVEL, tituloImovel } from '../../lib/dominio';
import { semAcento } from '../../lib/format';
import { useDados } from '../../lib/store';
import { colors } from '../../theme';

type FiltroFin = 'todos' | 'venda' | 'aluguel';
type FiltroStatus = 'disponivel' | 'todos' | 'fechados';

export default function Imoveis() {
  const { imoveis, recarregar } = useDados();
  const desktop = useDesktop();
  const g = useGrade(340);
  const [q, setQ] = useState('');
  const [fin, setFin] = useState<FiltroFin>('todos');
  const [status, setStatus] = useState<FiltroStatus>('disponivel');
  const [atualizando, setAtualizando] = useState(false);

  const lista = useMemo(() => {
    const t = semAcento(q.trim());
    return imoveis.filter((i) => {
      if (fin === 'venda' && i.finalidade === 'aluguel') return false;
      if (fin === 'aluguel' && i.finalidade === 'venda') return false;
      if (status === 'disponivel' && i.status !== 'disponivel' && i.status !== 'reservado') return false;
      if (status === 'fechados' && i.status !== 'vendido' && i.status !== 'alugado') return false;
      if (!t) return true;
      return semAcento(
        `${tituloImovel(i)} ${enderecoImovel(i, true)} ${i.codigo} ${i.empreendimento} ${TIPOS_IMOVEL[i.tipo]?.label} ${i.caracteristicas.join(' ')}`,
      ).includes(t);
    });
  }, [imoveis, q, fin, status]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <FlatList
        {...g.lista}
        data={lista}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[{ paddingTop: 16, paddingBottom: 110 }, g.conteudo]}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={async () => { setAtualizando(true); await recarregar(); setAtualizando(false); }} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: g.cols > 1 ? 6 : 0 }}>
            <CabecalhoTela
              titulo="Portfólio"
              subtitulo={`${imoveis.length} imóve${imoveis.length === 1 ? 'l' : 'is'} cadastrado${imoveis.length === 1 ? '' : 's'}`}
              botao={desktop ? { label: 'Captar imóvel', icon: 'mic', onPress: () => router.push('/imovel/editar') } : undefined}
            />
            <Busca value={q} onChangeText={setQ} placeholder="Bairro, empreendimento, código, característica…" />
            <View style={{ height: 10 }} />
            <Chips<FiltroFin>
              opcoes={[
                { value: 'todos', label: 'Venda e aluguel' },
                { value: 'venda', label: 'Venda', icon: 'pricetag-outline' },
                { value: 'aluguel', label: 'Aluguel', icon: 'key-outline' },
              ]}
              valor={fin}
              onChange={setFin}
            />
            <Chips<FiltroStatus>
              opcoes={[
                { value: 'disponivel', label: 'Disponíveis' },
                { value: 'fechados', label: 'Vendidos/alugados' },
                { value: 'todos', label: 'Todos' },
              ]}
              valor={status}
              onChange={setStatus}
            />
          </View>
        }
        ListEmptyComponent={
          <Vazio
            icon="business-outline"
            texto={imoveis.length ? 'Nenhum imóvel com esses filtros.' : 'Seu portfólio está vazio. Toque em + e descreva o primeiro imóvel por voz — o assistente preenche tudo para você.'}
          />
        }
        renderItem={({ item }) => (
          <View style={g.celula}>
            <CartaoImovel imovel={item} onPress={() => router.push({ pathname: '/imovel/[id]', params: { id: item.id } })} />
          </View>
        )}
      />
      {!desktop && <Fab onPress={() => router.push('/imovel/editar')} icon="mic" label="Captar imóvel" />}
    </SafeAreaView>
  );
}
