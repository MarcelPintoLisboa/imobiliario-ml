import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DitadoVoz } from '../../components/DitadoVoz';
import { GaleriaFotos } from '../../components/GaleriaFotos';
import { Botao, Campo, Card, Chips, Contador, Linha2, Rotulo, Titulo } from '../../components/ui';
import { useConta } from '../../lib/conta';
import { useMargem } from '../../lib/desktop';
import { CARACTERISTICAS_SUGERIDAS, FINALIDADES, STATUS_IMOVEL, TIPOS_IMOVEL } from '../../lib/dominio';
import { numParaCampo, parseNumero, soDigitos } from '../../lib/format';
import { apagarFotos } from '../../lib/fotos';
import { estruturarImovel, type ImovelExtraido } from '../../lib/ia';
import { useDados } from '../../lib/store';
import { mensagemErro } from '../../lib/supabase';
import type { Finalidade, Foto, Imovel, Mobiliado, StatusImovel, TipoImovel } from '../../lib/types';
import { colors, radius } from '../../theme';

type Rascunho = Omit<Imovel, 'id' | 'criado_em' | 'atualizado_em'>;

const VAZIO: Rascunho = {
  codigo: '', titulo: '', tipo: 'apartamento', finalidade: 'venda', status: 'disponivel', empreendimento: '', construtora: '',
  preco_venda: null, valor_aluguel: null, condominio: null, iptu: null, area_util: null, area_total: null, quartos: null,
  suites: null, banheiros: null, vagas: null, andar: '', ano_construcao: null, mobiliado: '', cep: '', logradouro: '',
  numero: '', complemento: '', bairro: '', cidade: '', uf: '', caracteristicas: [], proximidades: [], descricao: '',
  fotos: [], transcricao: '', proprietario_nome: '', proprietario_telefone: '',
};

// Campos numéricos digitados como texto (para aceitar "450.000", "2.500,50"…)
const NUMERICOS = ['preco_venda', 'valor_aluguel', 'condominio', 'iptu', 'area_util', 'area_total', 'ano_construcao'] as const;
type CampoNum = (typeof NUMERICOS)[number];

