import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import { getBloqueioBiometricoAtivo } from "./segurancaStorage";

export interface EstadoBloqueioBiometrico {
  /** Só `true` durante a leitura inicial (hardware + preferência) — nunca depois disso. */
  carregando: boolean;
  /** Aparelho tem sensor E já tem biometria cadastrada no sistema — condição para o toggle em `SettingsScreen.tsx` poder ligar. */
  disponivelNoAparelho: boolean;
  ativo: boolean;
  /**
   * `true` quando o `RootNavigator` deve mostrar `BiometricLockScreen` em
   * vez do app. Nunca `true` se o hardware não está disponível (hardware
   * indisponível nunca deixa ninguém trancado pra fora, mesmo que a
   * preferência salva tenha ficado `true` de um cadastro biométrico
   * removido depois nas configurações do sistema).
   */
  precisaDesbloquear: boolean;
  desbloquear: () => Promise<LocalAuthentication.LocalAuthenticationResult>;
}

/**
 * "Bloqueio por biometria" (Fase 22) — trava o CONTEÚDO do app (não cria
 * nenhuma credencial nova, nem chama o backend) atrás de Face ID/impressão
 * digital, além da própria sessão já autenticada. `autenticado` vem de
 * `useAuth().status === "authenticated"`: sem sessão, não há o que
 * proteger, então o hook nunca exige desbloqueio.
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
        getBloqueioBiometricoAtivo(),
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

  // Volta a exigir desbloqueio quando o app sai para segundo plano — não só
  // na abertura fria. Sem isso, alguém que pegasse o aparelho já
  // desbloqueado pelo sistema (biometria do PRÓPRIO Android/iOS) veria o
  // ACESSO continuar aberto sem nenhuma proteção extra depois de um
  // alt-tab, esvaziando o sentido do recurso.
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
