import { Stack } from 'expo-router';

import { opcoesPilha } from '@/componentes/opcoesPilha';

export default function PilhaNotificacoes() {
  return (
    <Stack screenOptions={opcoesPilha}>
      <Stack.Screen name="index" options={{ title: 'Notificações' }} />
    </Stack>
  );
}
