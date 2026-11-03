import type { Ref } from "react";

import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import { Input } from "@/components/ui/input";

/**
 * Campo do código da verificação em duas etapas: os 6 números do aplicativo ou, no modo `recuperacao`, um
 * código de recuperação (letras e números). Rótulo de verdade, erro ligado ao campo e `autocomplete` de
 * código de uso único, para o celular sugerir o código recebido.
 */
export function CampoCodigo({
  id,
  rotulo,
  valor,
  aoMudar,
  erro,
  ajuda,
  tipo = "app",
  desabilitado,
  refInput,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  ajuda?: string;
  tipo?: "app" | "recuperacao";
  desabilitado?: boolean;
  refInput?: Ref<HTMLInputElement>;
}) {
  const recuperacao = tipo === "recuperacao";

  return (
    <Campo id={id} rotulo={rotulo} erro={erro} ajuda={ajuda}>
      <Input
        id={id}
        ref={refInput}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        inputMode={recuperacao ? "text" : "numeric"}
        autoComplete="one-time-code"
        autoCapitalize={recuperacao ? "characters" : "off"}
        spellCheck={false}
        maxLength={recuperacao ? 20 : 7}
        disabled={desabilitado}
        aria-invalid={Boolean(erro)}
        aria-describedby={descricao(id, Boolean(ajuda), Boolean(erro))}
        className="min-h-12 text-center font-mono text-lg tracking-widest"
      />
    </Campo>
  );
}
