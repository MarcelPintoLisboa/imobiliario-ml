// Identidade visual tirada do ícone: fundo grafite quase preto, traço em degradê
// ciano → azul → violeta e o ponto magenta como destaque.
export const colors = {
  bg: '#0B0C12',
  bgAlt: '#10111A',
  card: '#151724',
  cardHi: '#1C1F31',
  border: '#262A40',
  primary: '#8B5CF6', // violeta (botões, seleção)
  primaryText: '#FFFFFF',
  cyan: '#22D3EE',
  blue: '#3B82F6',
  purple: '#A855F7',
  pink: '#EC4899', // ponto do ícone (alertas suaves, novidades)
  text: '#F1F2FA',
  textSec: '#A6AAC4',
  textMuted: '#6E7393',
  // Status (sempre acompanhados de ícone + rótulo)
  good: '#22C55E',
  warning: '#F59E0B',
  serious: '#F97316',
  critical: '#EF4444',
};

/** Degradê da marca (mesma direção do ícone: de baixo-esquerda para cima-direita). */
export const gradiente = [colors.cyan, colors.blue, colors.primary, colors.purple] as const;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
