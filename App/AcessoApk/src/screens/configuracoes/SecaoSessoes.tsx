import { useState } from "react";
import { Text, View } from "react-native";

import { AutenticacaoService } from "../../autenticacao";
import type { SessaoAtiva } from "../../autenticacao";
import { Botao, Cartao, CabecalhoSecao, ErroAcao } from "../../components/ui";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";

/** Data e hora com o `Intl.DateTimeFormat` nativo. */
function formatarDataHora(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(data);
}

/** Sessões ativas da conta, com a opção de encerrar outra sessão ou todas as outras de uma vez. */
export function SecaoSessoes({
  tema,
  sessoes,
  onAtualizarLista,
}: {
  tema: Tema;
  sessoes: SessaoAtiva[];
  onAtualizarLista: (sessoes: SessaoAtiva[]) => void;
}) {
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [encerrandoOutras, setEncerrandoOutras] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function encerrar(id: string) {
    if (processandoId || encerrandoOutras) return;
    setProcessandoId(id);
    setErro(null);
    try {
      await AutenticacaoService.revogarSessao(id);
      onAtualizarLista(sessoes.filter((sessao) => sessao.id !== id));
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível encerrar esta sessão agora."));
    } finally {
      setProcessandoId(null);
    }
  }

  async function encerrarOutras() {
    if (processandoId || encerrandoOutras) return;
    setEncerrandoOutras(true);
    setErro(null);
    try {
      await AutenticacaoService.revogarOutrasSessoes();
      onAtualizarLista(sessoes.filter((sessao) => sessao.atual));
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível encerrar as outras sessões agora."));
    } finally {
      setEncerrandoOutras(false);
    }
  }

  const outras = sessoes.filter((sessao) => !sessao.atual);

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Sessões ativas" icone="phone-portrait-outline" />
      <View style={{ gap: tema.spacing.sm }}>
        {sessoes.map((sessao) => (
          <Cartao key={sessao.id} elevacao="sm" style={{ gap: tema.spacing.xs }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textPrimary }]} numberOfLines={1}>
                {sessao.userAgent ?? "Dispositivo desconhecido"}
              </Text>
              {sessao.atual ? (
                <Text style={[tema.typography.caption, { color: tema.colors.primary.solid }]}>Esta sessão</Text>
              ) : null}
            </View>
            {sessao.ip ? (
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>IP: {sessao.ip}</Text>
            ) : null}
            {formatarDataHora(sessao.criadoEm) ? (
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
                Desde {formatarDataHora(sessao.criadoEm)}
              </Text>
            ) : null}
            {!sessao.atual ? (
              <Botao
                variant="outline"
                size="small"
                onPress={() => void encerrar(sessao.id)}
                carregando={processandoId === sessao.id}
                disabled={processandoId !== null || encerrandoOutras}
              >
                Encerrar sessão
              </Botao>
            ) : null}
          </Cartao>
        ))}
      </View>
      {erro ? <ErroAcao mensagem={erro} /> : null}
      {outras.length > 0 ? (
        <Botao
          variant="outline"
          onPress={() => void encerrarOutras()}
          carregando={encerrandoOutras}
          disabled={encerrandoOutras || processandoId !== null}
        >
          Encerrar todas as outras sessões
        </Botao>
      ) : null}
    </View>
  );
}
