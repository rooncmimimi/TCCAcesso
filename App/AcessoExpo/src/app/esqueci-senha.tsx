import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, type TextInputInstance } from 'react-native';

import { pedirNovaSenha } from '@/api/autenticacao';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Tela } from '@/componentes/Tela';
import { mensagemDe } from '@/servicos/erros';
import { texto } from '@/tema';
import { validarEmail } from '@/utilitarios/validacao';

/**
 * Recuperar senha (TelaEsqueciSenha no Android). A API manda um e-mail com o link para a página de
 * redefinição do site; a resposta é sempre a mesma, exista ou não a conta.
 */
export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<TextInputInstance>(null);

  async function enviar() {
    const problema = validarEmail(email);
    setErro(problema);
    if (problema) {
      campo.current?.focus();
      return;
    }
    setMensagem(null);
    setEnviando(true);
    try {
      await pedirNovaSenha(email);
      setEnviado(true);
    } catch (falha) {
      setMensagem(mensagemDe(falha));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <Tela>
        <Aviso
          tipo="sucesso"
          mensagem="Se houver uma conta com esse e-mail, você vai receber o link em alguns minutos. Confira também a caixa de spam."
        />
        <Botao titulo="Voltar para entrar" onPress={() => router.back()} />
      </Tela>
    );
  }

  return (
    <Tela>
      <Text style={texto.corpo}>Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</Text>
      <Aviso tipo="erro" mensagem={mensagem} />
      <Campo
        ref={campo}
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        erro={erro}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="send"
        onSubmitEditing={() => void enviar()}
      />
      <Botao titulo="Enviar link" carregando={enviando} onPress={() => void enviar()} />
    </Tela>
  );
}
