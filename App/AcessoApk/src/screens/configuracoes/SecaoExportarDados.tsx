import { useState } from "react";
import { Text, View } from "react-native";

import { useAcessibilidade } from "../../acessibilidade";
import { useAutenticacao } from "../../autenticacao";
import { Botao, Cartao, CabecalhoSecao, ErroAcao } from "../../components/ui";
import { coletarMeusDados, exportarECompartilhar } from "../../seguranca";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";

/**
 * Exportar meus dados (portabilidade prevista na LGPD): gera um JSON com conta, perfil e
 * preferências e abre o compartilhamento do aparelho. Publicações, comentários e mensagens ficam de
 * fora (ver `seguranca/exportarDados.ts`).
 */
export function SecaoExportarDados({ tema }: { tema: Tema }) {
  const { usuario } = useAutenticacao();
  const { preferencias } = useAcessibilidade();
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function exportar() {
    if (exportando || !usuario) return;
    setExportando(true);
    setErro(null);
    try {
      const dados = await coletarMeusDados(usuario, preferencias);
      await exportarECompartilhar(dados);
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível exportar seus dados agora."));
    } finally {
      setExportando(false);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Seus dados" icone="download-outline" />
      <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
          Baixe uma cópia dos dados que o ACESSO guarda sobre você: dados da conta, perfil e preferências.
        </Text>
        {erro ? <ErroAcao mensagem={erro} /> : null}
        <Botao variant="outline" onPress={() => void exportar()} carregando={exportando} disabled={exportando}>
          Exportar meus dados
        </Botao>
      </Cartao>
    </View>
  );
}
