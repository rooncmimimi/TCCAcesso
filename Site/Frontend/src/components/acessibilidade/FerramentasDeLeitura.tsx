import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, BookMarked, BookOpenText, Compass, HelpCircle, History, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  PainelExplicaPagina,
  PainelGlossario,
  PainelHistorico,
  PainelOndeEstou,
  type FotoDaPagina,
} from "@/components/acessibilidade/PaineisDeAjuda";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { termosNoTexto } from "@/dados/glossario";
import { coletarOndeEstou } from "@/lib/ondeEstou";
import type { PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";

type Visao = "menu" | "onde" | "pagina" | "glossario" | "historico";

const TITULOS: Record<Visao, { titulo: string; descricao: string }> = {
  menu: { titulo: "Ferramentas de leitura e ajuda", descricao: "Entenda a página, ache termos difíceis e ajuste a leitura." },
  onde: { titulo: "Onde estou?", descricao: "A página, a seção e a ação principal desta tela." },
  pagina: { titulo: "Explique esta página", descricao: "O que esta página faz, em linguagem simples." },
  glossario: { titulo: "Glossário", descricao: "Termos de vagas e de trabalho, explicados de forma simples." },
  historico: { titulo: "Meu histórico de instruções", descricao: "As explicações que você salvou para consultar depois." },
};

const AJUSTES_RAPIDOS: ReadonlyArray<{ chave: keyof PreferenciasAcessibilidade; id: string; rotulo: string }> = [
  { chave: "readingRuler", id: "rapido-regua", rotulo: "Régua de leitura" },
  { chave: "focusMode", id: "rapido-foco", rotulo: "Modo foco" },
  { chave: "readingMode", id: "rapido-leitura", rotulo: "Modo leitura" },
  { chave: "persistentToasts", id: "rapido-avisos", rotulo: "Manter avisos até eu fechar" },
];

/** Lê da página atual o que os painéis precisam, antes de o diálogo esconder o resto do DOM. */
function fotografarPagina(caminho: string): FotoDaPagina {
  const principal = document.querySelector<HTMLElement>("main") ?? document.body;
  const texto = principal.innerText ?? principal.textContent ?? "";
  return { caminho, onde: coletarOndeEstou(), termos: termosNoTexto(texto).map((t) => t.id) };
}

function BotaoDoMenu({ icone: Icone, titulo, detalhe, onClick }: { icone: LucideIcon; titulo: string; detalhe: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" className="h-auto min-h-14 justify-start gap-3 px-4 py-3 text-left" onClick={onClick}>
      <Icone className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-bold">{titulo}</span>
        <span className="block whitespace-normal text-xs font-normal text-muted-foreground">{detalhe}</span>
      </span>
    </Button>
  );
}

/**
 * O botão fixo "Ajuda de leitura" e o diálogo que ele abre: Onde estou?, Explique esta página,
 * Glossário, histórico de instruções e ajustes rápidos de leitura. Fica no canto inferior esquerdo,
 * do lado oposto ao VLibras, e tem nome acessível mesmo quando só o ícone cabe (celular).
 *
 * A página é lida **ao clicar**, antes de o diálogo abrir: com ele aberto, o Radix esconde o resto
 * da página do DOM acessível, e "Onde estou?" não acharia mais título nenhum.
 */
export function FerramentasDeLeitura() {
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const { rascunho, salvar } = useAcessibilidade();
  const [aberto, setAberto] = useState(false);
  const [visao, setVisao] = useState<Visao>("menu");
  const [foto, setFoto] = useState<FotoDaPagina | null>(null);

  const abrir = () => {
    setFoto(fotografarPagina(caminho));
    setVisao("menu");
    setAberto(true);
  };

  const { titulo, descricao } = TITULOS[visao];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="fixed bottom-4 left-4 z-50 min-h-12 min-w-12 gap-2 rounded-full bg-card px-3 shadow-lg"
        aria-haspopup="dialog"
        aria-label="Ferramentas de leitura e ajuda"
        onClick={abrir}
      >
        <HelpCircle className="size-5" aria-hidden="true" />
        <span className="hidden text-sm font-semibold sm:inline">Ajuda de leitura</span>
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descricao}</DialogDescription>
          </DialogHeader>

          {visao !== "menu" && (
            <Button type="button" variant="ghost" size="sm" className="min-h-11 w-fit gap-1.5" onClick={() => setVisao("menu")}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao menu
            </Button>
          )}

          {visao === "menu" && (
            <div className="space-y-5">
              <div className="grid gap-2">
                <BotaoDoMenu icone={Compass} titulo="Onde estou?" detalhe="Página, seção e ação principal." onClick={() => setVisao("onde")} />
                <BotaoDoMenu icone={BookOpenText} titulo="Explique esta página" detalhe="Para que serve esta tela." onClick={() => setVisao("pagina")} />
                <BotaoDoMenu icone={BookMarked} titulo="Glossário" detalhe="CLT, PJ, híbrido, cotas e outros termos." onClick={() => setVisao("glossario")} />
                <BotaoDoMenu icone={History} titulo="Meu histórico de instruções" detalhe="O que você salvou para ver depois." onClick={() => setVisao("historico")} />
              </div>

              <section aria-labelledby="ajustes-rapidos" className="space-y-2">
                <h3 id="ajustes-rapidos" className="text-sm font-bold">
                  Ajustes rápidos
                </h3>
                <p className="text-xs text-muted-foreground">Cada ajuste vale na hora e fica salvo neste navegador.</p>
                {AJUSTES_RAPIDOS.map(({ chave, id, rotulo }) => (
                  <div key={id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <Label htmlFor={id} className="min-h-11 flex-1 content-center text-sm font-semibold">
                      {rotulo}
                    </Label>
                    <Switch id={id} checked={Boolean(rascunho[chave])} onCheckedChange={(v) => salvar({ ...rascunho, [chave]: v })} />
                  </div>
                ))}
                <Button asChild variant="link" className="min-h-11 gap-1.5 px-0">
                  <Link to="/configuracoes/acessibilidade" onClick={() => setAberto(false)}>
                    <Settings2 className="size-4" aria-hidden="true" /> Todas as configurações de acessibilidade
                  </Link>
                </Button>
              </section>
            </div>
          )}

          {visao === "onde" && foto && <PainelOndeEstou foto={foto} />}
          {visao === "pagina" && foto && <PainelExplicaPagina foto={foto} />}
          {visao === "glossario" && foto && <PainelGlossario foto={foto} />}
          {visao === "historico" && <PainelHistorico />}
        </DialogContent>
      </Dialog>
    </>
  );
}
