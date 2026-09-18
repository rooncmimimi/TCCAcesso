import { useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAutenticacao } from "../../autenticacao";
import {
  Botao,
  Cartao,
  ControleSegmentado,
  LinhaInterruptor,
  CabecalhoSecao,
  ErroAcao,
} from "../../components/ui";
import type { PreferenciaMensagens } from "../../configuracoes";
import { ConfiguracoesService } from "../../configuracoes";
import type { PerfilStackParamList } from "../../navigation/types";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";

const ROTULOS_PREFERENCIA_MENSAGENS: Record<PreferenciaMensagens, string> = {
  todos: "Todos",
  seguidores: "Só meus seguidores",
  seguindo: "Só quem eu sigo",
  mutuo: "Seguimos um ao outro",
  empresas: "Só empresas",
  ninguem: "Ninguém",
};

/**
 * Perfil público ou privado e quem pode iniciar conversas, com atalho para a lista de usuários
 * bloqueados.
 */
export function SecaoPrivacidade({ tema }: { tema: Tema }) {
  const { usuario } = useAutenticacao();
  const navigation = useNavigation<NativeStackNavigationProp<PerfilStackParamList>>();
  const [perfilPublico, setPerfilPublico] = useState(usuario?.perfilPublico !== false);
  const [preferenciaMensagens, setPreferenciaMensagens] = useState<PreferenciaMensagens>(
    (usuario?.preferenciaMensagens as PreferenciaMensagens) ?? "todos",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternarPerfilPublico(valor: boolean) {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const novo = await ConfiguracoesService.atualizarPrivacidade(valor);
      setPerfilPublico(novo);
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível atualizar agora."));
    } finally {
      setSalvando(false);
    }
  }

  async function mudarPreferenciaMensagens(valor: PreferenciaMensagens) {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const nova = await ConfiguracoesService.atualizarPreferenciaMensagens(valor);
      setPreferenciaMensagens(nova);
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível atualizar agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Privacidade" icone="lock-closed-outline" />
      <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
        <LinhaInterruptor
          rotulo="Perfil público"
          descricao="Com o perfil privado, quem quiser te seguir precisa enviar uma solicitação, que você aprova ou recusa."
          value={perfilPublico}
          onValueChange={(valor) => void alternarPerfilPublico(valor)}
        />
        <ControleSegmentado
          rotulo="Quem pode te enviar mensagens"
          value={preferenciaMensagens}
          onChange={(valor) => void mudarPreferenciaMensagens(valor)}
          opcoes={(Object.keys(ROTULOS_PREFERENCIA_MENSAGENS) as PreferenciaMensagens[]).map((valor) => ({
            rotulo: ROTULOS_PREFERENCIA_MENSAGENS[valor],
            value: valor,
          }))}
        />
        {erro ? <ErroAcao mensagem={erro} /> : null}
        <Botao variant="outline" onPress={() => navigation.navigate("BlockedUsers")}>
          Usuários bloqueados
        </Botao>
      </Cartao>
    </View>
  );
}
