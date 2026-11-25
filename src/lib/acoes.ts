import { router } from 'expo-router';
import { Alert } from 'react-native';
import { agendamentoDaFase, FASES, proximaFase } from './dominio';
import { useDados } from './store';
import { mensagemErro } from './supabase';
import type { Negocio } from './types';

/** Avança o atendimento para a próxima fase do funil, oferecendo os próximos passos. */
export function useAvancarFase() {
  const { moverFase, cliente } = useDados();
  return (n: Negocio) => {
    const prox = proximaFase(n);
    if (!prox) return;
    const nomeCliente = cliente(n.cliente_id)?.nome ?? 'o cliente';
    const mover = async () => {
      try {
        await moverFase(n, prox);
        // fases com compromisso: já oferece agendar
        if (prox === 'agendamento' || prox === 'documentacao' || prox === 'entrega_chaves') {
          const tipo = agendamentoDaFase(prox === 'agendamento' ? 'visita' : prox);
          Alert.alert(
            FASES[prox].label,
            prox === 'agendamento' ? `Agendar a visita com ${nomeCliente} agora?` : `Marcar ${prox === 'documentacao' ? 'a assinatura' : 'a entrega das chaves'} na agenda?`,
            [
              { text: 'Depois', style: 'cancel' },
              {
                text: 'Agendar',
                onPress: () =>
                  router.push({
                    pathname: '/agendamento/editar',
                    params: { negocio: n.id, cliente: n.cliente_id, imovel: n.imovel_id ?? '', tipo },
                  }),
              },
            ],
          );
        }
      } catch (e) {
        Alert.alert('Não foi possível mover', mensagemErro(e));
      }
    };
    if (prox === 'concluido') {
      Alert.alert('Concluir negócio?', `Marcar o atendimento de ${nomeCliente} como concluído (chaves entregues)?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Concluir', onPress: mover },
      ]);
    } else mover();
  };
}
