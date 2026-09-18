import { useState } from "react";
import { View } from "react-native";

import { Cartao, LinhaInterruptor, CabecalhoSecao, ErroAcao } from "../../components/ui";
import type { PreferenciasNotificacao } from "../../configuracoes";
import { ConfiguracoesService } from "../../configuracoes";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";

/** Categorias de notificação; cada chave é salva no backend assim que muda. */
export function SecaoNotificacoes({
  tema,
  prefs,
  onAtualizar,
}: {
  tema: Tema;
  prefs: PreferenciasNotificacao;
  onAtualizar: (prefs: PreferenciasNotificacao) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar(campo: keyof Pick<PreferenciasNotificacao, "vagasCandidaturas" | "mensagens" | "publicacoesComentarios" | "redeSeguidores">, valor: boolean) {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await ConfiguracoesService.atualizarPreferenciasNotificacao({ [campo]: valor });
      onAtualizar(atualizado);
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível atualizar agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Notificações" icone="notifications-outline" />
      <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
        <LinhaInterruptor
          rotulo="Vagas e candidaturas"
          value={prefs.vagasCandidaturas}
          onValueChange={(valor) => void alternar("vagasCandidaturas", valor)}
        />
        <LinhaInterruptor rotulo="Mensagens" value={prefs.mensagens} onValueChange={(valor) => void alternar("mensagens", valor)} />
        <LinhaInterruptor
          rotulo="Publicações e comentários"
          value={prefs.publicacoesComentarios}
          onValueChange={(valor) => void alternar("publicacoesComentarios", valor)}
        />
        <LinhaInterruptor
          rotulo="Rede (seguidores)"
          value={prefs.redeSeguidores}
          onValueChange={(valor) => void alternar("redeSeguidores", valor)}
        />
        {erro ? <ErroAcao mensagem={erro} /> : null}
      </Cartao>
    </View>
  );
}
