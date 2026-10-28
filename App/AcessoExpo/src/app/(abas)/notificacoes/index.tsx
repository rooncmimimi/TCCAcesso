import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { listarNotificacoes, marcarComoLida, marcarTodasComoLidas } from '@/api/conteudo';
import type { Notificacao } from '@/api/leitores';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Tela } from '@/componentes/Tela';
import { mensagemDe } from '@/servicos/erros';
import { cores, texto } from '@/tema';
import { emitir } from '@/utilitarios/eventos';
import { useCarregar } from '@/utilitarios/useCarregar';

/** Notificações (FragmentoNotificacoes no Android). "Não lida" aparece escrito, não só pela cor. */
export default function Notificacoes() {
  const lista = useCarregar(listarNotificacoes);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [marcando, setMarcando] = useState(false);
  const naoLidas = lista.dados?.filter((item) => !item.lida).length ?? 0;

  async function abrir(notificacao: Notificacao) {
    if (!notificacao.lida) {
      try {
        await marcarComoLida(notificacao.id);
        lista.atualizarLocal((itens) => itens.map((item) => (item.id === notificacao.id ? { ...item, lida: true } : item)));
        emitir('notificacoes');
      } catch (erro) {
        setMensagem(mensagemDe(erro));
        return;
      }
    }
    if (notificacao.entidadeTipo === 'vaga' && notificacao.entidadeId) {
      router.push({ pathname: '/vagas/[id]', params: { id: notificacao.entidadeId } });
    }
  }

  async function marcarTodas() {
    setMarcando(true);
    setMensagem(null);
    try {
      await marcarTodasComoLidas();
      lista.atualizarLocal((itens) => itens.map((item) => ({ ...item, lida: true })));
      emitir('notificacoes');
      AccessibilityInfo.announceForAccessibility('Todas as notificações foram marcadas como lidas.');
    } catch (erro) {
      setMensagem(mensagemDe(erro));
    } finally {
      setMarcando(false);
    }
  }

  return (
    <Tela
      aoAtualizar={() => {
        void lista.recarregar();
        emitir('notificacoes');
      }}
      atualizando={lista.atualizando}
    >
      <Aviso tipo="erro" mensagem={mensagem} />
      <EstadoConteudo
        carregando={lista.carregando}
        erro={lista.erro}
        vazio={lista.dados?.length === 0}
        mensagemVazio="Você não tem notificações."
        aoTentarDeNovo={() => void lista.recarregar()}
      />
      {naoLidas > 0 ? (
        <Botao
          titulo={`Marcar todas como lidas (${naoLidas})`}
          rotuloAcessivel={`Marcar todas como lidas. ${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}`}
          variante="secundario"
          carregando={marcando}
          onPress={() => void marcarTodas()}
        />
      ) : null}
      {lista.dados?.map((item) => {
        const abreVaga = item.entidadeTipo === 'vaga' && !!item.entidadeId;
        return (
          <Pressable
            key={item.id}
            onPress={() => void abrir(item)}
            accessibilityRole="button"
            accessibilityLabel={[item.lida ? null : 'Não lida', item.titulo, item.descricao, item.quando].filter(Boolean).join('. ')}
            accessibilityHint={abreVaga ? 'Abre a vaga' : item.lida ? undefined : 'Marca como lida'}
            style={({ pressed }) => [estilos.item, !item.lida && estilos.naoLida, pressed && estilos.pressionado]}
          >
            <View style={estilos.flex}>
              {!item.lida ? <Text style={estilos.selo}>● Não lida</Text> : null}
              <Text style={[texto.corpo, !item.lida && estilos.negrito]}>{item.titulo}</Text>
              {item.descricao ? <Text style={texto.secundario}>{item.descricao}</Text> : null}
              <Text style={texto.secundario}>{item.quando}</Text>
            </View>
          </Pressable>
        );
      })}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  item: { backgroundColor: cores.superficie, borderRadius: 14, borderWidth: 1, borderColor: cores.borda, padding: 16, minHeight: 48 },
  naoLida: { borderColor: cores.primaria, borderWidth: 1.5, backgroundColor: cores.containerPrimaria },
  pressionado: { opacity: 0.8 },
  flex: { gap: 4 },
  selo: { fontSize: 14, fontWeight: '700', color: cores.sobreContainerPrimaria },
  negrito: { fontWeight: '700' },
});
