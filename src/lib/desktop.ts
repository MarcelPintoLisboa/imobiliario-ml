import { Platform, useWindowDimensions } from 'react-native';

/** Largura a partir da qual o app usa o layout desktop (menu lateral, grades). */
export const LARGURA_DESKTOP = 900;
export const LARGURA_MENU = 256;

/** true no desktop/navegador com janela larga. No celular, sempre false. */
export function useDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= LARGURA_DESKTOP;
}

/** Quantas colunas cabem nas listas em grade (1 no celular). */
export function useColunas(larguraItem = 380) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < LARGURA_DESKTOP) return 1;
  const util = width - LARGURA_MENU - 56;
  return Math.max(1, Math.min(4, Math.floor(util / larguraItem)));
}

/**
 * Lista em grade no desktop (1 coluna no celular). Uso:
 *   const g = useGrade();
 *   <FlatList {...g.lista} contentContainerStyle={[..., g.conteudo]} renderItem={(x) => <View style={g.celula}>…</View>} />
 */
export function useGrade(larguraItem = 380) {
  const cols = useColunas(larguraItem);
  const margem = useMargem();
  const grade = cols > 1;
  return {
    cols,
    lista: { key: `grade-${cols}`, numColumns: cols },
    celula: grade ? ({ width: `${100 / cols}%`, paddingHorizontal: 6 } as const) : undefined,
    conteudo: { paddingHorizontal: grade ? margem - 6 : margem },
  };
}

/** Espaçamento lateral das telas. */
export function useMargem() {
  return useDesktop() ? 28 : 16;
}

/** Mouse em cima do item (só existe no desktop/navegador). Uso: style={(e) => [st.x, emHover(e) && st.hover]} */
export const emHover = (e: object) => !!(e as { hovered?: boolean }).hovered;
