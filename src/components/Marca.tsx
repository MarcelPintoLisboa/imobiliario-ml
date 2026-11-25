import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export const NOME_PADRAO = 'Imobiliário ML';
export const LOGO_PADRAO = require('../../assets/logo.png');

/**
 * Logo + nome da imobiliária. Usa o nome e a logo cadastrados em "Minha imobiliária";
 * sem cadastro, mostra o ícone e o nome do app.
 */
export function Marca({
  nome, logo, slogan, tamanho = 40, vertical,
}: {
  nome?: string;
  logo?: string | null;
  slogan?: string;
  tamanho?: number;
  vertical?: boolean;
}) {
  return (
    <View style={[st.linha, vertical && st.vertical]}>
      <LogoMarca logo={logo} tamanho={tamanho} />
      <View style={[{ flexShrink: 1 }, vertical && { alignItems: 'center' }]}>
        <Text style={[st.nome, { fontSize: vertical ? 26 : Math.max(15, tamanho * 0.38) }]} numberOfLines={1}>
          {nome || NOME_PADRAO}
        </Text>
        {!!slogan && (
          <Text style={[st.slogan, vertical && { textAlign: 'center' }]} numberOfLines={vertical ? 2 : 1}>
            {slogan}
          </Text>
        )}
      </View>
    </View>
  );
}

export function LogoMarca({ logo, tamanho = 40 }: { logo?: string | null; tamanho?: number }) {
  const r = tamanho * 0.24;
  if (logo) {
    return (
      <View style={{ width: tamanho, height: tamanho, borderRadius: r, overflow: 'hidden', backgroundColor: '#fff' }}>
        <Image source={{ uri: logo }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
      </View>
    );
  }
  return <Image source={LOGO_PADRAO} style={{ width: tamanho, height: tamanho, borderRadius: r }} contentFit="cover" />;
}

const st = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vertical: { flexDirection: 'column', gap: 14 },
  nome: { color: colors.text, fontWeight: '800', letterSpacing: 0.2 },
  slogan: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
});
