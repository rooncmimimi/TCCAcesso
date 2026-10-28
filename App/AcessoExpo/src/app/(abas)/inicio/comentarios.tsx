import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Alert, StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import { comentar, excluirComentario, listarComentarios } from '@/api/conteudo';
import { totalComentarios, type Comentario } from '@/api/leitores';
import { Avatar } from '@/componentes/Avatar';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Cartao } from '@/componentes/Cartao';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Tela } from '@/componentes/Tela';
import { Titulo } from '@/componentes/Titulo';
import { mensagemDe } from '@/servicos/erros';
import { useSessao } from '@/sessao/ProvedorSessao';
import { cores, texto } from '@/tema';
import { emitir } from '@/utilitarios/eventos';
import { TAMANHO_MAXIMO_COMENTARIO, validarComentario } from '@/utilitarios/validacao';
import { useCarregar } from '@/utilitarios/useCarregar';

interface PropsItem {
  item: Comentario;
  raiz: Comentario | null;
  meuId: string | undefined;
  aoResponder: (alvo: Comentario, raiz: Comentario | null, nome: string) => void;
  aoExcluir: (item: Comentario) => void;
}

function ItemComentario({ item, raiz, meuId, aoResponder, aoExcluir }: PropsItem) {
  const quando = item.editado ? `${item.quando} · editado` : item.quando;
  const meu = !!item.autorId && item.autorId.toLowerCase() === meuId;
  return (
    <View style={[estilos.item, raiz ? estilos.resposta : null]}>
      <View style={estilos.cabecalho} accessible accessibilityLabel={`${item.nomeAutor}, ${quando}: ${item.texto}`}>
        <Avatar nome={item.nomeAutor} url={item.fotoAutorUrl} tamanho={raiz ? 36 : 44} />
        <View style={estilos.flex}>
          <Text style={texto.rotulo}>{item.nomeAutor}</Text>
          <Text style={texto.secundario}>{quando}</Text>
          <Text style={texto.corpo}>{item.texto}</Text>
        </View>
      </View>
      <View style={estilos.acoes}>
        <Botao
          titulo="Responder"
          rotuloAcessivel={`Responder a ${item.nomeAutor}`}
          variante="texto"
          onPress={() => aoResponder(item, raiz, item.nomeAutor)}
        />
        {meu ? (
          <Botao
            titulo="Excluir"
            rotuloAcessivel={`Excluir comentário de ${item.nomeAutor}`}
            variante="texto"
            onPress={() => aoExcluir(item)}
          />
        ) : null}
      </View>
    </View>
  );
}

/**
 * Comentários de uma publicação (TelaComentarios no Android): lista com respostas em um nível,
 * comentar, responder e excluir os próprios. Resposta a uma resposta vira resposta do comentário de
 * primeiro nível, como na API.
 */
export default function Comentarios() {
  const { id, autor = '', conteudo = '' } = useLocalSearchParams<{ id: string; autor?: string; conteudo?: string }>();
  const { sessao } = useSessao();
  const lista = useCarregar(() => listarComentarios(String(id)), [id]);
  const [escrito, setEscrito] = useState('');
  const [respondendo, setRespondendo] = useState<{ id: string; nome: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<TextInputInstance>(null);

  function responder(alvo: Comentario, raiz: Comentario | null, nome: string) {
    setRespondendo({ id: (raiz ?? alvo).id, nome });
    setMensagem(null);
    campo.current?.focus();
  }

  async function enviar() {
    const problema = validarComentario(escrito);
    setErro(problema);
    if (problema) {
      campo.current?.focus();
      return;
    }
    setMensagem(null);
    setEnviando(true);
    try {
      await comentar(String(id), escrito, respondendo?.id);
      setEscrito('');
      setRespondendo(null);
      AccessibilityInfo.announceForAccessibility(respondendo ? 'Resposta enviada.' : 'Comentário enviado.');
      await lista.recarregar();
      emitir('publicacoes');
    } catch (falha) {
      setMensagem(mensagemDe(falha));
    } finally {
      setEnviando(false);
    }
  }

  function confirmarExclusao(item: Comentario) {
    Alert.alert('Excluir comentário?', 'Isso não pode ser desfeito.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await excluirComentario(item.id);
              AccessibilityInfo.announceForAccessibility('Comentário excluído.');
              await lista.recarregar();
              emitir('publicacoes');
            } catch (falha) {
              setMensagem(mensagemDe(falha));
            }
          })();
        },
      },
    ]);
  }

  const meuId = sessao?.idUsuario.toLowerCase();
  const total = lista.dados ? totalComentarios(lista.dados) : 0;

  return (
    <Tela aoAtualizar={() => void lista.recarregar()} atualizando={lista.atualizando}>
      <Cartao>
        <View accessible accessibilityLabel={`Publicação de ${autor}: ${conteudo}`}>
          <Text style={texto.rotulo}>{autor}</Text>
          <Text style={texto.corpo} numberOfLines={6}>
            {conteudo}
          </Text>
        </View>
      </Cartao>

      <Titulo nivel={2}>{respondendo ? `Respondendo a ${respondendo.nome}` : 'Escrever comentário'}</Titulo>
      <Aviso tipo="erro" mensagem={mensagem} />
      <Campo
        ref={campo}
        rotulo={respondendo ? `Sua resposta a ${respondendo.nome}` : 'Seu comentário'}
        value={escrito}
        onChangeText={(valor) => {
          setEscrito(valor);
          if (erro) setErro(null);
        }}
        erro={erro}
        ajuda={
          escrito.trim().length > 900
            ? `Você ainda pode escrever ${TAMANHO_MAXIMO_COMENTARIO - escrito.trim().length} caracteres.`
            : undefined
        }
        multiline
        maxLength={TAMANHO_MAXIMO_COMENTARIO + 100}
      />
      <Botao titulo={respondendo ? 'Enviar resposta' : 'Enviar comentário'} carregando={enviando} onPress={() => void enviar()} />
      {respondendo ? <Botao titulo="Cancelar resposta" variante="texto" onPress={() => setRespondendo(null)} /> : null}

      <Titulo nivel={2}>{total > 0 ? `Comentários (${total})` : 'Comentários'}</Titulo>
      <EstadoConteudo
        carregando={lista.carregando}
        erro={lista.erro}
        vazio={lista.dados?.length === 0}
        mensagemVazio="Ainda não há comentários. Seja a primeira pessoa a comentar."
        aoTentarDeNovo={() => void lista.recarregar()}
      />
      {lista.dados?.map((item) => (
        <View key={item.id} style={estilos.grupo}>
          <ItemComentario item={item} raiz={null} meuId={meuId} aoResponder={responder} aoExcluir={confirmarExclusao} />
          {item.respostas.map((resposta) => (
            <ItemComentario key={resposta.id} item={resposta} raiz={item} meuId={meuId} aoResponder={responder} aoExcluir={confirmarExclusao} />
          ))}
        </View>
      ))}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  grupo: { backgroundColor: cores.superficie, borderRadius: 14, borderWidth: 1, borderColor: cores.borda, padding: 12, gap: 6 },
  item: { gap: 4 },
  resposta: { marginLeft: 24, borderLeftWidth: 2, borderLeftColor: cores.borda, paddingLeft: 12 },
  cabecalho: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap' },
});
