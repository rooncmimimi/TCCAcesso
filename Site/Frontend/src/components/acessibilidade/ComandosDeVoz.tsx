import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { abrirAjudaDeAtalhos } from "@/hooks/useAtalhosDeTeclado";
import { EVENTO_PEDIR_COMANDO_DE_VOZ, useComandoDeVoz } from "@/hooks/useComandoDeVoz";
import { useSessao } from "@/hooks/useSessao";
import { useVoz } from "@/hooks/useVoz";
import { EXEMPLOS_DE_COMANDOS, interpretarComando, type Comando } from "@/lib/comandosDeVoz";

/** Acha, na página, o botão ou link cujo nome começa com algum dos termos (e está ativo). */
function acharControle(termos: RegExp): HTMLElement | null {
  const candidatos = Array.from(document.querySelectorAll<HTMLElement>("main button, main a[href], [role='dialog'] button"));

  return candidatos.find((c) => !c.hasAttribute("disabled") && c.getAttribute("aria-disabled") !== "true" && termos.test((c.getAttribute("aria-label") ?? c.textContent ?? "").trim())) ?? null;
}

/**
 * Comandos de voz. O microfone liga só quando a pessoa pede (o botão "Falar um comando" do menu de
 * ajuda), ouve UMA frase, executa o que entendeu e desliga. Enquanto escuta, um aviso visível no topo
 * da tela mostra "Microfone ligado" e tem o botão Parar. O que foi ouvido e o que será feito aparecem
 * em texto.
 *
 * Nada destrutivo é feito por voz, e "Candidatar-me" só abre o diálogo de candidatura (o envio exige
 * a revisão e o aceite na tela). Ver `lib/comandosDeVoz.ts`.
 */
export function ComandosDeVoz() {
  const navigate = useNavigate();
  const { rascunho, salvar } = useAcessibilidade();
  const { usuario, autenticado } = useSessao();
  const { parar: pararLeitura } = useVoz();
  const [resposta, setResposta] = useState<{ ouvido: string | null; texto: string; erro?: boolean } | null>(null);

  const executar = useCallback(
    (comando: Comando, ouvido: string): string => {
      switch (comando.tipo) {
        case "navegar":
          void navigate({ to: comando.para });

          return `Indo para ${comando.descricao}.`;
        case "voltar":
          window.history.back();

          return "Voltando.";
        case "proxima-pagina": {
          const botao = acharControle(/pr[oó]xima/i);

          if (botao) {
            botao.click();

            return "Indo para a próxima página.";
          }

          window.scrollBy({ top: Math.round(window.innerHeight * 0.85), behavior: "smooth" });

          return "Não achei um botão de próxima página aqui, então desci a tela.";
        }
        case "pesquisar-vagas":
          void navigate({ to: "/vagas", search: { q: comando.termo } });

          return `Pesquisando vagas por “${comando.termo}”.`;
        case "candidatar": {
          const botao = acharControle(/^(candidatar|continuar candidatura)/i);

          if (botao) {
            botao.click();

            return "Abrindo a candidatura. Revise e envie com as mãos.";
          }

          return "Não achei o botão de candidatura. Abra primeiro uma vaga.";
        }
        case "preferencia":
          salvar({ ...rascunho, [comando.chave]: comando.valor });

          return `${comando.descricao}.`;
        case "parar-leitura":
          pararLeitura();

          return "Leitura parada.";
        case "atalhos":
          abrirAjudaDeAtalhos();

          return "Mostrando os atalhos.";
        case "recusado":
          return comando.motivo;
        default:
          return `Não entendi “${ouvido}”. Tente, por exemplo: ${EXEMPLOS_DE_COMANDOS.slice(0, 3).join(", ")}.`;
      }
    },
    [navigate, pararLeitura, rascunho, salvar],
  );

  const aoOuvir = useCallback(
    (fala: string) => {
      const comando = interpretarComando(fala, { autenticado, tipoDeUsuario: usuario?.tipo ?? null });
      const texto = executar(comando, fala);

      setResposta({ ouvido: fala, texto, erro: comando.tipo === "desconhecido" || comando.tipo === "recusado" });
    },
    [autenticado, executar, usuario?.tipo],
  );

  const voz = useComandoDeVoz(aoOuvir);

  useEffect(() => {
    const pedir = () => {
      if (!voz.suportado) {
        setResposta({ ouvido: null, texto: "Este navegador não oferece reconhecimento de voz dentro do site. Use o Chrome ou o Edge, ou os atalhos de teclado.", erro: true });

        return;
      }

      setResposta(null);
      voz.iniciar();
    };

    window.addEventListener(EVENTO_PEDIR_COMANDO_DE_VOZ, pedir);

    return () => window.removeEventListener(EVENTO_PEDIR_COMANDO_DE_VOZ, pedir);
  }, [voz]);

  // O aviso de resposta some sozinho depois de um tempo, exceto erros (que a pessoa precisa ler).
  useEffect(() => {
    if (!resposta || resposta.erro || voz.ouvindo) return undefined;

    const espera = setTimeout(() => setResposta(null), 6000);

    return () => clearTimeout(espera);
  }, [resposta, voz.ouvindo]);

  if (!voz.ouvindo && !resposta && !voz.erro) return null;

  return (
    <div role="status" aria-live="polite" data-varredura-ignorar className="fixed left-1/2 top-3 z-[80] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border-2 border-primary bg-card p-3 shadow-2xl" style={{ pointerEvents: "auto" }} onPointerDown={(e) => e.stopPropagation()}>
      {voz.ouvindo ? (
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-block size-3 shrink-0 animate-pulse rounded-full bg-destructive" />
          <p className="flex-1 text-sm font-semibold">Microfone ligado. Diga um comando.</p>
          <Button type="button" variant="destructive" size="sm" className="min-h-11 gap-2" onClick={voz.parar}>
            <MicOff className="size-4" aria-hidden="true" /> Parar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {voz.erro ? <p className="text-sm font-medium text-destructive">{voz.erro}</p> : null}
          {resposta ? (
            <>
              {resposta.ouvido ? <p className="text-xs text-muted-foreground">Ouvi: “{resposta.ouvido}”</p> : null}
              <p className={`text-sm font-semibold ${resposta.erro ? "text-destructive" : ""}`}>{resposta.texto}</p>
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="min-h-11 gap-2" onClick={() => { setResposta(null); voz.iniciar(); }}>
              <Mic className="size-4" aria-hidden="true" /> Falar outro comando
            </Button>
            <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setResposta(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">O ACESSO não grava áudio. No Chrome e no Edge, o navegador usa um serviço online para reconhecer a fala, então precisa de internet.</p>
    </div>
  );
}