const listaDe = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export default function EditarImovel() {
  const { id, voltar } = useLocalSearchParams<{ id?: string; voltar?: string }>();
  const { imovel, salvarImovel, excluirImovel } = useDados();
  const { dono } = useConta();
  const margem = useMargem();
  const original = imovel(id);

  const [f, setF] = useState<Rascunho>(() => (original ? { ...VAZIO, ...original } : VAZIO));
  const [txt, setTxt] = useState<Record<CampoNum, string>>(() =>
    Object.fromEntries(NUMERICOS.map((k) => [k, numParaCampo(original?.[k])])) as Record<CampoNum, string>,
  );
  const [prox, setProx] = useState(() => (original?.proximidades ?? []).join(', '));
  const [novaCarac, setNovaCarac] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [preenchidoIA, setPreenchidoIA] = useState(false);
  const [pasta] = useState(() => `imoveis/${id ?? novoId()}`);

  // fotos enviadas nesta edição e ainda não salvas: apagadas se a tela for abandonada
  const enviadasAgora = useRef<Set<string>>(new Set());
  const salvou = useRef(false);
  useEffect(
    () => () => {
      if (!salvou.current && enviadasAgora.current.size) apagarFotos([...enviadasAgora.current]).catch(() => {});
    },
    [],
  );

  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => setF((x) => ({ ...x, [k]: v }));
  const setNum = (k: CampoNum, v: string) => setTxt((t) => ({ ...t, [k]: v }));

  const mudarFotos = (fotos: Foto[]) => {
    const antes = new Set(f.fotos.map((x) => x.path));
    fotos.forEach((x) => !antes.has(x.path) && !original?.fotos.some((o) => o.path === x.path) && enviadasAgora.current.add(x.path));
    set('fotos', fotos);
  };

  // Resultado do assistente: preenche o que foi dito, sem apagar o que já estava preenchido
  const aplicarIA = (d: ImovelExtraido, texto: string) => {
    setF((x) => {
      const n: Rascunho = { ...x, transcricao: [x.transcricao, texto].filter(Boolean).join('\n\n') };
      (Object.keys(d) as (keyof ImovelExtraido)[]).forEach((k) => {
        const v = d[k];
        if (k === 'caracteristicas') n.caracteristicas = [...new Set([...x.caracteristicas, ...(v as string[])])];
        else if (k !== 'proximidades' && v !== null && v !== '' && !(NUMERICOS as readonly string[]).includes(k)) {
          (n as unknown as Record<string, unknown>)[k] = v;
        }
      });
      return n;
    });
    if (d.proximidades.length) {
      setProx((p) => [...new Set([...listaDe(p), ...d.proximidades])].join(', '));
    }
    setTxt((t) => {
      const n = { ...t };
      NUMERICOS.forEach((k) => {
        if (d[k] !== null && d[k] !== undefined) n[k] = numParaCampo(d[k]);
      });
      return n;
    });
    setPreenchidoIA(true);
  };

  const buscarCep = async (cep: string) => {
    const d = soDigitos(cep);
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) return;
      setF((x) => ({
        ...x,
        logradouro: x.logradouro || j.logradouro || '',
        bairro: x.bairro || j.bairro || '',
        cidade: x.cidade || j.localidade || '',
        uf: x.uf || j.uf || '',
      }));
    } catch {
      // sem internet: o corretor preenche à mão
    }
  };

  const alternarCarac = (c: string) =>
    set('caracteristicas', f.caracteristicas.includes(c) ? f.caracteristicas.filter((x) => x !== c) : [...f.caracteristicas, c]);

  const salvar = async () => {
    const numeros = Object.fromEntries(NUMERICOS.map((k) => [k, parseNumero(txt[k])])) as Record<CampoNum, number | null>;
    if (numeros.ano_construcao !== null) numeros.ano_construcao = Math.round(numeros.ano_construcao);
    if (!f.titulo.trim() && !f.bairro.trim() && !f.empreendimento.trim()) {
      Alert.alert('Faltam dados', 'Informe pelo menos o título, o bairro ou o empreendimento do imóvel.');
      return;
    }
    setSalvando(true);
    try {
      const salvo = await salvarImovel({
        ...(id ? { id } : {}), ...f, ...numeros, proximidades: listaDe(prox), uf: f.uf.toUpperCase().slice(0, 2),
      });
      salvou.current = true;
      // fotos removidas na edição saem do armazenamento
      const removidas = (original?.fotos ?? []).filter((o) => !f.fotos.some((x) => x.path === o.path)).map((o) => o.path);
      apagarFotos(removidas).catch(() => {});
      if (id || voltar) router.back();
      else router.replace({ pathname: '/imovel/[id]', params: { id: salvo.id } });
    } catch (e) {
      Alert.alert('Não foi possível salvar', mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = () =>
    Alert.alert('Excluir imóvel?', 'O imóvel e as fotos serão apagados. Os atendimentos ligados a ele ficam sem imóvel.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirImovel(id!);
            salvou.current = true;
            router.dismissTo('/imoveis');
          } catch (e) {
            Alert.alert('Não foi possível excluir', mensagemErro(e));
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? 'Editar imóvel' : 'Captar imóvel' }} />
      <ScrollView contentContainerStyle={{ padding: margem, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <DitadoVoz<ImovelExtraido> modo="imovel" organizar={estruturarImovel} aoOrganizar={aplicarIA} />
        {preenchidoIA && (
          <View style={st.aviso}>
            <Ionicons name="checkmark-circle" size={18} color={colors.good} />
            <Text style={st.avisoTxt}>Campos preenchidos a partir da sua fala. Revise antes de salvar.</Text>
          </View>
        )}

        <Titulo>Fotos</Titulo>
        <Card>
          {dono ? <GaleriaFotos fotos={f.fotos} onChange={mudarFotos} dono={dono} pasta={pasta} /> : null}
        </Card>

        <Titulo>Dados principais</Titulo>
        <Card>
          <Campo label="Título do anúncio" value={f.titulo} onChangeText={(v) => set('titulo', v)} placeholder="Ex.: Apartamento 3 quartos com varanda em Boa Viagem" />
          <Rotulo>Tipo</Rotulo>
          <Chips<TipoImovel>
            opcoes={(Object.keys(TIPOS_IMOVEL) as TipoImovel[]).map((t) => ({ value: t, label: TIPOS_IMOVEL[t].label }))}
            valor={f.tipo}
            onChange={(v) => set('tipo', v)}
          />
          <Rotulo>Finalidade</Rotulo>
          <Chips<Finalidade>
            opcoes={(Object.keys(FINALIDADES) as Finalidade[]).map((v) => ({ value: v, label: FINALIDADES[v] }))}
            valor={f.finalidade}
            onChange={(v) => set('finalidade', v)}
          />
          <Rotulo>Situação</Rotulo>
          <Chips<StatusImovel>
            opcoes={(Object.keys(STATUS_IMOVEL) as StatusImovel[]).map((v) => ({ value: v, label: STATUS_IMOVEL[v].label, color: STATUS_IMOVEL[v].color }))}
            valor={f.status}
            onChange={(v) => set('status', v)}
          />
          <Linha2>
            <Campo label="Código" value={f.codigo} onChangeText={(v) => set('codigo', v)} placeholder="Ex.: AP-102" autoCapitalize="characters" />
            <Campo label="Empreendimento" value={f.empreendimento} onChangeText={(v) => set('empreendimento', v)} placeholder="Ed. / Condomínio" />
          </Linha2>
          <Campo label="Construtora" value={f.construtora} onChangeText={(v) => set('construtora', v)} />
        </Card>

        <Titulo>Valores</Titulo>
        <Card>
          <Linha2>
            {f.finalidade !== 'aluguel' && (
              <Campo label="Preço de venda (R$)" value={txt.preco_venda} onChangeText={(v) => setNum('preco_venda', v)} keyboardType="decimal-pad" placeholder="450.000" />
            )}
            {f.finalidade !== 'venda' && (
              <Campo label="Aluguel mensal (R$)" value={txt.valor_aluguel} onChangeText={(v) => setNum('valor_aluguel', v)} keyboardType="decimal-pad" placeholder="2.500" />
            )}
          </Linha2>
          <Linha2>
            <Campo label="Condomínio (R$)" value={txt.condominio} onChangeText={(v) => setNum('condominio', v)} keyboardType="decimal-pad" />
            <Campo label="IPTU mensal (R$)" value={txt.iptu} onChangeText={(v) => setNum('iptu', v)} keyboardType="decimal-pad" />
          </Linha2>
        </Card>

        <Titulo>Características</Titulo>
        <Card>
          <Linha2>
            <Campo label="Área útil (m²)" value={txt.area_util} onChangeText={(v) => setNum('area_util', v)} keyboardType="decimal-pad" />
            <Campo label="Área total (m²)" value={txt.area_total} onChangeText={(v) => setNum('area_total', v)} keyboardType="decimal-pad" />
          </Linha2>
          <Contador label="Quartos" icon="bed-outline" valor={f.quartos} onChange={(v) => set('quartos', v)} />
          <Contador label="Suítes" icon="bed" valor={f.suites} onChange={(v) => set('suites', v)} />
          <Contador label="Banheiros" icon="water-outline" valor={f.banheiros} onChange={(v) => set('banheiros', v)} />
          <Contador label="Vagas" icon="car-outline" valor={f.vagas} onChange={(v) => set('vagas', v)} />
          <View style={{ height: 6 }} />
          <Linha2>
            <Campo label="Andar" value={f.andar} onChangeText={(v) => set('andar', v)} placeholder="Ex.: 12º" />
            <Campo label="Ano de construção" value={txt.ano_construcao} onChangeText={(v) => setNum('ano_construcao', v)} keyboardType="number-pad" />
          </Linha2>
          <Rotulo>Mobiliado</Rotulo>
          <Chips<Mobiliado>
            opcoes={[
              { value: '', label: 'Não informado' },
              { value: 'sim', label: 'Sim' },
              { value: 'semi', label: 'Semimobiliado' },
              { value: 'nao', label: 'Não' },
            ]}
            valor={f.mobiliado}
            onChange={(v) => set('mobiliado', v)}
          />
          <Rotulo>Itens do imóvel e do condomínio</Rotulo>
          <Chips<string>
            multiplo
            opcoes={[...new Set([...f.caracteristicas, ...CARACTERISTICAS_SUGERIDAS])].map((c) => ({ value: c, label: c }))}
            valor={f.caracteristicas}
            onChange={alternarCarac}
          />
          <View style={st.addLinha}>
            <TextInput
              value={novaCarac}
              onChangeText={setNovaCarac}
              placeholder="Adicionar outro item…"
              placeholderTextColor={colors.textMuted}
              style={st.addInput}
              onSubmitEditing={() => {
                if (novaCarac.trim()) alternarCarac(novaCarac.trim());
                setNovaCarac('');
              }}
            />
            <Pressable
              onPress={() => {
                if (novaCarac.trim()) alternarCarac(novaCarac.trim());
                setNovaCarac('');
              }}
              style={st.addBtn}
              accessibilityLabel="Adicionar item"
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>
        </Card>

        <Titulo>Endereço</Titulo>
        <Card>
          <Linha2>
            <Campo label="CEP" value={f.cep} onChangeText={(v) => { set('cep', v); buscarCep(v); }} keyboardType="number-pad" placeholder="Busca o endereço" />
            <Campo label="Número" value={f.numero} onChangeText={(v) => set('numero', v)} />
          </Linha2>
          <Campo label="Rua / Avenida" value={f.logradouro} onChangeText={(v) => set('logradouro', v)} />
          <Campo label="Complemento" value={f.complemento} onChangeText={(v) => set('complemento', v)} placeholder="Apto, bloco…" />
          <Campo label="Bairro" value={f.bairro} onChangeText={(v) => set('bairro', v)} />
          <Linha2>
            <Campo label="Cidade" value={f.cidade} onChangeText={(v) => set('cidade', v)} />
            <Campo label="UF" value={f.uf} onChangeText={(v) => set('uf', v.toUpperCase())} maxLength={2} autoCapitalize="characters" />
          </Linha2>
          <Campo
            label="Proximidades"
            value={prox}
            onChangeText={setProx}
            placeholder="Metrô, shopping, escolas…"
            dica="Separe por vírgulas"
          />
        </Card>

        <Titulo>Descrição do anúncio</Titulo>
        <Card>
          <Campo label="Texto para o cliente" value={f.descricao} onChangeText={(v) => set('descricao', v)} multiline placeholder="O assistente escreve este texto a partir da sua fala. Você pode ajustar." style={{ minHeight: 160 }} />
        </Card>

        <Titulo>Proprietário (uso interno)</Titulo>
        <Card>
          <Linha2>
            <Campo label="Nome" value={f.proprietario_nome} onChangeText={(v) => set('proprietario_nome', v)} />
            <Campo label="Telefone" value={f.proprietario_telefone} onChangeText={(v) => set('proprietario_telefone', v)} keyboardType="phone-pad" />
          </Linha2>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Esses dados nunca aparecem no texto compartilhado com clientes.</Text>
        </Card>

        <View style={{ gap: 10, marginTop: 24 }}>
          <Botao label={id ? 'Salvar alterações' : 'Salvar no portfólio'} icon="checkmark" onPress={salvar} carregando={salvando} />
          {!!id && <Botao label="Excluir imóvel" icon="trash-outline" variante="perigo" onPress={excluir} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  aviso: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.good + '18', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.good + '55', padding: 10, marginBottom: 4,
  },
  avisoTxt: { color: colors.text, fontSize: 13, flex: 1 },
  addLinha: { flexDirection: 'row', gap: 8 },
  addInput: {
    flex: 1, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, color: colors.text,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  addBtn: { width: 44, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
