import { SplashScreen, Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

import { ProvedorSessao, useSessao } from '@/sessao/ProvedorSessao';
import { empresaAguardando } from '@/sessao/sessao';
import { cores } from '@/tema';

type Area = 'fora' | 'status' | 'abas';

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
 * O guia de acessibilidade abre com ou sem conta.
 */
function Navegacao() {
  const { sessao, carregando } = useSessao();
  const aguardando = empresaAguardando(sessao);
  const area: Area = !sessao ? 'fora' : aguardando ? 'status' : 'abas';
  const areaAnterior = useRef<Area | null>(null);

  useEffect(() => {
    if (!carregando) {
      SplashScreen.hide();
    }
  }, [carregando]);

  // Ao entrar, criar a conta, sair ou a sessão vencer, vai para a primeira tela da área nova. Feito aqui,
  // e não com `redirectTo` do Stack.Protected, que só existe a partir do SDK 58 (o Expo Go da loja é SDK 57).
  // Na abertura do app não navega: o roteador já começa na área certa.
  useEffect(() => {
    if (carregando) {
      return;
    }
    const anterior = areaAnterior.current;
    areaAnterior.current = area;
    if (anterior !== null && anterior !== area) {
      router.replace(area === 'fora' ? '/' : area === 'status' ? '/status-empresa' : '/inicio');
    }
  }, [area, carregando]);

  if (carregando) {
    return null;
  }

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
        <Stack.Screen name="pesquisa" options={{ title: 'Pesquisar' }} />
        <Stack.Screen name="usuario/[id]" options={{ title: 'Perfil' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!sessao && aguardando}>
        <Stack.Screen name="status-empresa" options={{ title: 'Situação da empresa' }} />
      </Stack.Protected>
      <Stack.Protected guard={!sessao}>
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
