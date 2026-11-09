import { useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Pencil, RefreshCw, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extrairMensagemErro } from "@/services/api";
import { postagensService } from "@/services/postagens.service";
import { useVoz } from "@/hooks/useVoz";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { OrientacaoDeDescricao } from "./OrientacaoDeDescricao";
import { useIdioma } from "@/hooks/useIdioma";

type Modo = "escolha" | "ia" | "manual";

/**
 * Campo de descrição acessível de uma imagem, com duas formas de criar o texto, sempre visíveis e
 * com o mesmo peso:
 * - "Descrever com IA": envia a imagem para o backend (que usa a OpenRouter) e mostra uma sugestão
 *   sempre editável, que nunca é salva sozinha. A IA só é chamada quando o usuário clica.
 * - "Escrever minha própria descrição": campo de texto comum, sem chamada de rede; funciona mesmo
 *   sem IA disponível.
 *
 * `obterImagem` é assíncrono e só roda no clique de "Descrever com IA": no formulário de publicação
 * já é o `File` em mãos; ao editar um anexo publicado, é um `fetch` da própria imagem (veja
 * `GaleriaAnexos.tsx`).
 */
export function CampoDescricaoImagem({
  id,
  value,
  onChange,
  obterImagem,
  rotulo,
}: {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  obterImagem: () => Promise<File | Blob>;
  rotulo?: string;
}) {
  const { t, idioma } = useIdioma();
  const [modo, setModo] = useState<Modo>(value ? "manual" : "escolha");
  const idAnuncio = useId();
  const { falar } = useVoz();
  // `preferencias.screenReader` é o único indicador de que a voz está ativa, e não `escolha`, que
  // só registra a resposta do primeiro acesso.
  const { preferencias } = useAcessibilidade();

  // Sem chave da OpenRouter no servidor, o botão "Descrever com IA" não aparece: um botão que
  // sempre dá erro é pior do que botão nenhum. A resposta vale para a sessão inteira.
  const disponibilidade = useQuery({
    queryKey: ["sugestao-descricao", "disponibilidade"],
    queryFn: () => postagensService.sugestaoDeDescricaoDisponivel(),
    staleTime: Infinity,
    retry: false,
  });

  // Só esconde quando o servidor disse que NÃO. Enquanto a resposta não chega (ou se a pergunta
  // falhar), o botão continua lá — era o que já acontecia antes.
  const iaDisponivel = disponibilidade.data !== false;

  // "Como você deseja descrever?" com uma opção só não é escolha: vai direto para o campo.
  const modoEfetivo: Modo = !iaDisponivel && modo !== "manual" ? "manual" : modo;

  const sugerir = useMutation({
    mutationFn: async () => {
      const imagem = await obterImagem();
      return postagensService.sugerirDescricao(imagem, idioma);
    },
    onSuccess: (descricao) => {
      onChange(descricao);
      // Lê a sugestão em voz alta só pra quem ativou a leitura por voz:
      // ajuda a conferir se a IA acertou sem precisar ler o campo pequeno
      // na tela. Nunca fala sozinho se a pessoa desligou esse recurso.
      // Não é um toast: nenhuma duplicação possível aqui.
      if (preferencias.screenReader) {
        falar(t("feed.campoDescricaoImagem.sugestaoDaInteligencia", { var1: descricao }));
      }
    },
  });

  if (modoEfetivo === "escolha") {
    return (
      <div className="space-y-2">
        <p id={`${id}-legenda`} className="text-xs font-semibold">
          {t("feed.campoDescricaoImagem.comoVoceDesejaDescreverEsta")}
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
            <Sparkles className="size-3.5" aria-hidden="true" /> {t("feed.campoDescricaoImagem.descreverComIa")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
            onClick={() => setModo("manual")}
          >
            <Pencil className="size-3.5" aria-hidden="true" /> {t("feed.campoDescricaoImagem.escreverMinhaPropriaDescricao")}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t("feed.campoDescricaoImagem.avisoServicoExterno", {
            botao: t("feed.campoDescricaoImagem.descreverComIa"),
          })}
        </p>
        <OrientacaoDeDescricao />
      </div>
    );
  }

  if (modoEfetivo === "ia") {
    return (
      <div className="space-y-2">
        <div id={idAnuncio} role="status" aria-live="polite" className="sr-only">
          {sugerir.isPending
            ? t("feed.campoDescricaoImagem.gerandoSugestaoDeDescricaoDa")
            : sugerir.isSuccess
              ? t("feed.campoDescricaoImagem.sugestaoDeDescricaoGerada")
              : ""}
        </div>

        {sugerir.isPending && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> {t("feed.campoDescricaoImagem.gerandoSugestaoDeDescricao")}
          </p>
        )}

        {sugerir.isError && (
          <div role="alert" className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-2">
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {t("feed.campoDescricaoImagem.naoFoiPossivelGerarADescricao")}
            </p>
            <p className="text-[11px] text-muted-foreground">{extrairMensagemErro(sugerir.error, "")}</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => sugerir.mutate()}>
                <RefreshCw className="size-3.5" aria-hidden="true" /> {t("raiz.tentarNovamente")}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setModo("manual")}>
                {t("feed.campoDescricaoImagem.escreverMinhaPropriaDescricao")}
              </Button>
            </div>
          </div>
        )}

        {sugerir.isSuccess && (
          <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs font-semibold">
              {t("feed.campoDescricaoImagem.sugestaoDaIaReviseAntesDe")}
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
                <RefreshCw className="size-3.5" aria-hidden="true" /> {t("feed.campoDescricaoImagem.gerarNovamente")}
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
                <X className="size-3.5" aria-hidden="true" /> {t("feed.campoDescricaoImagem.escreverMinhaPropria")}
              </Button>
            </div>
            <OrientacaoDeDescricao />
          </div>
        )}
      </div>
    );
  }

  // modoEfetivo === "manual": sempre disponível, sem nenhuma chamada de IA.
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold">
        {rotulo ?? t("feed.campoDescricaoImagem.descricaoDaImagem")}
      </Label>
      <Input
        id={id}
        value={value}
        maxLength={500}
        placeholder={t("feed.campoDescricaoImagem.descrevaOQueApareceNestaImagem")}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-xs"
      />
      {iaDisponivel && (
        <Button
          type="button"
          size="sm"
          variant="link"
          className="h-auto p-0 text-xs font-semibold"
          onClick={() => setModo("escolha")}
        >
          <Sparkles className="size-3.5" aria-hidden="true" /> {t("feed.campoDescricaoImagem.descreverComIaEmVezDisso")}
        </Button>
      )}
      <OrientacaoDeDescricao />
    </div>
  );
}
