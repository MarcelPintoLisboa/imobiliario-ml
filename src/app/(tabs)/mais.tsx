import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { type Href, router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Marca } from '../../components/Marca';
import { Avatar, Card, type IconName } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useConta } from '../../lib/conta';
import { useMargem } from '../../lib/desktop';
import { useDados } from '../../lib/store';
import { colors } from '../../theme';

export default function Mais() {
  const { sair } = useAuth();
  const { nome, email, ehAdmin, ehAdminGeral } = useConta();
  const { empresa, clientes } = useDados();
  const margem = useMargem();

  const itens: { icon: IconName; label: string; sub?: string; href: Href; mostrar?: boolean }[] = [
    { icon: 'people-outline', label: 'Clientes', sub: `${clientes.length} cadastrados`, href: '/clientes' },
    { icon: 'color-palette-outline', label: 'Minha imobiliária', sub: 'Nome, logo e contatos', href: '/empresa', mostrar: ehAdmin },
    {
      icon: 'key-outline', label: ehAdminGeral ? 'Acessos e imobiliárias' : 'Corretores',
      sub: 'Liberar e bloquear acessos', href: '/usuarios', mostrar: ehAdmin,
    },
    { icon: 'lock-closed-outline', label: 'Trocar senha', href: '/senha' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: margem, paddingBottom: 40 }}>
        <Card style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 16 }}>
          <Marca vertical nome={empresa.nome} logo={empresa.logo_url} slogan={empresa.slogan} tamanho={72} />
        </Card>

        <Card style={st.perfil}>
          <Avatar nome={nome || email} tamanho={44} />
          <View style={{ flex: 1 }}>
            <Text style={st.nome}>{nome || 'Corretor'}</Text>
            <Text style={st.email}>{email}</Text>
            <Text style={st.papel}>{ehAdminGeral ? 'Administrador geral' : ehAdmin ? 'Administrador' : 'Corretor'}</Text>
          </View>
        </Card>

        <View style={st.lista}>
          {itens
            .filter((i) => i.mostrar !== false)
            .map((i, idx) => (
              <Pressable key={i.label} onPress={() => router.push(i.href)} style={({ pressed }) => [st.item, idx > 0 && st.divisor, pressed && { opacity: 0.7 }]}>
                <View style={st.icone}>
                  <Ionicons name={i.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.itemTxt}>{i.label}</Text>
                  {!!i.sub && <Text style={st.itemSub}>{i.sub}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
        </View>

        <Pressable
          onPress={() =>
            Alert.alert('Sair da conta', 'Seus dados continuam salvos na nuvem.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: sair },
            ])
          }
          style={({ pressed }) => [st.sair, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.critical} />
          <Text style={{ color: colors.critical, fontWeight: '700', fontSize: 15 }}>Sair da conta</Text>
        </Pressable>

        <Text style={st.versao}>Imobiliário ML · versão {Constants.expoConfig?.version} · ML Softwares</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  nome: { color: colors.text, fontSize: 16, fontWeight: '800' },
  email: { color: colors.textSec, fontSize: 13 },
  papel: { color: colors.cyan, fontSize: 12, fontWeight: '700', marginTop: 2 },
  lista: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  divisor: { borderTopWidth: 1, borderTopColor: colors.border },
  icone: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  itemTxt: { color: colors.text, fontSize: 15, fontWeight: '600' },
  itemSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  sair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, marginTop: 16 },
  versao: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
