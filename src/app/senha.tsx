import { router } from 'expo-router';
import { Alert } from 'react-native';
import { TrocarSenha } from '../components/TrocarSenha';

export default function TelaSenha() {
  return (
    <TrocarSenha
      aoConcluir={() => {
        Alert.alert('Senha alterada', 'Use a nova senha na próxima vez que entrar.');
        router.back();
      }}
    />
  );
}
