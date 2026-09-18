import { useState } from "react";
import { Alert, Text, View } from "react-native";

import { AutenticacaoService, useAutenticacao } from "../../autenticacao";
import { Botao, Cartao, CampoTexto, CabecalhoSecao, ErroAcao } from "../../components/ui";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";

/** Confirmação nativa antes de pausar ou excluir, com o texto do botão de cada ação. */
function confirmarAcaoDestrutiva(titulo: string, mensagem: string, textoBotao: string, aoConfirmar: () => void) {
  Alert.alert(titulo, mensagem, [
    { text: "Cancelar", style: "cancel" },
    { text: textoBotao, style: "destructive", onPress: aoConfirmar },
  ]);
}

/**
 * Pausar ou excluir a conta, com a senha atual e confirmação. Depois da chamada, `sair()` encerra a
 * sessão local, porque o backend já revogou as sessões da conta.
 */
export function SecaoZonaDePerigo({ tema }: { tema: Tema }) {
  const { sair } = useAutenticacao();
  const [modo, setModo] = useState<"nenhum" | "pausar" | "excluir">("nenhum");
  const [senha, setSenha] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function abrir(novoModo: "pausar" | "excluir") {
    setModo(novoModo);
    setSenha("");
    setErro(null);
  }

  function cancelar() {
    setModo("nenhum");
    setSenha("");
    setErro(null);
  }

  async function pausar() {
    if (processando || !senha) return;
    setProcessando(true);
    setErro(null);
    try {
      await AutenticacaoService.pausarConta(senha);
      await sair();
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível pausar sua conta agora."));
      setProcessando(false);
    }
  }

  async function excluir() {
    if (processando || !senha) return;
    setProcessando(true);
    setErro(null);
    try {
      await AutenticacaoService.excluirConta(senha);
      await sair();
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível excluir sua conta agora."));
      setProcessando(false);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Zona de perigo" icone="warning-outline" />
      <Cartao elevacao="sm" style={{ gap: tema.spacing.md, borderColor: tema.colors.error.solid }}>
        <View style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Pausar conta</Text>
          <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
            Sua conta fica invisível para outras pessoas. Você pode reativá-la a qualquer momento fazendo login de
            novo.
          </Text>
        </View>
        {modo === "pausar" ? (
          <View style={{ gap: tema.spacing.xs }}>
            <CampoTexto rotulo="Confirme sua senha" value={senha} onChangeText={setSenha} secureTextEntry editable={!processando} />
            {erro ? <ErroAcao mensagem={erro} /> : null}
            <Botao
              variant="destructive"
              onPress={() =>
                confirmarAcaoDestrutiva("Pausar conta", "Você poderá reativar fazendo login novamente. Continuar?", "Pausar", () => void pausar())
              }
              carregando={processando}
              disabled={processando || !senha}
            >
              Confirmar pausa
            </Botao>
            <Botao variant="ghost" onPress={cancelar} disabled={processando}>
              Cancelar
            </Botao>
          </View>
        ) : (
          <Botao variant="outline" onPress={() => abrir("pausar")}>
            Pausar minha conta
          </Botao>
        )}

        <View style={{ gap: tema.spacing.xs, marginTop: tema.spacing.sm }}>
          <Text style={[tema.typography.label, { color: tema.colors.error.solid }]}>Excluir conta</Text>
          <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
            Ação definitiva. Todos os seus dados são apagados e não podem ser recuperados.
          </Text>
        </View>
        {modo === "excluir" ? (
          <View style={{ gap: tema.spacing.xs }}>
            <CampoTexto rotulo="Confirme sua senha" value={senha} onChangeText={setSenha} secureTextEntry editable={!processando} />
            {erro ? <ErroAcao mensagem={erro} /> : null}
            <Botao
              variant="destructive"
              onPress={() =>
                confirmarAcaoDestrutiva(
                  "Excluir conta",
                  "Esta ação é definitiva e não pode ser desfeita. Todos os seus dados serão apagados. Continuar?",
                  "Excluir",
                  () => void excluir(),
                )
              }
              carregando={processando}
              disabled={processando || !senha}
            >
              Confirmar exclusão
            </Botao>
            <Botao variant="ghost" onPress={cancelar} disabled={processando}>
              Cancelar
            </Botao>
          </View>
        ) : (
          <Botao variant="destructive" onPress={() => abrir("excluir")}>
            Excluir minha conta
          </Botao>
        )}
      </Cartao>
    </View>
  );
}
