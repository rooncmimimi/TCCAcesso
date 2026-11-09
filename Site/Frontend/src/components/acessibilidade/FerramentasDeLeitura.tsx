import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, BookMarked, BookOpenText, BookUser, Compass, HelpCircle, History, Keyboard, MessageSquareText, Mic, Settings2, Target } from "lucide-react";
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
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { abrirAjudaDeAtalhos } from "@/hooks/useAtalhosDeTeclado";
import { pedirComandoDeVoz } from "@/hooks/useComandoDeVoz";
import { reconhecimentoDeFalaSuportado } from "@/lib/microfone";
import { termosNoTexto } from "@/dados/glossario";
import { coletarOndeEstou } from "@/lib/ondeEstou";
import type { PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";

type Visao = "menu" | "onde" | "pagina" | "glossario" | "historico";

const TITULOS: Record<Visao, { titulo: ChaveBase; descricao: ChaveBase }> = {
  menu: { titulo: "acessibilidade.ferramentasDeLeitura.ferramentasDeLeituraEAjuda", descricao: "acessibilidade.ferramentasDeLeitura.entendaAPaginaAcheTermos" },
  onde: { titulo: "acessibilidade.ferramentasDeLeitura.ondeEstou", descricao: "acessibilidade.ferramentasDeLeitura.aPaginaASecaoEAAcaoPrincipal" },
  pagina: { titulo: "acessibilidade.ferramentasDeLeitura.expliqueEstaPagina", descricao: "acessibilidade.ferramentasDeLeitura.oQueEstaPaginaFazEmLinguagem" },
  glossario: { titulo: "acessibilidade.ferramentasDeLeitura.glossario", descricao: "acessibilidade.ferramentasDeLeitura.termosDeVagasEDeTrabalho" },
  historico: { titulo: "acessibilidade.ferramentasDeLeitura.meuHistoricoDeInstrucoes", descricao: "acessibilidade.ferramentasDeLeitura.asExplicacoesQueVoceSalvouPara" },
};

const AJUSTES_RAPIDOS: ReadonlyArray<{ chave: keyof PreferenciasAcessibilidade; id: string; rotulo: ChaveBase }> = [
  { chave: "readingRuler", id: "rapido-regua", rotulo: "acessibilidade.ferramentasDeLeitura.reguaDeLeitura" },
  { chave: "focusMode", id: "rapido-foco", rotulo: "acessibilidade.ferramentasDeLeitura.modoFoco" },
  { chave: "readingMode", id: "rapido-leitura", rotulo: "acessibilidade.ferramentasDeLeitura.modoLeitura" },
  { chave: "persistentToasts", id: "rapido-avisos", rotulo: "acessibilidade.ferramentasDeLeitura.manterAvisosAteEuFechar" },
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
  const { t } = useIdioma();
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

  const navegar = useNavigate();
  const irPara = (destino: string) => {
    setAberto(false);
    void navegar({ to: destino });
  };

  const { titulo, descricao } = TITULOS[visao];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="fixed bottom-4 left-4 z-50 min-h-12 min-w-12 gap-2 rounded-full bg-card px-3 shadow-lg"
        aria-haspopup="dialog"
        aria-label={t("acessibilidade.ferramentasDeLeitura.ferramentasDeLeituraEAjuda")}
        onClick={abrir}
      >
        <HelpCircle className="size-5" aria-hidden="true" />
        <span className="hidden text-sm font-semibold sm:inline">{t("acessibilidade.ferramentasDeLeitura.ajudaDeLeitura")}</span>
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t(titulo)}</DialogTitle>
            <DialogDescription>{t(descricao)}</DialogDescription>
          </DialogHeader>

          {visao !== "menu" && (
            <Button type="button" variant="ghost" size="sm" className="min-h-11 w-fit gap-1.5" onClick={() => setVisao("menu")}>
              <ArrowLeft className="size-4" aria-hidden="true" /> {t("acessibilidade.ferramentasDeLeitura.voltarAoMenu")}
            </Button>
          )}

          {visao === "menu" && (
            <div className="space-y-5">
              <div className="grid gap-2">
                <BotaoDoMenu icone={Compass} titulo={t("acessibilidade.ferramentasDeLeitura.ondeEstou")} detalhe={t("acessibilidade.ferramentasDeLeitura.paginaSecaoEAcaoPrincipal")} onClick={() => setVisao("onde")} />
                <BotaoDoMenu icone={BookOpenText} titulo={t("acessibilidade.ferramentasDeLeitura.expliqueEstaPagina")} detalhe={t("acessibilidade.ferramentasDeLeitura.paraQueServeEstaTela")} onClick={() => setVisao("pagina")} />
                <BotaoDoMenu icone={BookMarked} titulo={t("acessibilidade.ferramentasDeLeitura.glossario")} detalhe={t("acessibilidade.ferramentasDeLeitura.cltPjHibridoCotasEOutrosTermos")} onClick={() => setVisao("glossario")} />
                <BotaoDoMenu icone={History} titulo={t("acessibilidade.ferramentasDeLeitura.meuHistoricoDeInstrucoes")} detalhe={t("acessibilidade.ferramentasDeLeitura.oQueVoceSalvouParaVerDepois")} onClick={() => setVisao("historico")} />
              </div>

              <section aria-labelledby="mais-recursos" className="space-y-2">
                <h3 id="mais-recursos" className="text-sm font-bold">
                  {t("acessibilidade.ferramentasDeLeitura.navegarDeOutrasFormas")}
                </h3>
                <div className="grid gap-2">
                  <BotaoDoMenu
                    icone={Mic}
                    titulo={t("acessibilidade.ferramentasDeLeitura.falarUmComando")}
                    detalhe={reconhecimentoDeFalaSuportado() ? "Diga, por exemplo, “ir para vagas”. O microfone só liga quando você pede." : "Este navegador não oferece reconhecimento de voz no site."}
                    onClick={() => {
                      setAberto(false);
                      // Espera o diálogo fechar para o comando agir sobre a página, e não sobre o diálogo.
                      setTimeout(pedirComandoDeVoz, 200);
                    }}
                  />
                  <BotaoDoMenu
                    icone={Keyboard}
                    titulo={t("acessibilidade.ferramentasDeLeitura.atalhosDeTeclado")}
                    detalhe={t("acessibilidade.ferramentasDeLeitura.gEVParaVagasParaAListaCompleta")}
                    onClick={() => {
                      setAberto(false);
                      setTimeout(abrirAjudaDeAtalhos, 200);
                    }}
                  />
                  <BotaoDoMenu icone={Target} titulo={t("acessibilidade.ferramentasDeLeitura.oQueVoceQuerFazer")} detalhe={t("acessibilidade.ferramentasDeLeitura.caminhosGuiadosSoComOsPassos")} onClick={() => irPara("/objetivos")} />
                  <BotaoDoMenu icone={MessageSquareText} titulo={t("acessibilidade.ferramentasDeLeitura.centralDeComunicacao")} detalhe={t("acessibilidade.ferramentasDeLeitura.cartoesEFrasesProntas")} onClick={() => irPara("/comunicacao")} />
                  <BotaoDoMenu icone={BookUser} titulo={t("acessibilidade.ferramentasDeLeitura.dicionarioDeProfissoes")} detalhe={t("acessibilidade.ferramentasDeLeitura.oQueCadaProfissaoFaz")} onClick={() => irPara("/profissoes")} />
                </div>
              </section>

              <section aria-labelledby="ajustes-rapidos" className="space-y-2">
                <h3 id="ajustes-rapidos" className="text-sm font-bold">
                  {t("acessibilidade.ferramentasDeLeitura.ajustesRapidos")}
                </h3>
                <p className="text-xs text-muted-foreground">{t("acessibilidade.ferramentasDeLeitura.cadaAjusteValeNaHoraEFicaSalvo")}</p>
                {AJUSTES_RAPIDOS.map(({ chave, id, rotulo }) => (
                  <div key={id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <Label htmlFor={id} className="min-h-11 flex-1 content-center text-sm font-semibold">
                      {t(rotulo)}
                    </Label>
                    <Switch id={id} checked={Boolean(rascunho[chave])} onCheckedChange={(v) => salvar({ ...rascunho, [chave]: v })} />
                  </div>
                ))}
                <Button asChild variant="link" className="min-h-11 gap-1.5 px-0">
                  <Link to="/configuracoes/acessibilidade" onClick={() => setAberto(false)}>
                    <Settings2 className="size-4" aria-hidden="true" /> {t("acessibilidade.ferramentasDeLeitura.todasAsConfiguracoesDe")}
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
