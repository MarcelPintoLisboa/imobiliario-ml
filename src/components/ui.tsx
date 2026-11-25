import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator, Platform, Pressable, type PressableStateCallbackType, type StyleProp, StyleSheet, Text, TextInput,
  type TextInputProps, View, type ViewStyle,
} from 'react-native';
import { useDesktop } from '../lib/desktop';
import { iniciais } from '../lib/format';
import { colors, gradiente, radius, space } from '../theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export const toque = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/** "hovered" só existe no react-native-web (desktop/navegador) */
export const emHover = (e: PressableStateCallbackType) => !!(e as PressableStateCallbackType & { hovered?: boolean }).hovered;

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={(e) => [s.card, style, emHover(e) && { borderColor: colors.primary + '88' }, e.pressed && { opacity: 0.8 }]}
    >
      {children}
    </Pressable>
  );
}

/** Título da tela com botão principal (no desktop o botão fica à direita). */
export function CabecalhoTela({
  titulo, subtitulo, botao, children,
}: {
  titulo: string;
  subtitulo?: string;
  botao?: { label: string; icon: IconName; onPress: () => void };
  children?: React.ReactNode;
}) {
  const desktop = useDesktop();
  return (
    <View style={[s.cabecalho, desktop && { flexDirection: 'row', alignItems: 'center' }]}>
      <View style={{ flex: desktop ? 1 : undefined }}>
        <Text style={s.h1}>{titulo}</Text>
        {!!subtitulo && <Text style={s.sub}>{subtitulo}</Text>}
      </View>
      {children}
      {botao && <Botao label={botao.label} icon={botao.icon} onPress={botao.onPress} style={desktop ? { paddingHorizontal: 22 } : { marginTop: 12 }} />}
    </View>
  );
}

