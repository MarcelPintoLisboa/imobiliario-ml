import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { BUCKET_FOTOS, supabase } from './supabase';
import type { Foto } from './types';

const LARGURA_FOTO = 1600; // boa para tela cheia e leve para enviar pelo 4G

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** base64 → bytes (o upload do Supabase no celular precisa de ArrayBuffer) */
function base64ParaBytes(b64: string): Uint8Array {
  const limpo = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((limpo.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < limpo.length; i += 4) {
    const [a, b, c, d] = [0, 1, 2, 3].map((k) => ALFABETO.indexOf(limpo[i + k] ?? 'A'));
    bytes[p++] = (a! << 2) | (b! >> 4);
    if (i + 2 < limpo.length) bytes[p++] = ((b! & 15) << 4) | (c! >> 2);
    if (i + 3 < limpo.length) bytes[p++] = ((c! & 3) << 6) | d!;
  }
  return bytes.slice(0, p);
}

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Abre a galeria (várias fotos) ou a câmera. Devolve os endereços locais escolhidos. */
export async function escolherFotos(origem: 'galeria' | 'camera', varias = true): Promise<{ uri: string; width?: number }[]> {
  if (origem === 'camera') {
    if (Platform.OS === 'web') return escolherFotos('galeria', varias);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Libere o acesso à câmera nas configurações do aparelho.');
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    return r.canceled ? [] : r.assets.map((a) => ({ uri: a.uri, width: a.width }));
  }
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: varias,
    selectionLimit: varias ? 30 : 1,
    orderedSelection: true,
    quality: 1,
  });
  return r.canceled ? [] : r.assets.map((a) => ({ uri: a.uri, width: a.width }));
}

/** Reduz, comprime e envia uma foto para a pasta da imobiliária. */
export async function enviarFoto(
  local: { uri: string; width?: number },
  dono: string,
  pasta: string,
  largura = LARGURA_FOTO,
  png = false,
): Promise<Foto> {
  const ctx = ImageManipulator.manipulate(local.uri);
  if (!local.width || local.width > largura) ctx.resize({ width: largura });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ base64: true, compress: 0.75, format: png ? SaveFormat.PNG : SaveFormat.JPEG });
  if (!out.base64) throw new Error('Não foi possível ler a foto.');
  const ext = png ? 'png' : 'jpg';
  const path = `${dono}/${pasta}/${id()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(path, base64ParaBytes(out.base64), { contentType: png ? 'image/png' : 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function apagarFotos(paths: string[]) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(BUCKET_FOTOS).remove(paths);
  if (error) throw error;
}
