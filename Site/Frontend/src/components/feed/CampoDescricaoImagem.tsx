import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Pencil, RefreshCw, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extrairMensagemErro } from "@/services/api";
import { postagensService } from "@/services/postagens.service";

type Modo = "escolha" | "ia" | "manual";

/**
 * Campo de descrição acessível de uma imagem, com duas formas de criar o
 * texto — sempre visíveis com o mesmo peso, nunca uma escondida atrás da
 * outra:
 *
 * - "Descrever com IA": envia a imagem para o backend (que usa a
 *   OpenRouter) e mostra uma sugestão — sempre editável, nunca salva
 *   sozinha. Só chama a IA quando o usuário clica, nunca automaticamente.
 * - "Escrever minha própria descrição": campo de texto comum, sem
 *   nenhuma chamada de rede — funciona mesmo sem IA configurada/disponível.
 *
 * `obterImagem` é assíncrono e só é chamado no clique de "Descrever com
 * IA" — no composer já é o `File` em mãos; ao editar um anexo já
 * publicado, é um `fetch` da própria imagem (ver GaleriaAnexos.tsx).
 */
export function CampoDescricaoImagem({
  id,
  value,
  onChange,
  obterImagem,
  rotulo = "Descrição da imagem (opcional)",
}: {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  obterImagem: () => Promise<File | Blob>;
  rotulo?: string;
}) {
  const [modo, setModo] = useState<Modo>(value ? "manual" : "escolha");
  const idAnuncio = useId();

  const sugerir = useMutation({
    mutationFn: async () => {
      const imagem = await obterImagem();
      return postagensService.sugerirDescricao(imagem);
    },
    onSuccess: (descricao) => onChange(descricao),
  });

  if (modo === "escolha") {
    return (
      <div className="space-y-2">
        <p id={`${id}-legenda`} className="text-xs font-semibold">
          Como você deseja descrever esta imagem?
        </p>
        <div role="group" aria-labelledby={`${id}-legenda`} className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
            onClick={() => {
              setModo("ia");
              sugerir.mutate();
            }}
          >
            <Sparkles className="size-3.5" aria-hidden="true" /> Descrever com IA
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
            onClick={() => setModo("manual")}
          >
            <Pencil className="size-3.5" aria-hidden="true" /> Escrever minha própria descrição
          </Button>
        </div>
      </div>
    );
  }

  if (modo === "ia") {
    return (
      <div className="space-y-2">
        <div id={idAnuncio} role="status" aria-live="polite" className="sr-only">
          {sugerir.isPending
            ? "Gerando sugestão de descrição da imagem. Aguarde."
            : sugerir.isSuccess
              ? "Sugestão de descrição gerada. Revise o texto antes de confirmar."
              : ""}
        </div>

        {sugerir.isPending && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Gerando sugestão de descrição…
          </p>
        )}

        {sugerir.isError && (
          <div role="alert" className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-2">
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Não foi possível gerar a descrição automaticamente. Você pode escrever uma descrição manualmente.
            </p>
            <p className="text-[11px] text-muted-foreground">{extrairMensagemErro(sugerir.error, "")}</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => sugerir.mutate()}>
                <RefreshCw className="size-3.5" aria-hidden="true" /> Tentar novamente
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setModo("manual")}>
                Escrever minha própria descrição
              </Button>
            </div>
          </div>
        )}

        {sugerir.isSuccess && (
          <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs font-semibold">
              Sugestão da IA — revise antes de confirmar
            </Label>
            <Input
              id={id}
              value={value}
              maxLength={500}
              onChange={(e) => onChange(e.target.value)}
              aria-describedby={idAnuncio}
              className="h-9 text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={sugerir.isPending}
                onClick={() => sugerir.mutate()}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" /> Gerar novamente
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  onChange("");
                  setModo("manual");
                }}
              >
                <X className="size-3.5" aria-hidden="true" /> Escrever minha própria
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // modo === "manual" — sempre disponível, sem nenhuma chamada de IA.
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold">
        {rotulo}
      </Label>
      <Input
        id={id}
        value={value}
        maxLength={500}
        placeholder="Descreva o que aparece nesta imagem para pessoas que utilizam leitores de tela"
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-xs"
      />
      <Button
        type="button"
        size="sm"
        variant="link"
        className="h-auto p-0 text-xs font-semibold"
        onClick={() => setModo("escolha")}
      >
        <Sparkles className="size-3.5" aria-hidden="true" /> Descrever com IA em vez disso
      </Button>
    </div>
  );
}
