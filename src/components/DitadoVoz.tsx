import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Organizado } from '../lib/ia';
import { mensagemErro } from '../lib/supabase';
import { colors, gradiente, radius } from '../theme';
import { Botao, toque } from './ui';

// Palavras do ramo que ajudam o reconhecimento de voz
const VOCABULARIO = [
  'suíte', 'suítes', 'varanda gourmet', 'condomínio', 'IPTU', 'nascente', 'poente', 'metros quadrados', 'vagas',
  'cobertura', 'duplex', 'flat', 'kitnet', 'portaria 24 horas', 'área de lazer', 'escritura', 'financiamento', 'FGTS',
];

const EXEMPLOS = {
  imovel:
    'Ex.: "Apartamento no Edifício Atlântico, em Boa Viagem, Recife. 3 quartos sendo 1 suíte, 2 vagas, 95 metros. Varanda gourmet, nascente, piscina e academia. Venda por 650 mil, condomínio 900 e IPTU 180 por mês."',
  cliente:
    'Ex.: "Cliente Ana Souza, telefone 81 99999-1234, veio pelo Instagram. Procura apartamento de 2 a 3 quartos em Boa Viagem ou Pina até 500 mil, vai usar FGTS e financiamento."',
};

/**
 * Bloco "Descrever por voz": transcreve a fala no próprio aparelho (português) e
 * envia o texto para o assistente organizar nos campos do formulário.
 */
