import { useEffect, useState } from 'react';
import { Alert, type AlertButton, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

// No web/desktop o Alert.alert do React Native não faz nada. Aqui ele vira um diálogo do próprio
// app, com os mesmos botões, para todas as telas funcionarem igual ao celular.

type Dialogo = { titulo: string; mensagem?: string; botoes: AlertButton[] };

let mostrar: ((d: Dialogo) => void) | null = null;

if (Platform.OS === 'web') {
  Alert.alert = (titulo: string, mensagem?: string, botoes?: AlertButton[]) => {
    const d: Dialogo = { titulo, mensagem, botoes: botoes?.length ? botoes : [{ text: 'OK' }] };
    if (mostrar) mostrar(d);
    else globalThis.alert?.([titulo, mensagem].filter(Boolean).join('\n\n'));
  };
}

export function AlertaWebHost() {
  const [fila, setFila] = useState<Dialogo[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    mostrar = (d) => setFila((f) => [...f, d]);
    return () => {
      mostrar = null;
    };
  }, []);

  if (Platform.OS !== 'web' || !fila.length) return null;
  const atual = fila[0];

  const tocar = (b?: AlertButton) => {
    setFila((f) => f.slice(1));
    // depois de fechar, para que um novo Alert aberto no onPress entre na fila
    if (b?.onPress) setTimeout(() => b.onPress?.(), 0);
  };
  const cancelar = atual.botoes.find((b) => b.style === 'cancel');

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => tocar(cancelar)}>
      <Pressable style={st.fundo} onPress={() => cancelar && tocar(cancelar)}>
        <Pressable style={st.caixa} onPress={() => {}}>
          <Text style={st.titulo}>{atual.titulo}</Text>
          {!!atual.mensagem && <Text style={st.msg}>{atual.mensagem}</Text>}
          <View style={[st.botoes, atual.botoes.length > 2 && { flexDirection: 'column', alignItems: 'stretch' }]}>
            {atual.botoes.map((b, i) => (
              <Pressable
                key={i}
                onPress={() => tocar(b)}
                style={(estado) => {
                  // "hovered" só existe no react-native-web
                  const { hovered, pressed } = estado as typeof estado & { hovered?: boolean };
                  return [st.botao, (hovered || pressed) && { backgroundColor: colors.bgAlt }];
                }}
              >
                <Text
                  style={[
                    st.botaoTxt,
                    b.style === 'cancel' && { color: colors.textSec, fontWeight: '600' },
                    b.style === 'destructive' && { color: colors.critical },
                  ]}
                >
                  {b.text ?? 'OK'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  caixa: {
    width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: radius.lg, padding: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  titulo: { color: colors.text, fontSize: 18, fontWeight: '800' },
  msg: { color: colors.textSec, marginTop: 10, lineHeight: 21 },
  botoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 18 },
  botao: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md },
  botaoTxt: { color: colors.primary, fontWeight: '700', fontSize: 15, textAlign: 'center' },
});
