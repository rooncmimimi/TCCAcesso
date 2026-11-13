import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, CornerLeftUp, Minus, MousePointerClick, Pause, Play, Plus, ScanLine, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useVarredura } from "@/hooks/useVarredura";
import { dentroDeGrupo } from "@/lib/motorDeVarredura";
import { LIMITES } from "@/lib/preferenciasMotoras";
import type { Item } from "@/lib/varredura";
import { useIdioma } from "@/hooks/useIdioma";

/** Contorno que acompanha o item destacado. Posicionado com `fixed`; nunca altera o elemento percorrido. */
function Realce({ item, reduzirMovimento }: { item: Item | null; reduzirMovimento: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const realce = ref.current;

    if (!item || !realce) return undefined;

    const alvo = item.filhos?.[0].elemento ?? item.elemento;
    const caixa = alvo.getBoundingClientRect();
    const dentro = caixa.top >= 0 && caixa.bottom <= window.innerHeight && caixa.left >= 0 && caixa.right <= window.innerWidth;

    // Só rola quando o item não está todo visível: rolar a cada passo cansaria e confundiria.
    if (!dentro) alvo.scrollIntoView({ block: "center", inline: "nearest", behavior: reduzirMovimento ? "auto" : "smooth" });

    let quadro = 0;
    let anterior = "";

    const seguir = () => {
      if (!item.elemento.isConnected) {
        realce.style.display = "none";
      } else {
        const r = item.elemento.getBoundingClientRect();
        const chave = `${r.top}|${r.left}|${r.width}|${r.height}`;

        if (chave !== anterior) {
          anterior = chave;
          realce.style.display = "block";
          realce.style.top = `${r.top - 4}px`;
          realce.style.left = `${r.left - 4}px`;
          realce.style.width = `${r.width + 8}px`;
          realce.style.height = `${r.height + 8}px`;
        }
      }

      quadro = requestAnimationFrame(seguir);
    };

    seguir();

    return () => cancelAnimationFrame(quadro);
  }, [item, reduzirMovimento]);

  return <div ref={ref} aria-hidden="true" className="varredura-realce" data-grupo={item?.filhos ? "true" : "false"} style={{ display: "none" }} />;
}

/**
 * Painel da varredura com um botão. Aparece quando a pessoa liga a varredura em Configurações e
 * oferece: iniciar, pausar e continuar, avançar, voltar, selecionar (o que o clique de um acionador
 * faz), sair do grupo, parar e mudar a velocidade. Também serve de apoio para quem usa o mouse ou o
 * toque no lugar de um acionador.
 *
 * O painel nunca é percorrido pela própria varredura (`data-varredura-ignorar`), e sua ação por
 * ponteiro não fecha diálogos abertos (o Radix fecha ao clicar fora, e este painel fica fora).
 */
export function BarraDeVarredura() {
  const { preferencias } = useAcessibilidade();

  if (!preferencias.scanning) return null;

  return <BarraAtiva />;
}

function BarraAtiva() {
  const { t } = useIdioma();
  const { preferencias, rascunho, salvar } = useAcessibilidade();
  const v = useVarredura();
  const rodando = v.estado.fase === "rodando";
  const parada = v.estado.fase === "parada";
  const dentro = dentroDeGrupo(v.estado);

  const mudarVelocidade = (passo: number) => {
    const nova = Math.round(Math.min(LIMITES.scanSpeed.max, Math.max(LIMITES.scanSpeed.min, preferencias.scanSpeed + passo)) * 10) / 10;

    salvar({ ...rascunho, scanSpeed: nova });
  };

  const aoPonteiro = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <>
      <Realce item={v.item} reduzirMovimento={v.reduzirMovimento} />

      <div role="status" aria-live="polite" className="sr-only" data-varredura-ignorar>
        {v.aviso}
      </div>

      <section
        aria-label={t("acessibilidade.barraDeVarredura.varreduraComUmBotao")}
        data-varredura-ignorar
        onPointerDown={aoPonteiro}
        style={{ pointerEvents: "auto" }}
        className={`fixed bottom-2 left-1/2 z-[70] -translate-x-1/2 rounded-2xl border-2 border-primary bg-card p-2 shadow-2xl ${parada ? "w-auto" : "w-[calc(100%-1rem)] max-w-2xl"}`}
      >
        {parada ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" className="min-h-11 gap-2" onClick={v.iniciar}>
              <ScanLine className="size-4" aria-hidden="true" /> {t("acessibilidade.barraDeVarredura.iniciarVarredura")}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={t("acessibilidade.barraDeVarredura.desligarAVarreduraComUmBotao")} onClick={() => salvar({ ...rascunho, scanning: false })}>
              <X className="size-4" aria-hidden="true" />
            </Button>
            {v.aviso ? (
              <p className="basis-full text-center text-xs text-muted-foreground" aria-hidden="true">
                {v.aviso}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold" aria-hidden="true">
              {v.emCampo ? "Campo ativo: digite ou dite. Esc volta à varredura." : v.estado.fase === "pausada" ? "Pausada em:" : "Agora:"} <span className="font-bold">{v.emCampo ? "" : (v.item?.rotulo ?? "")}</span>
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" className="min-h-11 gap-2" onClick={v.selecionar} disabled={v.emCampo}>
                <MousePointerClick className="size-4" aria-hidden="true" /> {t("acessibilidade.barraDeVarredura.selecionar")}
              </Button>
              <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={rodando ? v.pausar : v.retomar}>
                {rodando ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />} {rodando ? "Pausar" : "Continuar"}
              </Button>
              <Button type="button" variant="outline" className="min-h-11 gap-1" onClick={v.anterior} aria-label={t("acessibilidade.barraDeVarredura.voltarAoItemAnterior")} disabled={v.emCampo}>
                <ArrowLeft className="size-4" aria-hidden="true" /> {t("auth.voltar")}
              </Button>
              <Button type="button" variant="outline" className="min-h-11 gap-1" onClick={v.proximo} aria-label={t("acessibilidade.barraDeVarredura.avancarParaOProximoItem")} disabled={v.emCampo}>
                {t("acessibilidade.barraDeVarredura.avancar")} <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              {dentro ? (
                <Button type="button" variant="secondary" className="min-h-11 gap-2" onClick={v.sairDoGrupo}>
                  <CornerLeftUp className="size-4" aria-hidden="true" /> {t("acessibilidade.barraDeVarredura.sairDoGrupo")}
                </Button>
              ) : null}
              <Button type="button" variant="destructive" className="min-h-11 gap-2" onClick={v.parar}>
                <Square className="size-4" aria-hidden="true" /> {t("acessibilidade.barraDeVarredura.parar")}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span id="varredura-velocidade">
                {t("acessibilidade.barraDeVarredura.velocidadePorItem", {
                  velocidade: preferencias.scanSpeed.toFixed(1).replace(".", ","),
                })}
              </span>
              <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" aria-label={t("acessibilidade.barraDeVarredura.maisDevagar")} onClick={() => mudarVelocidade(0.3)} disabled={preferencias.scanSpeed >= LIMITES.scanSpeed.max}>
                <Minus className="size-4" aria-hidden="true" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" aria-label={t("acessibilidade.barraDeVarredura.maisRapido")} onClick={() => mudarVelocidade(-0.3)} disabled={preferencias.scanSpeed <= LIMITES.scanSpeed.min}>
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
