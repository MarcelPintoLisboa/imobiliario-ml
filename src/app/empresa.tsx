import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Marca } from '../components/Marca';
import { Botao, Campo, Card, Linha2, Titulo } from '../components/ui';
import { useConta } from '../lib/conta';
import { useMargem } from '../lib/desktop';
import { enviarFoto, escolherFotos } from '../lib/fotos';
import { useDados } from '../lib/store';
import { mensagemErro } from '../lib/supabase';
import { colors } from '../theme';

// Nome e logo customizados: aparecem no menu, no login da equipe e no texto enviado aos clientes
export default function MinhaImobiliaria() {
  const { empresa, salvarEmpresa } = useDados();
  const { dono, ehAdmin, recarregarConta } = useConta();
  const margem = useMargem();
  const [e, setE] = useState(empresa);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof typeof e, v: string | null) => setE((x) => ({ ...x, [k]: v }));

  const trocarLogo = async () => {
    try {
      const [arq] = await escolherFotos('galeria', false);
      if (!arq || !dono) return;
      setEnviandoLogo(true);
      const f = await enviarFoto(arq, dono, 'marca', 512, true);
      set('logo_url', f.url);
    } catch (err) {
      Alert.alert('Não foi possível enviar a logo', mensagemErro(err));
    } finally {
      setEnviandoLogo(false);
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarEmpresa(e);
      await recarregarConta();
      router.back();
    } catch (err) {
      Alert.alert('Não foi possível salvar', mensagemErro(err));
    } finally {
      setSalvando(false);
    }
  };

  if (!ehAdmin) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.textSec, textAlign: 'center' }}>Somente o administrador da imobiliária altera nome e logo.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: margem, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Marca vertical nome={e.nome} logo={e.logo_url} slogan={e.slogan || (e.creci ? `CRECI ${e.creci}` : '')} tamanho={96} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Botao label={e.logo_url ? 'Trocar logo' : 'Enviar logo'} icon="image-outline" variante="secundario" compacto onPress={trocarLogo} carregando={enviandoLogo} />
            {!!e.logo_url && <Botao label="Usar ícone padrão" variante="fantasma" compacto onPress={() => set('logo_url', null)} />}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10, textAlign: 'center' }}>
            Prefira uma imagem quadrada (PNG com fundo transparente fica ótimo).
          </Text>
        </Card>

        <Titulo>Identidade</Titulo>
        <Card>
          <Campo label="Nome da imobiliária" value={e.nome} onChangeText={(v) => set('nome', v)} placeholder="Imobiliário ML" />
          <Campo label="Slogan" value={e.slogan} onChangeText={(v) => set('slogan', v)} placeholder="Ex.: Seu novo endereço começa aqui" />
          <Campo label="CRECI" value={e.creci} onChangeText={(v) => set('creci', v)} autoCapitalize="characters" />
        </Card>

        <Titulo>Contatos</Titulo>
        <Card>
          <Linha2>
            <Campo label="Telefone / WhatsApp" value={e.telefone} onChangeText={(v) => set('telefone', v)} keyboardType="phone-pad" />
            <Campo label="E-mail" value={e.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
          </Linha2>
          <Linha2>
            <Campo label="Instagram" value={e.instagram} onChangeText={(v) => set('instagram', v)} autoCapitalize="none" placeholder="@imobiliaria" />
            <Campo label="Site" value={e.site} onChangeText={(v) => set('site', v)} autoCapitalize="none" keyboardType="url" />
          </Linha2>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>O nome, o CRECI e o telefone vão como assinatura nos imóveis enviados aos clientes.</Text>
        </Card>

        <Botao label="Salvar" icon="checkmark" onPress={salvar} carregando={salvando} style={{ marginTop: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
