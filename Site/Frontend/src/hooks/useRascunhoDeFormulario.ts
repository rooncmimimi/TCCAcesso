import { useCallback, useEffect, useState } from "react";

import {
  aplicarRascunho,
  apagarRascunho,
  lerRascunho,
  salvarRascunho,
  type Rascunho,
} from "@/lib/rascunhoDeFormulario";

/** Espera depois da última tecla antes de gravar, para não gravar a cada letra. */
export const ESPERA_DO_RASCUNHO_MS = 800;

/**
 * Rascunho automático de um formulário (`lib/rascunhoDeFormulario.ts` explica os cuidados).
 *
 * `ref` vai no `<form>` (é uma função de ref, porque o formulário de um diálogo só existe com o
 * diálogo aberto). `ativo` diz se o formulário está na tela. `limpar` é para chamar quando o
 * salvamento de verdade der certo.
 */
export function useRascunhoDeFormulario({
  chave,
  campos,
  ativo,
}: {
  chave: string;
  /** Nomes dos campos de texto que podem ser guardados. Nada fora desta lista é gravado. */
  campos: readonly string[];
  ativo: boolean;
}) {
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const [disponivel, setDisponivel] = useState<Rascunho | null>(null);

  // O campo nomes vira texto para não regravar a cada render de quem passa um array novo.
  const camposChave = campos.join("|");

  // Ao abrir, vê se há rascunho de uma sessão anterior.
  useEffect(() => {
    setDisponivel(ativo ? lerRascunho(chave) : null);
  }, [ativo, chave]);

  // Enquanto o formulário está na tela, grava o que a pessoa escreve (com espera).
  useEffect(() => {
    if (!ativo || !form) return;
    const permitidos = camposChave.split("|");
    let espera: ReturnType<typeof setTimeout> | undefined;

    const aoDigitar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => salvarRascunho(chave, form, permitidos), ESPERA_DO_RASCUNHO_MS);
    };

    form.addEventListener("input", aoDigitar);
    return () => {
      form.removeEventListener("input", aoDigitar);
      clearTimeout(espera);
    };
  }, [ativo, form, chave, camposChave]);

  const restaurar = useCallback(() => {
    if (form && disponivel) aplicarRascunho(form, disponivel, camposChave.split("|"));
    setDisponivel(null);
  }, [form, disponivel, camposChave]);

  const descartar = useCallback(() => {
    apagarRascunho(chave);
    setDisponivel(null);
  }, [chave]);

  return { ref: setForm, rascunho: disponivel, restaurar, descartar, limpar: descartar };
}
