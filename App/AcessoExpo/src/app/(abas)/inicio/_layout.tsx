import { Stack } from 'expo-router';

import { opcoesPilha } from '@/componentes/opcoesPilha';

export default function PilhaInicio() {
  return (
    <Stack screenOptions={opcoesPilha}>
      <Stack.Screen name="index" options={{ title: 'Início' }} />
      <Stack.Screen name="comentarios" options={{ title: 'Comentários', headerLargeTitle: false }} />
      <Stack.Screen name="publicar" options={{ title: 'Nova publicação', presentation: 'modal' }} />
    </Stack>
  );
}
