import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { type Href, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useConta } from '../lib/conta';
import { LARGURA_MENU } from '../lib/desktop';
import { ativo as negocioAtivo } from '../lib/dominio';
import { mesmoDia } from '../lib/format';
import { useDados } from '../lib/store';
import { colors, radius } from '../theme';
import { Marca } from './Marca';
import { Avatar, Botao, emHover, type IconName } from './ui';

type Item = { rotulo: string; icone: IconName; href: Href; ativoEm: string[]; badge?: number };

// Menu lateral do layout desktop (substitui as abas de baixo do celular)
export function MenuLateral() {
  const caminho = usePathname();
  const { sair } = useAuth();
  const { ehAdmin, ehAdminGeral, email, nome } = useConta();
  const { empresa, agendamentos, negocios } = useDados();

  const hoje = new Date();
  const agendaHoje = agendamentos.filter((a) => a.status !== 'cancelado' && a.status !== 'realizado' && mesmoDia(new Date(a.inicio), hoje)).length;
  const ativos = negocios.filter(negocioAtivo).length;

  const principais: Item[] = [
    { rotulo: 'Início', icone: 'grid-outline', href: '/', ativoEm: ['/'] },
    { rotulo: 'Funil de clientes', icone: 'git-branch-outline', href: '/funil', ativoEm: ['/funil', '/negocio'], badge: ativos },
    { rotulo: 'Agenda', icone: 'calendar-outline', href: '/agenda', ativoEm: ['/agenda', '/agendamento'], badge: agendaHoje },
    { rotulo: 'Portfólio', icone: 'business-outline', href: '/imoveis', ativoEm: ['/imoveis', '/imovel'] },
    { rotulo: 'Clientes', icone: 'people-outline', href: '/clientes', ativoEm: ['/clientes', '/cliente'] },
  ];
  const gestao: Item[] = ehAdmin
    ? [
        { rotulo: 'Minha imobiliária', icone: 'color-palette-outline', href: '/empresa', ativoEm: ['/empresa'] },
        { rotulo: ehAdminGeral ? 'Acessos e imobiliárias' : 'Corretores', icone: 'key-outline', href: '/usuarios', ativoEm: ['/usuarios'] },
      ]
    : [];

  const marcado = (i: Item) => i.ativoEm.some((p) => (p === '/' ? caminho === '/' : caminho.startsWith(p)));

  // Atalhos de teclado do desktop
  useEffect(() => {
    const doc = globalThis.document;
    if (!doc) return;
    const ir: Record<string, Href> = { F2: '/imovel/editar', F3: '/negocio/novo', F4: '/cliente/editar', F6: '/agendamento/editar' };
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || !ir[e.key]) return;
      e.preventDefault();
      router.push(ir[e.key]!);
    };
    doc.addEventListener('keydown', tecla);
    return () => doc.removeEventListener('keydown', tecla);
  }, []);

  const confirmarSaida = () =>
    Alert.alert('Sair da conta', 'Seus dados continuam salvos na nuvem.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);

  return (
    <View style={st.menu}>
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <Marca nome={empresa.nome} logo={empresa.logo_url} slogan={empresa.slogan || (empresa.creci ? `CRECI ${empresa.creci}` : '')} tamanho={40} />
      </View>

      <View style={{ paddingHorizontal: 12, marginBottom: 14, gap: 8 }}>
        <Botao label="Novo atendimento" icon="add" compacto onPress={() => router.push('/negocio/novo')} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Botao label="Imóvel" icon="mic-outline" compacto variante="secundario" onPress={() => router.push('/imovel/editar')} style={{ flex: 1 }} />
          <Botao label="Visita" icon="calendar-outline" compacto variante="secundario" onPress={() => router.push('/agendamento/editar')} style={{ flex: 1 }} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
        {principais.map((i) => <ItemMenu key={i.rotulo} item={i} ativo={marcado(i)} />)}
        {gestao.length > 0 && <Text style={st.secao}>Administração</Text>}
        {gestao.map((i) => <ItemMenu key={i.rotulo} item={i} ativo={marcado(i)} />)}
        <Text style={st.secao}>Conta</Text>
        <ItemMenu item={{ rotulo: 'Trocar senha', icone: 'lock-closed-outline', href: '/senha', ativoEm: ['/senha'] }} ativo={caminho.startsWith('/senha')} />
        <Text style={st.atalhos}>Atalhos: F2 imóvel · F3 atendimento · F4 cliente · F6 agendar</Text>
      </ScrollView>

      <View style={st.conta}>
        <Avatar nome={nome || email} tamanho={34} />
        <View style={{ flex: 1 }}>
          <Text style={st.email} numberOfLines={1}>{nome || email}</Text>
          <Text style={st.papel}>
            {ehAdminGeral ? 'Administrador geral' : ehAdmin ? 'Administrador' : 'Corretor'} · v{Constants.expoConfig?.version}
          </Text>
        </View>
        <Pressable onPress={confirmarSaida} hitSlop={8} accessibilityLabel="Sair">
          <Ionicons name="log-out-outline" size={20} color={colors.textSec} />
        </Pressable>
      </View>
    </View>
  );
}

function ItemMenu({ item, ativo }: { item: Item; ativo: boolean }) {
  return (
    <Pressable onPress={() => router.navigate(item.href)} style={(e) => [st.item, ativo ? st.itemAtivo : emHover(e) && st.itemHover]}>
      {ativo && <View style={st.marcador} />}
      <Ionicons name={item.icone} size={19} color={ativo ? colors.text : colors.textSec} />
      <Text style={[st.itemTxt, ativo && { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>{item.rotulo}</Text>
      {!!item.badge && (
        <View style={st.badge}>
          <Text style={st.badgeTxt}>{item.badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  menu: { width: LARGURA_MENU, backgroundColor: colors.bgAlt, borderRightWidth: 1, borderRightColor: colors.border, paddingTop: 18 },
  secao: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16,
    marginBottom: 4, paddingHorizontal: 20,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 12, marginHorizontal: 8, borderRadius: radius.md },
  itemAtivo: { backgroundColor: colors.primary + '26' },
  itemHover: { backgroundColor: colors.card },
  marcador: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, backgroundColor: colors.cyan },
  itemTxt: { color: colors.textSec, fontSize: 14, flex: 1 },
  badge: { minWidth: 20, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  atalhos: { color: colors.textMuted, fontSize: 11, lineHeight: 16, paddingHorizontal: 20, marginTop: 14 },
  conta: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.border },
  email: { color: colors.text, fontSize: 13, fontWeight: '600' },
  papel: { color: colors.textMuted, fontSize: 11 },
});
