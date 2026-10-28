import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ProvedorSessao, useSessao } from '@/sessao/ProvedorSessao';
import { empresaAguardando } from '@/sessao/sessao';
import { cores } from '@/tema';

// A abertura fica na tela de carregamento até a sessão salva ser lida do Keychain,
// para não piscar a apresentação para quem já está logado.
void SplashScreen.preventAutoHideAsync();

export default function Raiz() {
  return (
    <ProvedorSessao>
      <StatusBar style="dark" />
      <Navegacao />
    </ProvedorSessao>
  );
}

/**
 * Quem vê o quê, como no app Android (Navegacao.destinoPara):
 * - sem sessão: apresentação, entrar, criar conta, confirmar e-mail, esqueci a senha;
 * - empresa ainda não aprovada: só a situação da empresa;
 * - pessoa ou empresa aprovada: as abas.
 * O guia de acessibilidade abre com ou sem conta. Quando a sessão muda (entrar, sair, sessão
 * vencida), o Expo Router leva sozinho para a primeira tela permitida.
 */
function Navegacao() {
  const { sessao, carregando } = useSessao();

  useEffect(() => {
    if (!carregando) {
      SplashScreen.hide();
    }
  }, [carregando]);

  if (carregando) {
    return null;
  }

  const aguardando = empresaAguardando(sessao);
  return (
    <Stack
      screenOptions={{
        headerTintColor: cores.primaria,
        headerTitleStyle: { color: cores.texto },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Protected guard={!!sessao && !aguardando}>
        <Stack.Screen name="(abas)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!sessao && aguardando}>
        <Stack.Screen name="status-empresa" options={{ title: 'Situação da empresa' }} />
      </Stack.Protected>
      {/* Logo depois de entrar ou criar a conta, vai direto para a área certa. */}
      <Stack.Protected guard={!sessao} redirectTo={aguardando ? '/status-empresa' : '/inicio'}>
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Início' }} />
        <Stack.Screen name="entrar" options={{ title: 'Entrar' }} />
        <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
        <Stack.Screen name="confirmar-email" options={{ title: 'Confirmar e-mail' }} />
        <Stack.Screen name="esqueci-senha" options={{ title: 'Esqueci minha senha' }} />
      </Stack.Protected>
      <Stack.Screen name="acessibilidade" options={{ title: 'Acessibilidade no iPhone' }} />
      <Stack.Screen name="termos" options={{ title: 'Termos e Privacidade' }} />
    </Stack>
  );
}
