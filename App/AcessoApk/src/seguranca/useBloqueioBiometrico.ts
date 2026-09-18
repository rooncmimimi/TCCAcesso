import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import { obterBloqueioBiometricoAtivo } from "./armazenamentoSeguranca";

export interface EstadoBloqueioBiometrico {
  /** Só `true` durante a leitura inicial (hardware + preferência), nunca depois disso. */
  carregando: boolean;
  /**
   * Aparelho com sensor e biometria cadastrada no sistema; sem isso, a opção em Configurações
   * (`SecaoBiometria`) não pode ser ligada.
   */
  disponivelNoAparelho: boolean;
  ativo: boolean;
  /**
   * `true` quando o `RaizNavigator` deve mostrar a tela de desbloqueio em vez do app. Nunca fica
   * `true` sem biometria disponível, para ninguém ficar trancado fora se a biometria for removida
   * do aparelho depois de ativar a opção.
   */
  precisaDesbloquear: boolean;
  desbloquear: () => Promise<LocalAuthentication.LocalAuthenticationResult>;
}

/**
 * Bloqueio por biometria: esconde o conteúdo do app atrás de Face ID ou impressão digital, além da
 * sessão já autenticada. Não cria credencial nem chama o backend. Sem sessão (`autenticado` falso)
 * não há o que proteger, então nunca pede desbloqueio.
 */
export function useBloqueioBiometrico(autenticado: boolean): EstadoBloqueioBiometrico {
  const [carregando, setCarregando] = useState(true);
  const [disponivelNoAparelho, setDisponivelNoAparelho] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const [desbloqueado, setDesbloqueado] = useState(false);

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

  // Volta a pedir desbloqueio quando o app vai para segundo plano, e não só ao abrir. Sem isso,
  // quem pegasse o aparelho já desbloqueado veria o ACESSO aberto depois de uma simples troca de
  // app.
  useEffect(() => {
    const assinatura = AppState.addEventListener("change", (proximoEstado) => {
      if (proximoEstado === "background") setDesbloqueado(false);
    });
    return () => assinatura.remove();
  }, []);

  const desbloquear = useCallback(async () => {
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: "Desbloqueie o ACESSO",
      cancelLabel: "Cancelar",
    });
    if (resultado.success) setDesbloqueado(true);
    return resultado;
  }, []);

  return {
    carregando,
    disponivelNoAparelho,
    ativo,
    precisaDesbloquear: autenticado && ativo && disponivelNoAparelho && !desbloqueado,
    desbloquear,
  };
}
