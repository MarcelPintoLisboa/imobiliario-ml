import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { DIAS_SEMANA, fmtData, fmtDataHora, MESES_LONGOS, mesmoDia } from '../lib/format';
import { colors, radius } from '../theme';
import { Botao, s as ui, toque } from './ui';

/** Seletor de data/hora próprio — funciona igual em Android, iOS e web, sem módulos nativos extras. */
export function CampoData({
  label,
  valor,
  onChange,
  comHora = true,
  opcional = false,
}: {
  label: string;
  valor: string | null;
  onChange: (iso: string | null) => void;
  comHora?: boolean;
  opcional?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const base = valor ? new Date(valor) : new Date();
  const [sel, setSel] = useState(base);
  const [mes, setMes] = useState(new Date(base.getFullYear(), base.getMonth(), 1));

  const abrir = () => {
    const b = valor ? new Date(valor) : (() => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d; })();
    setSel(b);
    setMes(new Date(b.getFullYear(), b.getMonth(), 1));
    setAberto(true);
  };

  const inicio = mes.getDay();
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array(inicio).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  while (celulas.length % 7) celulas.push(null);
  const hoje = new Date();

  const ajustar = (campo: 'h' | 'm', delta: number) => {
    toque();
    const d = new Date(sel);
    if (campo === 'h') d.setHours((d.getHours() + delta + 24) % 24);
    else d.setMinutes((Math.round(d.getMinutes() / 5) * 5 + delta + 60) % 60);
    setSel(d);
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={ui.label}>{label}</Text>
      <Pressable onPress={abrir} style={[ui.input, st.campo]}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={{ color: valor ? colors.text : colors.textMuted, fontSize: 15, flex: 1 }}>
          {valor ? (comHora ? fmtDataHora(valor) : fmtData(valor)) : 'Selecionar'}
        </Text>
        {opcional && valor && (
          <Pressable onPress={() => onChange(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable style={st.fundo} onPress={() => setAberto(false)}>
          <Pressable style={st.caixa} onPress={() => {}}>
            <View style={st.mesRow}>
              <Pressable hitSlop={12} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>
                <Ionicons name="chevron-back" size={22} color={colors.primary} />
              </Pressable>
              <Text style={st.mesTxt}>
                {MESES_LONGOS[mes.getMonth()]} {mes.getFullYear()}
              </Text>
              <Pressable hitSlop={12} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>
                <Ionicons name="chevron-forward" size={22} color={colors.primary} />
              </Pressable>
            </View>
            <View style={st.grade}>
              {DIAS_SEMANA.map((d) => (
                <Text key={d} style={st.diaSemana}>
                  {d[0]}
                </Text>
              ))}
              {celulas.map((dia, i) => {
                if (!dia) return <View key={i} style={st.celula} />;
                const data = new Date(mes.getFullYear(), mes.getMonth(), dia);
                const ativo = mesmoDia(data, sel);
                const ehHoje = mesmoDia(data, hoje);
                return (
                  <Pressable
                    key={i}
                    style={st.celula}
                    onPress={() => {
                      toque();
                      const d = new Date(sel);
                      d.setFullYear(data.getFullYear(), data.getMonth(), dia);
                      setSel(d);
                    }}
                  >
                    <View style={[st.dia, ativo && st.diaAtivo, !ativo && ehHoje && st.diaHoje]}>
                      <Text style={[st.diaTxt, ativo && { color: '#fff', fontWeight: '800' }]}>{dia}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {comHora && (
              <View style={st.horaRow}>
                {(['h', 'm'] as const).map((c) => (
                  <View key={c} style={st.horaBox}>
                    <Pressable hitSlop={8} onPress={() => ajustar(c, c === 'h' ? 1 : 5)}>
                      <Ionicons name="chevron-up" size={22} color={colors.primary} />
                    </Pressable>
                    <Text style={st.horaTxt}>
                      {String(c === 'h' ? sel.getHours() : sel.getMinutes()).padStart(2, '0')}
                    </Text>
                    <Pressable hitSlop={8} onPress={() => ajustar(c, c === 'h' ? -1 : -5)}>
                      <Ionicons name="chevron-down" size={22} color={colors.primary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Botao label="Cancelar" variante="secundario" onPress={() => setAberto(false)} style={{ flex: 1 }} />
              <Botao
                label="Confirmar"
                onPress={() => {
                  const d = new Date(sel);
                  if (!comHora) d.setHours(12, 0, 0, 0);
                  d.setSeconds(0, 0);
                  onChange(d.toISOString());
                  setAberto(false);
                }}
                style={{ flex: 1 }}
              />
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
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  mesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  mesTxt: { color: colors.text, fontSize: 16, fontWeight: '700' },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  diaSemana: { width: `${100 / 7}%`, textAlign: 'center', color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  celula: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dia: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  diaAtivo: { backgroundColor: colors.primary },
  diaHoje: { borderWidth: 1, borderColor: colors.primary },
  diaTxt: { color: colors.text, fontSize: 14 },
  horaRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 12 },
  horaBox: { alignItems: 'center', backgroundColor: colors.bgAlt, borderRadius: radius.md, paddingVertical: 6, width: 80 },
  horaTxt: { color: colors.text, fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