export function DitadoVoz<T>({
  modo, organizar, aoOrganizar, textoInicial = '',
}: {
  modo: 'imovel' | 'cliente';
  organizar: (texto: string) => Promise<Organizado<T>>;
  aoOrganizar: (dados: T, texto: string) => void;
  textoInicial?: string;
}) {
  const [texto, setTexto] = useState(textoInicial);
  const [parcial, setParcial] = useState('');
  const [gravando, setGravando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [semVoz, setSemVoz] = useState(() => {
    try {
      return !ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      return true;
    }
  });
  const [pulso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!gravando) {
      pulso.stopAnimation();
      pulso.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.timing(pulso, { toValue: 1, duration: 1300, easing: Easing.out(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
    );
    anim.start();
    return () => anim.stop();
  }, [gravando, pulso]);

  useSpeechRecognitionEvent('start', () => setGravando(true));
  useSpeechRecognitionEvent('end', () => {
    setGravando(false);
    setParcial('');
  });
  useSpeechRecognitionEvent('result', (e) => {
    const t = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      setTexto((ant) => [ant.trim(), t.trim()].filter(Boolean).join(ant.trim().endsWith('.') ? ' ' : '. '));
      setParcial('');
    } else {
      setParcial(t);
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    setGravando(false);
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    if (e.error === 'not-allowed') setErro('Libere o microfone e o reconhecimento de voz nas configurações do aparelho.');
    else if (e.error === 'network' || e.error === 'service-not-allowed' || e.error === 'language-not-supported') {
      setSemVoz(true);
      setErro('');
    } else setErro(e.message || 'Não foi possível ouvir agora. Tente de novo.');
  });

  const alternar = async () => {
    toque();
    setErro('');
    if (gravando) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setErro('Sem permissão para usar o microfone. Libere nas configurações do aparelho.');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        contextualStrings: VOCABULARIO,
      });
    } catch (e) {
      setSemVoz(true);
      setErro(mensagemErro(e));
    }
  };

  const enviar = async () => {
    if (gravando) ExpoSpeechRecognitionModule.stop();
    const final = [texto, parcial].filter(Boolean).join(' ').trim();
    if (final.length < 10) {
      setErro(modo === 'imovel' ? 'Descreva o imóvel com um pouco mais de detalhes.' : 'Fale um pouco mais sobre o cliente.');
      return;
    }
    setErro('');
    setAviso('');
    setProcessando(true);
    try {
      const r = await organizar(final);
      aoOrganizar(r.dados, final);
      setAviso(
        r.semIA
          ? `Organizado no modo básico, sem IA (${r.motivo ?? 'assistente indisponível'}). Confira os campos e complete o que faltar.`
          : 'Organizado pelo assistente com IA. Revise os campos antes de salvar.',
      );
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setProcessando(false);
    }
  };

  const escala = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const opacidade = pulso.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const desktopWindows = Platform.OS === 'web' && /Windows/i.test(globalThis.navigator?.userAgent ?? '');

  return (
    <View style={st.borda}>
      <LinearGradient colors={gradiente} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} />
      <View style={st.caixa}>
        <View style={st.topo}>
          <Ionicons name="sparkles" size={18} color={colors.cyan} />
          <Text style={st.titulo}>{modo === 'imovel' ? 'Descreva o imóvel por voz' : 'Cadastre o cliente por voz'}</Text>
        </View>
        <Text style={st.ajuda}>
          {semVoz
            ? `Digite ou cole a descrição abaixo${desktopWindows ? ' — ou use o ditado do Windows: clique na caixa e aperte Win + H' : ''}. O app organiza tudo nos campos.`
            : 'Toque no microfone e fale naturalmente. O app organiza tudo nos campos para você revisar.'}
        </Text>

        <View style={st.corpo}>
          {!semVoz && (
            <View style={st.micArea}>
              {gravando && <Animated.View style={[st.onda, { transform: [{ scale: escala }], opacity: opacidade }]} />}
              <Pressable onPress={alternar} accessibilityLabel={gravando ? 'Parar gravação' : 'Começar a falar'} style={st.mic}>
                <LinearGradient
                  colors={gravando ? [colors.pink, colors.critical] : gradiente}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 34 }]}
                />
                <Ionicons name={gravando ? 'stop' : 'mic'} size={30} color="#fff" />
              </Pressable>
              <Text style={st.micTxt}>{gravando ? 'Ouvindo… toque para parar' : texto ? 'Continuar falando' : 'Toque para falar'}</Text>
            </View>
          )}

          <TextInput
            value={parcial ? `${texto}${texto ? ' ' : ''}${parcial}` : texto}
            onChangeText={(t) => {
              setTexto(t);
              setParcial('');
            }}
            editable={!gravando}
            multiline
            placeholder={EXEMPLOS[modo]}
            placeholderTextColor={colors.textMuted}
            style={st.texto}
          />
        </View>

        {!!erro && <Text style={st.erro}>{erro}</Text>}
        {!!aviso && !erro && <Text style={st.aviso}>{aviso}</Text>}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {!!texto && !gravando && (
            <Botao label="Limpar" icon="trash-outline" variante="fantasma" compacto onPress={() => setTexto('')} />
          )}
          <Botao
            label={processando ? 'Organizando…' : 'Organizar campos'}
            icon="sparkles"
            onPress={enviar}
            carregando={processando}
            desabilitado={!texto && !parcial}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  borda: { borderRadius: radius.lg, padding: 1.5, marginBottom: 16 },
  caixa: { backgroundColor: colors.card, borderRadius: radius.lg - 1, padding: 16 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { color: colors.text, fontWeight: '800', fontSize: 16 },
  ajuda: { color: colors.textSec, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 12 },
  corpo: { gap: 12 },
  micArea: { alignItems: 'center', gap: 8, paddingVertical: 6 },
  mic: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  onda: { position: 'absolute', top: 6, width: 68, height: 68, borderRadius: 34, backgroundColor: colors.pink },
  micTxt: { color: colors.textSec, fontSize: 13, fontWeight: '600' },
  texto: {
    minHeight: 110, backgroundColor: colors.bgAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, padding: 12, fontSize: 15, lineHeight: 22, textAlignVertical: 'top',
  },
  erro: { color: colors.critical, marginTop: 10, fontSize: 13 },
  aviso: { color: colors.textSec, marginTop: 10, fontSize: 13, lineHeight: 18 },
});
