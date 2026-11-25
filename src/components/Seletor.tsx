import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { semAcento } from '../lib/format';
import { colors, radius } from '../theme';
import { Botao, Busca, s as ui } from './ui';

export interface OpcaoSeletor {
  id: string;
  titulo: string;
  sub?: string;
  /** texto extra usado na busca */
  busca?: string;
}

/** Campo que abre uma lista com busca para escolher um cliente, imóvel etc. */
export function Seletor({
  label, valor, opcoes, onChange, placeholder = 'Selecionar', novo, opcional,
}: {
  label: string;
  valor: string | null;
  opcoes: OpcaoSeletor[];
  onChange: (id: string | null) => void;
  placeholder?: string;
  novo?: { label: string; onPress: () => void };
  opcional?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState('');
  const atual = opcoes.find((o) => o.id === valor);
  const filtradas = useMemo(() => {
    const t = semAcento(q.trim());
    if (!t) return opcoes;
    return opcoes.filter((o) => semAcento(`${o.titulo} ${o.sub ?? ''} ${o.busca ?? ''}`).includes(t));
  }, [q, opcoes]);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={ui.label}>{label}</Text>
      <Pressable onPress={() => setAberto(true)} style={[ui.input, st.campo]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: atual ? colors.text : colors.textMuted, fontSize: 15 }} numberOfLines={1}>
            {atual?.titulo ?? placeholder}
          </Text>
          {!!atual?.sub && <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{atual.sub}</Text>}
        </View>
        {opcional && atual ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityLabel="Limpar">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        )}
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable style={st.fundo} onPress={() => setAberto(false)}>
          <Pressable style={st.caixa} onPress={() => {}}>
            <Text style={st.titulo}>{label}</Text>
            <Busca value={q} onChangeText={setQ} placeholder="Buscar…" />
            <FlatList
              data={filtradas}
              keyExtractor={(o) => o.id}
              style={{ marginTop: 10, maxHeight: 380 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>Nada encontrado.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.id);
                    setAberto(false);
                    setQ('');
                  }}
                  style={({ pressed }) => [st.item, item.id === valor && { backgroundColor: colors.primary + '22' }, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{item.titulo}</Text>
                    {!!item.sub && <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{item.sub}</Text>}
                  </View>
                  {item.id === valor && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              )}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Botao label="Fechar" variante="secundario" onPress={() => setAberto(false)} style={{ flex: 1 }} />
              {novo && (
                <Botao
                  label={novo.label}
                  icon="add"
                  onPress={() => {
                    setAberto(false);
                    novo.onPress();
                  }}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  campo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fundo: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: 20 },
  caixa: {
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16,
    maxWidth: 480, width: '100%', alignSelf: 'center',
  },
  titulo: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: radius.sm },
});
