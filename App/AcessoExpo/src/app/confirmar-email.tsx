import { router, useLocalSearchParams } from 'expo-router';
import type { TextInputInstance } from '@/utilitarios/tipos';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text } from 'react-native';

import { confirmarEmail, reenviarCodigo } from '@/api/autenticacao';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Tela } from '@/componentes/Tela';
import { mensagemDe } from '@/servicos/erros';
import { texto } from '@/tema';
import { validarCodigoEmail } from '@/utilitarios/validacao';

/** O servidor exige 60 s entre um envio de código e outro. */
const ESPERA_REENVIO = 60;

/**
 * Confirmação do e-mail por código de 6 dígitos (TelaConfirmarEmail no Android). A API não devolve
 * sessão aqui: depois de confirmar, a pessoa entra com e-mail e senha.
 */
export default function ConfirmarEmail() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const campo = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (espera <= 0) {
      return;
    }
    const relogio = setTimeout(() => {
      setEspera(espera - 1);
      if (espera === 1) {
        AccessibilityInfo.announceForAccessibility('Você já pode pedir um novo código.');
      }
    }, 1000);
    return () => clearTimeout(relogio);
  }, [espera]);

  async function confirmar() {
    const problema = validarCodigoEmail(codigo);
    setErro(problema);
    if (problema) {
      campo.current?.focus();
      return;
    }
    setMensagem(null);
    setEnviando(true);
    try {
      await confirmarEmail(email, codigo);
      setSucesso('E-mail confirmado. Agora é só entrar com seu e-mail e senha.');
    } catch (falha) {
      setMensagem(mensagemDe(falha));
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    setMensagem(null);
    setReenviando(true);
    try {
      await reenviarCodigo(email);
      setSucesso(null);
      setMensagem(null);
      setEspera(ESPERA_REENVIO);
      AccessibilityInfo.announceForAccessibility('Se o e-mail estiver cadastrado, um novo código foi enviado.');
    } catch (falha) {
      setMensagem(mensagemDe(falha));
    } finally {
      setReenviando(false);
    }
  }

  if (sucesso) {
    return (
      <Tela>
        <Aviso tipo="sucesso" mensagem={sucesso} />
        <Botao titulo="Entrar" onPress={() => router.replace('/entrar')} />
      </Tela>
    );
  }

  return (
    <Tela>
      <Text style={texto.corpo}>
        Enviamos um código de 6 dígitos para <Text style={{ fontWeight: '700' }}>{email || 'o seu e-mail'}</Text>. Ele
        vale por pouco tempo; confira também a caixa de spam.
      </Text>
      <Aviso tipo="erro" mensagem={mensagem} />
      <Campo
        ref={campo}
        rotulo="Código de confirmação"
        value={codigo}
        onChangeText={(valor) => setCodigo(valor.replace(/\D/g, '').slice(0, 6))}
        erro={erro}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        returnKeyType="done"
        onSubmitEditing={() => void confirmar()}
      />
      <Botao titulo="Confirmar e-mail" carregando={enviando} onPress={() => void confirmar()} />
      {/* Texto fixo no botão: uma contagem que muda a cada segundo seria relida sem parar pelo VoiceOver. */}
      <Botao
        titulo={espera > 0 ? 'Aguarde para pedir outro código' : 'Reenviar código'}
        variante="secundario"
        desativado={espera > 0 || !email}
        carregando={reenviando}
        onPress={() => void reenviar()}
      />
      {espera > 0 ? (
        <Text style={texto.secundario} accessible={false} importantForAccessibility="no" aria-hidden>
          Novo envio liberado em {espera} s.
        </Text>
      ) : null}
    </Tela>
  );
}
