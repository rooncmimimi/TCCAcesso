import { NativeTabs } from 'expo-router/native-tabs';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { contarNaoLidas } from '@/api/conteudo';
import { useSessao } from '@/sessao/ProvedorSessao';
import { cores } from '@/tema';
import { ouvir } from '@/utilitarios/eventos';
import { contador } from '@/utilitarios/rotulos';

/** Ao entrar, a primeira aba é o Início. */
export const unstable_settings = { anchor: 'inicio' };

/**
 * Abas nativas do iPhone (UITabBar): o VoiceOver, o Texto Maior (com o visualizador de itens
 * grandes ao segurar a aba) e o Controle por Voz funcionam como em qualquer app do sistema.
 * Cada aba tem a própria pilha de telas (pasta com _layout.tsx).
 */
export default function Abas() {
  const { sessao } = useSessao();
  const naoLidas = useNaoLidas();
  const empresa = sessao?.tipo === 'empresa';

  return (
    <NativeTabs tintColor={cores.primaria} disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="inicio">
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="vagas">
        <NativeTabs.Trigger.Label>{empresa ? 'Painel' : 'Vagas'}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} md="work" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="notificacoes"
        accessibilityLabel={naoLidas > 0 ? `Notificações, ${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}` : 'Notificações'}
      >
        <NativeTabs.Trigger.Label>Notificações</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bell', selected: 'bell.fill' }} md="notifications" />
        {naoLidas > 0 ? <NativeTabs.Trigger.Badge>{contador(naoLidas)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** Conta as notificações não lidas ao abrir, ao voltar para o app e quando a lista muda. */
function useNaoLidas(): number {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    let ativo = true;
    const atualizar = () => {
      contarNaoLidas()
        .then((valor) => ativo && setTotal(valor))
        .catch(() => undefined); // O selo é um extra; sem ele a aba continua funcionando.
    };
    atualizar();
    const pararEventos = ouvir('notificacoes', atualizar);
    const assinatura = AppState.addEventListener('change', (estado) => estado === 'active' && atualizar());
    return () => {
      ativo = false;
      pararEventos();
      assinatura.remove();
    };
  }, []);
  return total;
}
