import { useState } from "react";
import { View } from "react-native";

import { AutenticacaoService, useAutenticacao } from "../../autenticacao";
import { Botao, Cartao, CampoTexto, CabecalhoSecao, ErroAcao } from "../../components/ui";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";

/**
 * Troca de senha com a senha atual; a regra de senha forte é validada pelo backend.
 *
 * A troca invalida a sessão de todos os aparelhos, inclusive o que fez a troca (o backend revoga as
 * sessões e recusa os tokens emitidos antes). Por isso a tela não mostra uma confirmação que ficaria
 * numa sessão morta: sai da conta na hora, e quem explica o que aconteceu é a tela de login, pelo
 * motivo `senha_alterada`.
 */
export function SecaoSenha({ tema }: { tema: Tema }) {
  const { sair } = useAutenticacao();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (salvando) return;
    if (!senhaAtual || !novaSenha) {
      setErro("Preencha a senha atual e a nova senha.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await AutenticacaoService.alterarSenha(senhaAtual, novaSenha);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      await sair("senha_alterada");
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível alterar sua senha agora."));
      setSalvando(false);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Alterar senha" icone="key-outline" />
      <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
        <CampoTexto rotulo="Senha atual" value={senhaAtual} onChangeText={setSenhaAtual} secureTextEntry editable={!salvando} />
        <CampoTexto
          rotulo="Nova senha"
          value={novaSenha}
          onChangeText={setNovaSenha}
          secureTextEntry
          textContentType="newPassword"
          editable={!salvando}
          textoAjuda="Mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo."
        />
        <CampoTexto
          rotulo="Confirmar nova senha"
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          secureTextEntry
          textContentType="newPassword"
          editable={!salvando}
          textoAjuda="Ao salvar, a sessão é encerrada em todos os aparelhos, inclusive neste."
        />
        {erro ? <ErroAcao mensagem={erro} /> : null}
        <Botao onPress={() => void salvar()} carregando={salvando} disabled={salvando}>
          Salvar nova senha
        </Botao>
      </Cartao>
    </View>
  );
}
