import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { TIPOS_AGENDAMENTO } from './dominio';
import { fmtHora } from './format';
import type { Agendamento, Cliente } from './types';

const suportado = Platform.OS !== 'web';
const CANAL = 'agenda';
const CHAVE = 'imobiliario:lembretes';

if (suportado) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function prepararNotificacoes(): Promise<boolean> {
  if (!suportado) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Agenda de visitas e compromissos',
        // eslint-disable-next-line import/namespace -- exportado via export * (falso positivo)
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6',
      });
    }
    const atual = await Notifications.getPermissionsAsync();
    if (atual.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * Mantém os avisos do aparelho iguais à agenda da nuvem: cancela os que o app agendou
 * antes e agenda de novo os próximos compromissos (até 30 dias, máximo 50 avisos).
 */
export async function sincronizarLembretes(agendamentos: Agendamento[], clientes: Cliente[]) {
  if (!suportado) return;
  try {
    const anteriores: string[] = JSON.parse((await AsyncStorage.getItem(CHAVE)) ?? '[]');
    await Promise.all(anteriores.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
    const agora = Date.now();
    const limite = agora + 30 * 86400000;
    const novos: string[] = [];
    const proximos = agendamentos
      .filter((a) => a.lembrete_min > 0 && a.status !== 'cancelado' && a.status !== 'realizado')
      .map((a) => ({ a, quando: new Date(a.inicio).getTime() - a.lembrete_min * 60000 }))
      .filter((x) => x.quando > agora + 5000 && x.quando < limite)
      .slice(0, 50);
    for (const { a, quando } of proximos) {
      const cliente = clientes.find((c) => c.id === a.cliente_id);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${TIPOS_AGENDAMENTO[a.tipo].label} às ${fmtHora(a.inicio)}`,
          body: [a.titulo, cliente?.nome, a.local].filter(Boolean).join(' · '),
          data: { agendamentoId: a.id },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(quando), channelId: CANAL },
      });
      novos.push(id);
    }
    await AsyncStorage.setItem(CHAVE, JSON.stringify(novos));
  } catch {
    // sem permissão de notificação: a agenda continua funcionando normalmente
  }
}
