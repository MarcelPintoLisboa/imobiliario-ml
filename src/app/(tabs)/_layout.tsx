import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';
import type { ColorValue } from 'react-native';
import { useDesktop } from '../../lib/desktop';
import { mesmoDia } from '../../lib/format';
import { useDados } from '../../lib/store';
import { colors } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icone = (nome: IconName, ativo: IconName) =>
  function IconeAba({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? ativo : nome} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const { agendamentos } = useDados();
  const desktop = useDesktop();
  const hoje = new Date();
  const pendentesHoje = agendamentos.filter(
    (a) => a.status !== 'cancelado' && a.status !== 'realizado' && mesmoDia(new Date(a.inicio), hoje),
  ).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        // no desktop a navegação fica no menu lateral
        tabBarStyle: desktop ? { display: 'none' } : { backgroundColor: colors.bgAlt, borderTopColor: colors.border, height: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icone('grid-outline', 'grid') }} />
      <Tabs.Screen name="funil" options={{ title: 'Funil', tabBarIcon: icone('git-branch-outline', 'git-branch') }} />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: icone('calendar-outline', 'calendar'),
          tabBarBadge: pendentesHoje || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.pink, color: '#fff', fontWeight: '800' },
        }}
      />
      <Tabs.Screen name="imoveis" options={{ title: 'Portfólio', tabBarIcon: icone('business-outline', 'business') }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais', tabBarIcon: icone('menu-outline', 'menu') }} />
    </Tabs>
  );
}
