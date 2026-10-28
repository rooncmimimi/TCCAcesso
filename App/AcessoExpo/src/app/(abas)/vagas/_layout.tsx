import { Stack } from 'expo-router';

import { opcoesPilha } from '@/componentes/opcoesPilha';
import { useSessao } from '@/sessao/ProvedorSessao';

export default function PilhaVagas() {
  const { sessao } = useSessao();
  return (
    <Stack screenOptions={opcoesPilha}>
      <Stack.Screen name="index" options={{ title: sessao?.tipo === 'empresa' ? 'Painel da empresa' : 'Vagas' }} />
      <Stack.Screen name="nova" options={{ title: 'Publicar vaga', headerLargeTitle: false, presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalhes da vaga' }} />
    </Stack>
  );
}
