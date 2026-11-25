import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { CampoData } from '../../components/CampoData';
import { Seletor } from '../../components/Seletor';
import { Botao, Campo, Card, Chips, Rotulo } from '../../components/ui';
import { useConta } from '../../lib/conta';
import { useMargem } from '../../lib/desktop';
import { enderecoImovel, FASES, LEMBRETES, precoPrincipal, STATUS_AGENDAMENTO, TIPOS_AGENDAMENTO, tituloImovel } from '../../lib/dominio';
import { fmtTelefone } from '../../lib/format';
import { useDados } from '../../lib/store';
import { mensagemErro } from '../../lib/supabase';
import type { StatusAgendamento, TipoAgendamento } from '../../lib/types';
import { colors } from '../../theme';

const DURACOES = [30, 60, 90, 120];

const proximaHoraCheia = (base?: string) => {
  const d = base ? new Date(base) : new Date();
  const agora = new Date();
  if (!base || d.toDateString() === agora.toDateString()) {
    d.setHours(agora.getHours() + 1, 0, 0, 0);
  } else d.setHours(10, 0, 0, 0);
  return d.toISOString();
};

export default function EditarAgendamento() {
  const p = useLocalSearchParams<{ id?: string; data?: string; cliente?: string; imovel?: string; negocio?: string; tipo?: TipoAgendamento }>();
  const { agendamentos, clientes, imoveis, negocios, cliente, imovel, salvarAgendamento, excluirAgendamento, moverFase } = useDados();
  const { userId } = useConta();
  const margem = useMargem();
  const original = agendamentos.find((a) => a.id === p.id);

  const [tipo, setTipo] = useState<TipoAgendamento>(original?.tipo ?? p.tipo ?? 'visita');
  const [titulo, setTitulo] = useState(original?.titulo ?? '');
  const [inicio, setInicio] = useState<string | null>(original?.inicio ?? proximaHoraCheia(p.data));
  const [duracao, setDuracao] = useState(original?.duracao_min ?? 60);
  const [clienteId, setClienteId] = useState<string | null>(original?.cliente_id ?? (p.cliente || null));
  const [imovelId, setImovelId] = useState<string | null>(original?.imovel_id ?? (p.imovel || null));
  const negocioId = original?.negocio_id ?? (p.negocio || null);
  const [local, setLocal] = useState(() => {
    if (original) return original.local;
    const im = imovel(p.imovel);
    return im ? enderecoImovel(im, true) : '';
  });
  const [lembrete, setLembrete] = useState(original?.lembrete_min ?? 60);
  const [status, setStatus] = useState<StatusAgendamento>(original?.status ?? 'agendado');
  const [notas, setNotas] = useState(original?.notas ?? '');
  const [salvando, setSalvando] = useState(false);

  // cliente cadastrado a partir desta tela: já fica selecionado ao voltar
  const idsAntes = useRef(new Set(clientes.map((c) => c.id)));
  useEffect(() => {
    const novo = clientes.find((c) => !idsAntes.current.has(c.id));
    if (novo) {
      idsAntes.current.add(novo.id);
      setClienteId(novo.id);
    }
  }, [clientes]);

  const escolherImovel = (id: string | null) => {
    setImovelId(id);
    const im = imovel(id);
    if (im && !local) setLocal(enderecoImovel(im, true));
  };

  const salvar = async () => {
    if (!inicio) return Alert.alert('Faltam dados', 'Escolha a data e a hora.');
    setSalvando(true);
    try {
      await salvarAgendamento({
        ...(p.id ? { id: p.id } : {}),
        tipo, titulo: titulo.trim(), inicio, duracao_min: duracao, cliente_id: clienteId, imovel_id: imovelId, negocio_id: negocioId,
        local: local.trim(), lembrete_min: lembrete, status, notas,
      });
      // Automação do funil: visita marcada → "Agendamento"; visita feita → "Visita"
      const n = negocios.find((x) => x.id === negocioId);
      if (n && tipo === 'visita') {
        if (status === 'realizado' && (n.fase === 'agendamento' || n.fase === 'primeiro_contato')) {
          await moverFase(n, 'visita', 'Visita realizada');
        } else if (status !== 'realizado' && status !== 'cancelado' && n.fase === 'primeiro_contato') {
          await moverFase(n, 'agendamento', 'Visita agendada');
        }
      }
      router.back();
    } catch (e) {
      Alert.alert('Não foi possível salvar', mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = () =>
    Alert.alert('Excluir compromisso?', '', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirAgendamento(p.id!);
            router.back();
          } catch (e) {
            Alert.alert('Não foi possível excluir', mensagemErro(e));
          }
        },
      },
    ]);

  const negocio = negocios.find((x) => x.id === negocioId);
  const deOutro = original && original.corretor_id && original.corretor_id !== userId;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: p.id ? 'Compromisso' : 'Agendar' }} />
      <ScrollView contentContainerStyle={{ padding: margem, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {negocio && (
          <Text style={{ color: colors.textSec, marginBottom: 12 }}>
            Ligado ao atendimento de <Text style={{ color: colors.text, fontWeight: '700' }}>{cliente(negocio.cliente_id)?.nome}</Text> ({FASES[negocio.fase].label})
          </Text>
        )}
        {deOutro && <Text style={{ color: colors.warning, marginBottom: 12 }}>Compromisso de outro corretor da equipe.</Text>}
        <Card>
          <Rotulo>Tipo</Rotulo>
          <Chips<TipoAgendamento>
            opcoes={(Object.keys(TIPOS_AGENDAMENTO) as TipoAgendamento[]).map((t) => ({ value: t, label: TIPOS_AGENDAMENTO[t].label, icon: TIPOS_AGENDAMENTO[t].icon, color: TIPOS_AGENDAMENTO[t].color }))}
            valor={tipo}
            onChange={setTipo}
          />
          <Campo label="Título" value={titulo} onChangeText={setTitulo} placeholder={`Ex.: ${TIPOS_AGENDAMENTO[tipo].label} com o cliente`} />
          <CampoData label="Data e hora" valor={inicio} onChange={setInicio} />
          <Rotulo>Duração</Rotulo>
          <Chips<number> opcoes={DURACOES.map((d) => ({ value: d, label: d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? '30' : ''}` }))} valor={duracao} onChange={setDuracao} />
          <Seletor
            label="Cliente"
            valor={clienteId}
            onChange={setClienteId}
            opcional
            opcoes={clientes.map((c) => ({ id: c.id, titulo: c.nome, sub: fmtTelefone(c.telefone) }))}
            novo={{ label: 'Novo cliente', onPress: () => router.push({ pathname: '/cliente/editar', params: { voltarPara: 'negocio' } }) }}
          />
          <Seletor
            label="Imóvel"
            valor={imovelId}
            onChange={escolherImovel}
            opcional
            opcoes={imoveis.map((i) => ({ id: i.id, titulo: tituloImovel(i), sub: [precoPrincipal(i), enderecoImovel(i)].filter(Boolean).join(' · '), busca: i.codigo }))}
          />
          <Campo label="Local" value={local} onChangeText={setLocal} placeholder="Endereço ou ponto de encontro" />
          <Rotulo>Lembrete no celular</Rotulo>
          <Chips<number> opcoes={LEMBRETES} valor={lembrete} onChange={setLembrete} />
          {!!p.id && (
            <>
              <Rotulo>Situação</Rotulo>
              <Chips<StatusAgendamento>
                opcoes={(Object.keys(STATUS_AGENDAMENTO) as StatusAgendamento[]).map((s) => ({ value: s, label: STATUS_AGENDAMENTO[s].label, color: STATUS_AGENDAMENTO[s].color, icon: STATUS_AGENDAMENTO[s].icon }))}
                valor={status}
                onChange={setStatus}
              />
            </>
          )}
          <Campo label="Anotações" value={notas} onChangeText={setNotas} multiline placeholder="Pontos de atenção, chaves com o porteiro…" />
        </Card>
        <Botao label={p.id ? 'Salvar' : 'Agendar'} icon="checkmark" onPress={salvar} carregando={salvando} style={{ marginTop: 20 }} />
        {!!p.id && <Botao label="Excluir compromisso" icon="trash-outline" variante="perigo" onPress={excluir} style={{ marginTop: 10 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
