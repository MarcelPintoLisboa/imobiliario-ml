import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { enderecoImovel, FINALIDADES, precoPrincipal, STATUS_IMOVEL, TIPOS_IMOVEL, tituloImovel } from '../lib/dominio';
import type { Imovel } from '../lib/types';
import { colors, radius } from '../theme';
import { emHover } from './ui';

/** Cartão do portfólio com foto de capa, preço e números principais */
export function CartaoImovel({ imovel: i, onPress, nota, compacto }: { imovel: Imovel; onPress: () => void; nota?: number; compacto?: boolean }) {
  const st_ = STATUS_IMOVEL[i.status];
  const altura = compacto ? 120 : 180;
  return (
    <Pressable onPress={onPress} style={(e) => [st.card, emHover(e) && { borderColor: colors.primary + '99' }, e.pressed && { opacity: 0.85 }]}>
      <View style={{ height: altura, backgroundColor: colors.bgAlt }}>
        {i.fotos[0] ? (
          <Image source={{ uri: i.fotos[0].url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <View style={st.semFoto}>
            <Ionicons name={TIPOS_IMOVEL[i.tipo]?.icon ?? 'home-outline'} size={38} color={colors.textMuted} />
          </View>
        )}
        <LinearGradient colors={['transparent', '#000000CC']} style={st.sombra} />
        <View style={st.etiquetas}>
          <View style={[st.etiqueta, { backgroundColor: colors.primary }]}>
            <Text style={st.etiquetaTxt}>{FINALIDADES[i.finalidade]}</Text>
          </View>
          {i.status !== 'disponivel' && (
            <View style={[st.etiqueta, { backgroundColor: st_.color }]}>
              <Text style={st.etiquetaTxt}>{st_.label}</Text>
            </View>
          )}
          {nota !== undefined && (
            <View style={[st.etiqueta, { backgroundColor: colors.good }]}>
              <Text style={st.etiquetaTxt}>{nota}% compatível</Text>
            </View>
          )}
        </View>
        {i.fotos.length > 1 && (
          <View style={st.qtdFotos}>
            <Ionicons name="images" size={11} color="#fff" />
            <Text style={st.etiquetaTxt}>{i.fotos.length}</Text>
          </View>
        )}
        <Text style={st.preco}>{precoPrincipal(i)}</Text>
      </View>
      <View style={st.info}>
        <Text style={st.titulo} numberOfLines={compacto ? 1 : 2}>{tituloImovel(i)}</Text>
        {!!enderecoImovel(i) && (
          <View style={st.linha}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={st.endereco} numberOfLines={1}>{enderecoImovel(i)}</Text>
          </View>
        )}
        <View style={st.numeros}>
          {!!i.area_util && <Numero icon="resize-outline" valor={`${i.area_util} m²`} />}
          {!!i.quartos && <Numero icon="bed-outline" valor={`${i.quartos}${i.suites ? ` (${i.suites}s)` : ''}`} />}
          {!!i.banheiros && <Numero icon="water-outline" valor={String(i.banheiros)} />}
          {!!i.vagas && <Numero icon="car-outline" valor={String(i.vagas)} />}
          {!!i.codigo && <Text style={st.codigo}>#{i.codigo}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

function Numero({ icon, valor }: { icon: keyof typeof Ionicons.glyphMap; valor: string }) {
  return (
    <View style={st.linha}>
      <Ionicons name={icon} size={14} color={colors.cyan} />
      <Text style={st.numero}>{valor}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 12 },
  semFoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  sombra: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 70 },
  etiquetas: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', gap: 6, flexWrap: 'wrap', right: 50 },
  etiqueta: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  etiquetaTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  qtdFotos: {
    position: 'absolute', right: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0009',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  preco: { position: 'absolute', left: 12, bottom: 10, color: '#fff', fontSize: 19, fontWeight: '800' },
  info: { padding: 12, gap: 6 },
  titulo: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  endereco: { color: colors.textSec, fontSize: 13, flex: 1 },
  numeros: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 2 },
  numero: { color: colors.text, fontSize: 13, fontWeight: '600' },
  codigo: { color: colors.textMuted, fontSize: 12, marginLeft: 'auto' },
});
