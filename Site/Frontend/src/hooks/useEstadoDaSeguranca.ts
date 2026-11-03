import { useQuery } from "@tanstack/react-query";

import segurancaService from "@/services/seguranca.service";

export const CHAVE_ESTADO_SEGURANCA = ["seguranca", "estado"] as const;

/** O recurso está ligado no servidor? Uma consulta só, compartilhada pelas telas de segurança e pelo login. */
export function useEstadoDaSeguranca() {
  return useQuery({
    queryKey: CHAVE_ESTADO_SEGURANCA,
    queryFn: () => segurancaService.estado(),
    staleTime: 5 * 60 * 1000,
  });
}
