import { Stack } from 'expo-router';

import { opcoesPilha } from '@/componentes/opcoesPilha';

export default function PilhaPerfil() {
  return (
    <Stack screenOptions={opcoesPilha}>
      <Stack.Screen name="index" options={{ title: 'Perfil' }} />
      <Stack.Screen name="candidaturas" options={{ title: 'Minhas candidaturas' }} />
    </Stack>
  );
}
