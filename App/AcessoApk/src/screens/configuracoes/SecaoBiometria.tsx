import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Cartao, LinhaInterruptor, CabecalhoSecao, ErroAcao } from "../../components/ui";
import { obterBloqueioBiometricoAtivo, definirBloqueioBiometricoAtivo } from "../../seguranca";
import type { Tema } from "../../tema";

/**
 * Bloqueio por biometria. O controle só aparece quando o aparelho tem biometria disponível e
 * cadastrada (`hasHardwareAsync` e `isEnrolledAsync`); sem isso, a seção explica como cadastrar. A
 * preferência é local (`seguranca/armazenamentoSeguranca.ts`), e quem aplica o bloqueio é o
 * `useSeguranca()`.
 */
export function SecaoBiometria({ tema }: { tema: Tema }) {
  const [carregando, setCarregando] = useState(true);
  const [disponivelNoAparelho, setDisponivelNoAparelho] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function carregar() {
      const [hardware, matriculado, preferenciaAtiva] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        obterBloqueioBiometricoAtivo(),
      ]);
      if (!vivo) return;
      setDisponivelNoAparelho(hardware && matriculado);
      setAtivo(preferenciaAtiva);
      setCarregando(false);
    }

    void carregar();
    return () => {
      vivo = false;
    };
  }, []);

  async function alternar(valor: boolean) {
    setErro(null);
    try {
      await definirBloqueioBiometricoAtivo(valor);
      setAtivo(valor);
    } catch {
      setErro("Não foi possível salvar esta preferência agora.");
    }
  }

  if (carregando) return null;

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Segurança do aparelho" icone="finger-print-outline" />
      <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
        {disponivelNoAparelho ? (
          <LinhaInterruptor
            rotulo="Bloqueio por biometria"
            descricao="Exige sua digital ou reconhecimento facial para abrir o ACESSO, além do login."
            value={ativo}
            onValueChange={(valor) => void alternar(valor)}
          />
        ) : (
          <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
            Cadastre uma biometria (digital ou reconhecimento facial) nas configurações do aparelho para usar o
            bloqueio do ACESSO.
          </Text>
        )}
        {erro ? <ErroAcao mensagem={erro} /> : null}
      </Cartao>
    </View>
  );
}
