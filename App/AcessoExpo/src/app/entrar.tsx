import { router } from 'expo-router';
import type { TextInputInstance } from '@/utilitarios/tipos';
import { useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { entrar } from '@/api/autenticacao';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Tela } from '@/componentes/Tela';
import { FalhaApi, mensagemDe } from '@/servicos/erros';
import { useSessao } from '@/sessao/ProvedorSessao';
import { validarEmail, validarSenhaLogin } from '@/utilitarios/validacao';

type Erros = { email?: string | null; senha?: string | null };

/** Entrar (TelaLogin no Android). O preenchimento automático de senhas do iPhone funciona aqui. */
export default function Entrar() {
  const { iniciar } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campoEmail = useRef<TextInputInstance>(null);
  const campoSenha = useRef<TextInputInstance>(null);

  async function enviar(confirmarReativacao = false) {
    const novos: Erros = { email: validarEmail(email), senha: validarSenhaLogin(senha) };
    setErros(novos);
    if (novos.email || novos.senha) {
      setMensagem('Confira os campos destacados.');
      (novos.email ? campoEmail : campoSenha).current?.focus();
      return;
    }
    setMensagem(null);
    setEnviando(true);
    try {
      const resultado = await entrar(email, senha, confirmarReativacao);
      if (resultado.tipo === 'autenticado') {
        await iniciar(resultado.sessao);
        return;
      }
      if (resultado.tipo === 'emailNaoConfirmado') {
        router.push({ pathname: '/confirmar-email', params: { email: resultado.email } });
        return;
      }
      Alert.alert(
        'Conta pausada',
        'Sua conta está pausada. Deseja reativá-la e entrar agora?',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Reativar e entrar', onPress: () => void enviar(true) },
        ],
      );
    } catch (erro) {
      if (erro instanceof FalhaApi && Object.keys(erro.campos).length > 0) {
        setErros({ email: erro.campos.email, senha: erro.campos.senha });
      }
      setMensagem(mensagemDe(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Aviso tipo="erro" mensagem={mensagem} />
      <Campo
        ref={campoEmail}
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        erro={erros.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => campoSenha.current?.focus()}
        submitBehavior="submit"
      />
      <Campo
        ref={campoSenha}
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        erro={erros.senha}
        secureTextEntry={!mostrarSenha}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void enviar()}
      />
      <Botao
        titulo={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
        variante="texto"
        selecionado={mostrarSenha}
        onPress={() => setMostrarSenha((atual) => !atual)}
      />
      <Botao titulo="Entrar" carregando={enviando} onPress={() => void enviar()} />
      <View>
        <Botao titulo="Esqueci minha senha" variante="texto" onPress={() => router.push('/esqueci-senha')} />
        <Botao titulo="Ainda não tenho conta: criar conta" variante="texto" onPress={() => router.replace('/cadastro')} />
      </View>
    </Tela>
  );
}
