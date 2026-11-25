import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { enviarFoto, escolherFotos } from '../lib/fotos';
import { mensagemErro } from '../lib/supabase';
import type { Foto } from '../lib/types';
import { colors, radius } from '../theme';
import { Botao, toque } from './ui';

/**
 * Fotos do imóvel: envia para a nuvem na hora (com progresso), define a capa (primeira foto),
 * reordena e remove. As fotos removidas só são apagadas do armazenamento ao salvar.
 */
export function GaleriaFotos({
  fotos, onChange, dono, pasta,
}: {
  fotos: Foto[];
  onChange: (f: Foto[]) => void;
  dono: string;
  pasta: string;
}) {
  const [enviando, setEnviando] = useState<{ feito: number; total: number } | null>(null);

  const adicionar = async (origem: 'galeria' | 'camera') => {
    try {
      const locais = await escolherFotos(origem);
      if (!locais.length) return;
      setEnviando({ feito: 0, total: locais.length });
      let atual = fotos;
      for (const [i, l] of locais.entries()) {
        const f = await enviarFoto(l, dono, pasta);
        atual = [...atual, f];
        onChange(atual);
        setEnviando({ feito: i + 1, total: locais.length });
      }
    } catch (e) {
      Alert.alert('Não foi possível enviar a foto', mensagemErro(e));
    } finally {
      setEnviando(null);
    }
  };

  const capa = (i: number) => {
    toque();
    const f = [...fotos];
    const [x] = f.splice(i, 1);
    onChange([x!, ...f]);
  };
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= fotos.length) return;
    toque();
    const f = [...fotos];
    [f[i], f[j]] = [f[j]!, f[i]!];
    onChange(f);
  };
  const remover = (i: number) =>
    Alert.alert('Remover foto?', 'A foto sai do portfólio deste imóvel.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => onChange(fotos.filter((_, k) => k !== i)) },
    ]);

  return (
    <View>
      <View style={st.grade}>
        {fotos.map((f, i) => (
          <View key={f.path} style={st.item}>
            <Image source={{ uri: f.url }} style={st.img} contentFit="cover" transition={150} />
            {i === 0 ? (
              <View style={st.capa}>
                <Ionicons name="star" size={11} color="#fff" />
                <Text style={st.capaTxt}>Capa</Text>
              </View>
            ) : (
              <Pressable style={st.capaBtn} onPress={() => capa(i)} accessibilityLabel="Usar como capa" hitSlop={6}>
                <Ionicons name="star-outline" size={14} color="#fff" />
              </Pressable>
            )}
            <Pressable style={st.remover} onPress={() => remover(i)} accessibilityLabel="Remover foto" hitSlop={6}>
              <Ionicons name="close" size={15} color="#fff" />
            </Pressable>
            <View style={st.setas}>
              <Pressable onPress={() => mover(i, -1)} hitSlop={6} accessibilityLabel="Mover para a esquerda" disabled={i === 0}>
                <Ionicons name="chevron-back" size={16} color={i === 0 ? '#ffffff55' : '#fff'} />
              </Pressable>
              <Pressable onPress={() => mover(i, 1)} hitSlop={6} accessibilityLabel="Mover para a direita" disabled={i === fotos.length - 1}>
                <Ionicons name="chevron-forward" size={16} color={i === fotos.length - 1 ? '#ffffff55' : '#fff'} />
              </Pressable>
            </View>
          </View>
        ))}
        {!fotos.length && !enviando && (
          <View style={st.semFotos}>
            <Ionicons name="images-outline" size={28} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Nenhuma foto ainda</Text>
          </View>
        )}
      </View>
      {enviando && (
        <View style={st.progresso}>
          <View style={[st.barra, { width: `${(enviando.feito / enviando.total) * 100}%` }]} />
          <Text style={st.progressoTxt}>
            Enviando {Math.min(enviando.feito + 1, enviando.total)} de {enviando.total}…
          </Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Botao label="Galeria" icon="images-outline" variante="secundario" onPress={() => adicionar('galeria')} style={{ flex: 1 }} desabilitado={!!enviando} />
        {Platform.OS !== 'web' && (
          <Botao label="Câmera" icon="camera-outline" variante="secundario" onPress={() => adicionar('camera')} style={{ flex: 1 }} desabilitado={!!enviando} />
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: { width: 112, height: 112, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.bgAlt },
  img: { width: '100%', height: '100%' },
  capa: {
    position: 'absolute', left: 6, top: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  capaTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  capaBtn: { position: 'absolute', left: 6, top: 6, backgroundColor: '#0009', borderRadius: 12, padding: 4 },
  remover: { position: 'absolute', right: 6, top: 6, backgroundColor: '#000A', borderRadius: 12, padding: 3 },
  setas: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#0008', paddingHorizontal: 6, paddingVertical: 3,
  },
  semFotos: {
    flex: 1, height: 112, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  progresso: { marginTop: 10, height: 26, borderRadius: 13, backgroundColor: colors.bgAlt, overflow: 'hidden', justifyContent: 'center' },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.primary + '66' },
  progressoTxt: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