export function Titulo({ children, acao }: { children: React.ReactNode; acao?: { label: string; onPress: () => void } }) {
  return (
    <View style={s.tituloRow}>
      <Text style={s.titulo}>{children}</Text>
      {acao && (
        <Pressable onPress={acao.onPress} hitSlop={10}>
          <Text style={s.tituloAcao}>{acao.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Botao({
  label, onPress, icon, variante = 'primario', style, carregando, desabilitado, compacto,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variante?: 'primario' | 'secundario' | 'perigo' | 'fantasma';
  style?: ViewStyle;
  carregando?: boolean;
  desabilitado?: boolean;
  compacto?: boolean;
}) {
  const cor =
    variante === 'primario' ? colors.primaryText : variante === 'perigo' ? colors.critical : variante === 'fantasma' ? colors.textSec : colors.text;
  const conteudo = carregando ? (
    <ActivityIndicator color={cor} />
  ) : (
    <>
      {icon && <Ionicons name={icon} size={compacto ? 16 : 18} color={variante === 'secundario' ? colors.primary : cor} />}
      <Text style={[s.botaoTxt, { color: cor }, compacto && { fontSize: 13 }]}>{label}</Text>
    </>
  );
  return (
    <Pressable
      disabled={carregando || desabilitado}
      onPress={() => {
        toque();
        onPress();
      }}
      style={(e) => [
        s.botao,
        compacto && s.botaoCompacto,
        variante === 'secundario' && { borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card },
        variante === 'perigo' && { borderColor: colors.critical + '88', borderWidth: 1 },
        emHover(e) && variante !== 'primario' && { backgroundColor: colors.cardHi },
        emHover(e) && variante === 'primario' && { opacity: 0.9 },
        (e.pressed || desabilitado) && { opacity: 0.6 },
        style,
      ]}
    >
      {variante === 'primario' && (
        <LinearGradient colors={gradiente} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]} />
      )}
      {conteudo}
    </Pressable>
  );
}

/** Botão redondo só com ícone (WhatsApp, ligar, editar…) */
export function BotaoIcone({ icon, onPress, cor = colors.text, fundo = colors.cardHi, rotulo, tamanho = 40 }: {
  icon: IconName; onPress: () => void; cor?: string; fundo?: string; rotulo: string; tamanho?: number;
}) {
  return (
    <Pressable
      onPress={() => {
        toque();
        onPress();
      }}
      accessibilityLabel={rotulo}
      hitSlop={6}
      style={(e) => [
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: fundo, alignItems: 'center', justifyContent: 'center' },
        (e.pressed || emHover(e)) && { opacity: 0.75 },
      ]}
    >
      <Ionicons name={icon} size={tamanho * 0.48} color={cor} />
    </Pressable>
  );
}

export function Campo({ label, dica, ...props }: TextInputProps & { label: string; dica?: string }) {
  return (
    <View style={{ marginBottom: space.md, flex: (props.style as ViewStyle)?.flex }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[s.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style, { flex: undefined }]}
      />
      {!!dica && <Text style={s.dica}>{dica}</Text>}
    </View>
  );
}

/** Dois ou três campos lado a lado */
export function Linha2({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{React.Children.map(children, (c) => <View style={{ flex: 1 }}>{c}</View>)}</View>;
}

export function Rotulo({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Chips<T extends string | number>({
  opcoes, valor, onChange, multiplo,
}: {
  opcoes: { value: T; label: string; color?: string; icon?: IconName }[];
  valor: T | T[];
  onChange: (v: T) => void;
  multiplo?: boolean;
}) {
  const sel = (v: T) => (multiplo ? (valor as T[]).includes(v) : valor === v);
  return (
    <View style={s.chips}>
      {opcoes.map((o) => {
        const ativo = sel(o.value);
        const cor = o.color ?? colors.primary;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              toque();
              onChange(o.value);
            }}
            style={(e) => [s.chip, ativo && { backgroundColor: cor + '2A', borderColor: cor }, !ativo && emHover(e) && { borderColor: colors.textMuted }]}
          >
            {o.icon && <Ionicons name={o.icon} size={14} color={ativo ? cor : colors.textMuted} />}
            <Text style={[s.chipTxt, ativo && { color: colors.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({ label, color, icon }: { label: string; color: string; icon?: IconName }) {
  return (
    <View style={[s.badge, { backgroundColor: color + '22', borderColor: color + '66' }]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={s.badgeTxt}>{label}</Text>
    </View>
  );
}

export function Vazio({ icon, texto, children }: { icon: IconName; texto: string; children?: React.ReactNode }) {
  return (
    <View style={s.vazio}>
      <LinearGradient colors={[colors.cyan + '30', colors.primary + '30']} style={s.vazioIcone}>
        <Ionicons name={icon} size={32} color={colors.text} />
      </LinearGradient>
      <Text style={s.vazioTxt}>{texto}</Text>
      {children}
    </View>
  );
}

export function Fab({ onPress, icon = 'add', label = 'Novo' }: { onPress: () => void; icon?: IconName; label?: string }) {
  const desktop = useDesktop();
  return (
    <Pressable
      onPress={() => {
        toque();
        onPress();
      }}
      accessibilityLabel={label}
      style={(e) => [desktop ? s.fabDesktop : s.fab, e.pressed && { transform: [{ scale: 0.95 }] }, emHover(e) && { opacity: 0.92 }]}
    >
      <LinearGradient colors={gradiente} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: desktop ? radius.md : 30 }]} />
      <Ionicons name={icon} size={desktop ? 20 : 28} color="#fff" />
      {desktop && <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{label}</Text>}
    </Pressable>
  );
}

export function Busca({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  return (
    <View style={s.busca}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textMuted} style={s.buscaInput} />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

export function Info({ icon, label, valor }: { icon: IconName; label: string; valor: string }) {
  return (
    <View style={s.linha}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={s.linhaLabel}>{label}</Text>
      <Text style={s.linhaValor} numberOfLines={3}>
        {valor || '—'}
      </Text>
    </View>
  );
}

export function Avatar({ nome, tamanho = 40, cor = colors.primary }: { nome: string; tamanho?: number; cor?: string }) {
  return (
    <View style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: cor + '2A', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: cor, fontWeight: '800', fontSize: tamanho * 0.38 }}>{iniciais(nome)}</Text>
    </View>
  );
}

/** Seletor numérico − 2 + (quartos, vagas…) */
export function Contador({ label, valor, onChange, icon }: { label: string; valor: number | null; onChange: (v: number | null) => void; icon: IconName }) {
  const v = valor ?? 0;
  return (
    <View style={s.contador}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={s.contadorLabel}>{label}</Text>
      <Pressable hitSlop={8} onPress={() => { toque(); onChange(v > 0 ? v - 1 : null); }} style={s.contadorBtn} accessibilityLabel={`Menos ${label}`}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <Text style={s.contadorValor}>{valor ?? '–'}</Text>
      <Pressable hitSlop={8} onPress={() => { toque(); onChange(v + 1); }} style={s.contadorBtn} accessibilityLabel={`Mais ${label}`}>
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

/** Indicador do painel */
export function Metrica({ icon, valor, label, cor = colors.primary, onPress }: { icon: IconName; valor: string; label: string; cor?: string; onPress?: () => void }) {
  return (
    <Card style={s.metrica} onPress={onPress}>
      <View style={[s.metricaIcone, { backgroundColor: cor + '22' }]}>
        <Ionicons name={icon} size={18} color={cor} />
      </View>
      <Text style={s.metricaValor} numberOfLines={1}>{valor}</Text>
      <Text style={s.metricaLabel} numberOfLines={1}>{label}</Text>
    </Card>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  cabecalho: { marginBottom: 14, marginTop: 6, gap: 12 },
  tituloRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.md },
  titulo: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  tituloAcao: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  botao: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: radius.md, overflow: 'hidden',
  },
  botaoCompacto: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.sm },
  botaoTxt: { fontSize: 15, fontWeight: '700' },
  label: { color: colors.textSec, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  dica: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, color: colors.text,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  chipTxt: { color: colors.textSec, fontSize: 13, fontWeight: '600' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill, borderWidth: 1,
  },
  badgeTxt: { color: colors.text, fontSize: 11, fontWeight: '700' },
  vazio: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24, gap: 14 },
  vazioIcone: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  vazioTxt: { color: colors.textSec, fontSize: 15, textAlign: 'center', lineHeight: 21, maxWidth: 420 },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800' },
  sub: { color: colors.textSec, fontSize: 14, marginTop: 2 },
  fabDesktop: {
    position: 'absolute', right: 28, bottom: 28, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13,
    paddingHorizontal: 20, borderRadius: radius.md, overflow: 'hidden',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
  },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  busca: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12,
  },
  buscaInput: { flex: 1, color: colors.text, paddingVertical: 11, fontSize: 15 },
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  linhaLabel: { color: colors.textSec, fontSize: 14, width: 120 },
  linhaValor: { color: colors.text, fontSize: 14, flex: 1, fontWeight: '500' },
  contador: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgAlt, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
  },
  contadorLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  contadorBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardHi, alignItems: 'center', justifyContent: 'center' },
  contadorValor: { color: colors.text, fontSize: 16, fontWeight: '800', minWidth: 22, textAlign: 'center', fontVariant: ['tabular-nums'] },
  metrica: { flex: 1, minWidth: 140, padding: 14, gap: 4 },
  metricaIcone: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  metricaValor: { color: colors.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metricaLabel: { color: colors.textSec, fontSize: 12, fontWeight: '600' },
});
