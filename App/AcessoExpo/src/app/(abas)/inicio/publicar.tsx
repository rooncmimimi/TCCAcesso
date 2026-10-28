import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, type TextInputInstance } from 'react-native';

import { publicar } from '@/api/conteudo';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Tela } from '@/componentes/Tela';
import { mensagemDe } from '@/servicos/erros';
import { emitir } from '@/utilitarios/eventos';
import { TAMANHO_MAXIMO_PUBLICACAO, validarPublicacao } from '@/utilitarios/validacao';

/** Nova publicação de texto (FragmentoCriar no Android). Publicar com imagem ainda não existe no app. */
export default function Publicar() {
  const [conteudo, setConteudo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<TextInputInstance>(null);

  async function enviar() {
    const problema = validarPublicacao(conteudo);
    setErro(problema);
    if (problema) {
      campo.current?.focus();
      return;
    }
    setMensagem(null);
    setEnviando(true);
    try {
      await publicar(conteudo);
      AccessibilityInfo.announceForAccessibility('Publicação enviada.');
      emitir('publicacoes');
      router.back();
    } catch (falha) {
      setMensagem(mensagemDe(falha));
      setEnviando(false);
    }
  }

  const restantes = TAMANHO_MAXIMO_PUBLICACAO - conteudo.trim().length;
  return (
    <Tela>
      <Aviso tipo="erro" mensagem={mensagem} />
      <Campo
        ref={campo}
        rotulo="Sobre o que você quer falar?"
        value={conteudo}
        onChangeText={setConteudo}
        erro={erro}
        ajuda={restantes >= 0 ? `Você ainda pode escrever ${restantes} caracteres.` : `Passou ${-restantes} caracteres do limite.`}
        multiline
        textAlignVertical="top"
        autoFocus
        maxLength={TAMANHO_MAXIMO_PUBLICACAO + 200}
      />
      <Botao titulo="Publicar" carregando={enviando} onPress={() => void enviar()} />
      <Botao titulo="Cancelar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}
