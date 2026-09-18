import { useState } from "react";
import { Text, View } from "react-native";

import { AutenticacaoService, useAutenticacao } from "../../autenticacao";
import { Botao, Cartao, CampoTexto, CabecalhoSecao, ErroAcao } from "../../components/ui";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";

/**
 * Troca de e-mail em duas etapas: senha atual e novo e-mail, depois o código enviado ao novo
 * endereço. Ao confirmar, atualiza o usuário do contexto.
 */
export function SecaoEmail({ tema }: { tema: Tema }) {
  const { usuario, atualizarUsuario } = useAutenticacao();
  const [etapa, setEtapa] = useState<"formulario" | "confirmar">("formulario");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function solicitar() {
    if (enviando) return;
    if (!senhaAtual.trim() || !novoEmail.trim()) {
      setErro("Preencha a senha atual e o novo e-mail.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await AutenticacaoService.solicitarTrocaEmail(senhaAtual, novoEmail.trim());
      setEtapa("confirmar");
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível solicitar a troca de e-mail agora."));
    } finally {
      setEnviando(false);
    }
  }

  async function confirmar() {
    if (enviando || !codigo.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      await AutenticacaoService.confirmarTrocaEmail(codigo.trim());
      await atualizarUsuario();
      setEtapa("formulario");
      setSenhaAtual("");
      setNovoEmail("");
      setCodigo("");
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Código inválido ou expirado."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="E-mail" icone="mail-outline" />
      <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>E-mail atual: {usuario?.email}</Text>

        {etapa === "formulario" ? (
          <>
            <CampoTexto rotulo="Senha atual" value={senhaAtual} onChangeText={setSenhaAtual} secureTextEntry editable={!enviando} />
            <CampoTexto
              rotulo="Novo e-mail"
              value={novoEmail}
              onChangeText={setNovoEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!enviando}
            />
            {erro ? <ErroAcao mensagem={erro} /> : null}
            <Botao onPress={() => void solicitar()} carregando={enviando} disabled={enviando}>
              Enviar código de confirmação
            </Botao>
          </>
        ) : (
          <>
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
              Enviamos um código de 6 dígitos para {novoEmail}.
            </Text>
            <CampoTexto rotulo="Código de confirmação" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" maxLength={6} editable={!enviando} />
            {erro ? <ErroAcao mensagem={erro} /> : null}
            <Botao onPress={() => void confirmar()} carregando={enviando} disabled={enviando || !codigo.trim()}>
              Confirmar novo e-mail
            </Botao>
            <Botao variant="ghost" onPress={() => setEtapa("formulario")} disabled={enviando}>
              Cancelar
            </Botao>
          </>
        )}
      </Cartao>
    </View>
  );
}
