import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { DitadoVoz } from '../../components/DitadoVoz';
import { Botao, Campo, Card, Chips, Contador, Linha2, Rotulo, Titulo } from '../../components/ui';
import { useMargem } from '../../lib/desktop';
import { ORIGENS, TIPOS_IMOVEL } from '../../lib/dominio';
import { numParaCampo, parseNumero } from '../../lib/format';
import { type ClienteExtraido, estruturarCliente } from '../../lib/ia';
import { useDados } from '../../lib/store';
import { mensagemErro } from '../../lib/supabase';
import type { Interesse, TipoImovel } from '../../lib/types';
import { colors } from '../../theme';

export default function EditarCliente() {
  const { id, voltarPara } = useLocalSearchParams<{ id?: string; voltarPara?: string }>();
  const { cliente, salvarCliente, excluirCliente } = useDados();
  const margem = useMargem();
  const original = cliente(id);

  const [nome, setNome] = useState(original?.nome ?? '');
  const [telefone, setTelefone] = useState(original?.telefone ?? '');
  const [email, setEmail] = useState(original?.email ?? '');
  const [documento, setDocumento] = useState(original?.documento ?? '');
  const [origem, setOrigem] = useState(original?.origem ?? '');
  const [notas, setNotas] = useState(original?.notas ?? '');
  const [interesse, setInteresse] = useState<Interesse>(original?.interesse ?? {});
  const [precoMax, setPrecoMax] = useState(numParaCampo(original?.interesse?.preco_max));
  const [salvando, setSalvando] = useState(false);

  const setI = <K extends keyof Interesse>(k: K, v: Interesse[K]) => setInteresse((x) => ({ ...x, [k]: v }));

  const aplicarIA = (d: ClienteExtraido) => {
    if (d.nome) setNome(d.nome);
    if (d.telefone) setTelefone(d.telefone);
    if (d.email) setEmail(d.email);
    if (d.origem) setOrigem(d.origem);
    if (d.notas) setNotas((n) => [n, d.notas].filter(Boolean).join('\n'));
    const i = d.interesse;
    setInteresse((x) => ({
      finalidade: i.finalidade || x.finalidade,
      tipos: i.tipos?.length ? i.tipos : x.tipos,
      bairros: i.bairros || x.bairros,
      quartos_min: i.quartos_min ?? x.quartos_min,
      preco_max: i.preco_max ?? x.preco_max,
    }));
    if (i.preco_max) setPrecoMax(numParaCampo(i.preco_max));
  };

  const salvar = async () => {
    if (!nome.trim()) return Alert.alert('Faltam dados', 'Informe o nome do cliente.');
    setSalvando(true);
    try {
      const salvo = await salvarCliente({
        ...(id ? { id } : {}),
        nome: nome.trim(), telefone: telefone.trim(), email: email.trim().toLowerCase(), documento: documento.trim(),
        origem: origem.trim(), notas, interesse: { ...interesse, preco_max: parseNumero(precoMax) },
      });
      if (voltarPara === 'negocio') router.back();
      else if (id) router.back();
      else router.replace({ pathname: '/cliente/[id]', params: { id: salvo.id } });
    } catch (e) {
      Alert.alert('Não foi possível salvar', mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = () =>
    Alert.alert('Excluir cliente?', 'Os atendimentos deste cliente também serão apagados.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirCliente(id!);
            router.dismissTo('/clientes');
          } catch (e) {
            Alert.alert('Não foi possível excluir', mensagemErro(e));
          }
        },
      },
    ]);

  const tipos = interesse.tipos ?? [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? 'Editar cliente' : 'Novo cliente' }} />
      <ScrollView contentContainerStyle={{ padding: margem, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {!id && <DitadoVoz<ClienteExtraido> modo="cliente" organizar={estruturarCliente} aoOrganizar={aplicarIA} />}

        <Card>
          <Campo label="Nome *" value={nome} onChangeText={setNome} autoCapitalize="words" />
          <Linha2>
            <Campo label="Telefone / WhatsApp" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholder="(81) 99999-9999" />
            <Campo label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </Linha2>
          <Campo label="CPF / RG" value={documento} onChangeText={setDocumento} />
          <Rotulo>Como chegou</Rotulo>
          <Chips<string> opcoes={ORIGENS.map((o) => ({ value: o, label: o }))} valor={origem} onChange={(v) => setOrigem(v === origem ? '' : v)} />
        </Card>

        <Titulo>O que procura</Titulo>
        <Card>
          <Rotulo>Finalidade</Rotulo>
          <Chips<'' | 'venda' | 'aluguel'>
            opcoes={[
              { value: '', label: 'Indefinido' },
              { value: 'venda', label: 'Comprar' },
              { value: 'aluguel', label: 'Alugar' },
            ]}
            valor={interesse.finalidade ?? ''}
            onChange={(v) => setI('finalidade', v)}
          />
          <Rotulo>Tipos de imóvel</Rotulo>
          <Chips<TipoImovel>
            multiplo
            opcoes={(Object.keys(TIPOS_IMOVEL) as TipoImovel[]).map((t) => ({ value: t, label: TIPOS_IMOVEL[t].label }))}
            valor={tipos}
            onChange={(t) => setI('tipos', tipos.includes(t) ? tipos.filter((x) => x !== t) : [...tipos, t])}
          />
          <Campo label="Bairros de interesse" value={interesse.bairros ?? ''} onChangeText={(v) => setI('bairros', v)} placeholder="Boa Viagem, Pina, Espinheiro" dica="Separe por vírgulas" />
          <Campo
            label={interesse.finalidade === 'aluguel' ? 'Aluguel máximo (R$)' : 'Valor máximo (R$)'}
            value={precoMax}
            onChangeText={setPrecoMax}
            keyboardType="decimal-pad"
          />
          <Contador label="Quartos (mínimo)" icon="bed-outline" valor={interesse.quartos_min ?? null} onChange={(v) => setI('quartos_min', v)} />
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
            Com o perfil preenchido, o app sugere os imóveis compatíveis do portfólio.
          </Text>
        </Card>

        <Titulo>Observações</Titulo>
        <Card>
          <Campo label="Anotações" value={notas} onChangeText={setNotas} multiline placeholder="Financiamento, FGTS, urgência, preferências…" />
        </Card>

        <Botao label="Salvar cliente" icon="checkmark" onPress={salvar} carregando={salvando} style={{ marginTop: 24 }} />
        {!!id && <Botao label="Excluir cliente" icon="trash-outline" variante="perigo" onPress={excluir} style={{ marginTop: 10 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
