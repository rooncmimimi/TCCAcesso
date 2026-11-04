import type { Ref } from "react";

import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import { Input } from "@/components/ui/input";

/**
 * Campo de um código de 6 números (o que chega por e-mail ou SMS). Rótulo de verdade, erro ligado ao campo e `autocomplete` de
 * código de uso único, para o celular sugerir o código recebido.
 */
export function CampoCodigo({
  id,
  rotulo,
  valor,
  aoMudar,
  erro,
  ajuda,
  desabilitado,
  refInput,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  ajuda?: string;
  desabilitado?: boolean;
  refInput?: Ref<HTMLInputElement>;
}) {
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} ajuda={ajuda}>
      <Input
        id={id}
        ref={refInput}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={7}
        disabled={desabilitado}
        aria-invalid={Boolean(erro)}
        aria-describedby={descricao(id, Boolean(ajuda), Boolean(erro))}
        className="min-h-12 text-center font-mono text-lg tracking-widest"
      />
    </Campo>
  );
}
