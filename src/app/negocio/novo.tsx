import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Seletor } from '../../components/Seletor';
import { Botao, Campo, Card, Chips, Rotulo } from '../../components/ui';
import { useMargem } from '../../lib/desktop';
import { compatibilidade, enderecoImovel, FASES, fluxo, precoPrincipal, tituloImovel } from '../../lib/dominio';
import { fmtTelefone, parseNumero } from '../../lib/format';
import { useDados } from '../../lib/store';
import { mensagemErro } from '../../lib/supabase';
import type { Fase } from '../../lib/types';
import { colors } from '../../theme';

export default function NovoNegocio() {
  const params = useLocalSearchParams<{ cliente?: string; imovel?: string }>();
  const { clientes, imoveis, cliente, imovel, salvarNegocio } = useDados();
  const margem = useMargem();
  const [clienteId, setClienteId] = useState<string | null>(params.cliente ?? null);
  const [imovelId, setImovelId] = useState<string | null>(params.imovel || null);
  const [tipo, setTipo] = useState<'venda' | 'aluguel'>(() => {
    const im = imovel(params.imovel);
    const fin = cliente(params.cliente)?.interesse?.finalidade;
    return im?.finalidade === 'aluguel' || fin === 'aluguel' ? 'aluguel' : 'venda';
  });
  const [fase, setFase] = useState<Fase>('primeiro_contato');
  const [valor, setValor] = useState('');
  const [notas, setNotas] = useState('');
  const [salvando, setSalvando] = useState(false);

  // cliente cadastrado a partir desta tela: já fica selecionado ao voltar
  const idsAntes = useRef(new Set(clientes.map((c) => c.id)));
  useEffect(() => {
    const novo = clientes.find((c) => !idsAntes.current.has(c.id));
    if (novo) {
      idsAntes.current.add(novo.id);
      setClienteId(novo.id);
      if (novo.interesse?.finalidade === 'aluguel') setTipo('aluguel');
    }
  }, [clientes]);

  // imóvel captado a partir desta tela: já fica selecionado ao voltar
  const imoveisAntes = useRef(new Set(imoveis.map((i) => i.id)));
  useEffect(() => {
    const novo = imoveis.find((i) => !imoveisAntes.current.has(i.id));
    if (novo) {
      imoveisAntes.current.add(novo.id);
      setImovelId(novo.id);
    }
  }, [imoveis]);

  const c = cliente(clienteId);
  const opcoesImovel = useMemo(
    () =>
      imoveis
        .filter((i) => (tipo === 'venda' ? i.finalidade !== 'aluguel' : i.finalidade !== 'venda') && i.status !== 'inativo')
        .map((i) => ({ i, nota: c ? compatibilidade(c, i) : null }))
        .sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1))
        .map(({ i, nota }) => ({
          id: i.id,
          titulo: tituloImovel(i),
          sub: [precoPrincipal(i), enderecoImovel(i), nota !== null && nota > 0 ? `${nota}% compatível` : ''].filter(Boolean).join(' · '),
          busca: `${i.codigo} ${i.empreendimento}`,
        })),
    [imoveis, tipo, c],
  );

  const salvar = async () => {
    if (!clienteId) return Alert.alert('Faltam dados', 'Escolha ou cadastre o cliente.');
    setSalvando(true);
    try {
      const n = await salvarNegocio({ cliente_id: clienteId, imovel_id: imovelId, tipo, fase, valor: parseNumero(valor), notas });
      router.replace({ pathname: '/negocio/[id]', params: { id: n.id } });
    } catch (e) {
      Alert.alert('Não foi possível salvar', mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: margem, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Seletor
            label="Cliente *"
            valor={clienteId}
            onChange={setClienteId}
            placeholder="Escolher cliente"
            opcoes={clientes.map((x) => ({ id: x.id, titulo: x.nome, sub: fmtTelefone(x.telefone), busca: x.email }))}
            novo={{ label: 'Novo cliente', onPress: () => router.push({ pathname: '/cliente/editar', params: { voltarPara: 'negocio' } }) }}
          />
          <Rotulo>Tipo de negócio</Rotulo>
          <Chips<'venda' | 'aluguel'>
            opcoes={[
              { value: 'venda', label: 'Venda', icon: 'pricetag-outline' },
              { value: 'aluguel', label: 'Aluguel', icon: 'key-outline' },
            ]}
            valor={tipo}
            onChange={(v) => {
              setTipo(v);
              if (!fluxo(v).includes(fase)) setFase('primeiro_contato');
            }}
          />
          <Seletor
            label="Imóvel de interesse"
            valor={imovelId}
            onChange={setImovelId}
            opcional
            placeholder={opcoesImovel.length ? 'Escolher do portfólio (opcional)' : 'Nenhum imóvel para este tipo'}
            opcoes={opcoesImovel}
            novo={{ label: 'Captar imóvel', onPress: () => router.push({ pathname: '/imovel/editar', params: { voltar: '1' } }) }}
          />
          <Campo label={tipo === 'venda' ? 'Valor do negócio (R$)' : 'Aluguel negociado (R$)'} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="Opcional" />
          <Rotulo>Começar na fase</Rotulo>
          <Chips<Fase> opcoes={fluxo(tipo).map((f) => ({ value: f, label: FASES[f].label, color: FASES[f].color, icon: FASES[f].icon }))} valor={fase} onChange={setFase} />
          <Campo label="Anotações" value={notas} onChangeText={setNotas} multiline placeholder="Como foi o primeiro contato, o que o cliente busca…" />
        </Card>
        <Botao label="Abrir atendimento" icon="checkmark" onPress={salvar} carregando={salvando} style={{ marginTop: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
