import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { ClipboardCopy, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextoOuvivel } from "@/components/acessibilidade/TextoOuvivel";
import { ditadoSuportado } from "@/hooks/useDitado";
import { useLeituraDestacada } from "@/hooks/useLeituraDestacada";
import { suporteDestaque } from "@/lib/leituraDestacada";
import { montarRelatorio, resumirVozes, testarEventosDePalavra, testarPausaNativa, type CriarEnunciado, type DadosDoRelatorio, type EnunciadoDeFala, type ResultadoDePalavras, type ResultadoDePausa, type SintetizadorDeFala, type VozDoAparelho } from "@/lib/diagnosticoDeVoz";

const MODOS: Record<string, string> = {
  palavra: "palavra por palavra (a voz informa cada palavra)",
  estimado: "aproximado (a palavra é estimada pelo tempo)",
  frase: "só a frase",
  bloco: "só o bloco",
};

const OPCOES_DESTAQUE = ["Palavra por palavra, certa", "Palavra por palavra, às vezes errada", "Só a frase destacada", "Só o bloco destacado", "Nenhum destaque"];
const OPCOES_PAUSA = ["Pausou na hora", "Demorou para pausar", "Cortou a fala", "Não pausou"];
const OPCOES_CONTINUAR = ["Continuou de onde parou", "Recomeçou do começo da frase", "Recomeçou do começo do texto", "Não voltou a falar"];

const TEXTO_DE_LEITURA = "Esta é a leitura de verdade do ACESSO. Conferir se cada palavra fica destacada enquanto a voz fala. Depois, aperte Pausar, espere alguns segundos e aperte Continuar. A leitura deve voltar do ponto em que parou.";

const NATIVO = "flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

function sintetizadorDoNavegador(): SintetizadorDeFala | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const s = window.speechSynthesis;

  return {
    speak: (u) => s.speak(u as unknown as SpeechSynthesisUtterance),
    cancel: () => s.cancel(),
    pause: () => s.pause(),
    resume: () => s.resume(),
    get speaking() {
      return s.speaking;
    },
    get paused() {
      return s.paused;
    },
    getVoices: () => s.getVoices().map((v) => ({ name: v.name, lang: v.lang, localService: v.localService, default: v.default })),
  };
}

/**
 * Diagnóstico de voz para rodar em um aparelho de verdade. Mede o que o navegador faz (eventos de palavra,
 * pausa, vozes locais e de rede), deixa a pessoa conferir a leitura real do ACESSO e monta um relatório
 * para copiar. Nada é enviado: o relatório só existe nesta tela até a pessoa copiá-lo.
 */
export function DiagnosticoDeVoz() {
  const idBase = useId();
  const { modo, lendo } = useLeituraDestacada();
  const [vozes, setVozes] = useState<VozDoAparelho[]>([]);
  const [escolhida, setEscolhida] = useState("");
  const [palavras, setPalavras] = useState<ResultadoDePalavras | null>(null);
  const [pausa, setPausa] = useState<ResultadoDePausa | null>(null);
  const [rodando, setRodando] = useState<"palavras" | "pausa" | null>(null);
  const [destaque, setDestaque] = useState("");
  const [pausaObs, setPausaObs] = useState("");
  const [continuar, setContinuar] = useState("");
  const [comentario, setComentario] = useState("");

  const sintetizador = useMemo(sintetizadorDoNavegador, []);

  useEffect(() => {
    if (!sintetizador) return undefined;

    const ler = () => setVozes(sintetizador.getVoices());

    ler();
    // Muitos navegadores só têm a lista de vozes depois de um instante.
    window.speechSynthesis.addEventListener("voiceschanged", ler);

    return () => window.speechSynthesis.removeEventListener("voiceschanged", ler);
  }, [sintetizador]);

  const vozEscolhida = vozes.find((v) => v.name === escolhida) ?? null;

  const criar = useCallback<CriarEnunciado>(
    (texto, voz) => {
      const u = new SpeechSynthesisUtterance(texto);

      u.lang = voz?.lang ?? (document.documentElement.lang || "pt-BR");
      if (voz) {
        const real = window.speechSynthesis.getVoices().find((v) => v.name === voz.name && v.lang === voz.lang);

        if (real) u.voice = real;
      }

      return u as unknown as EnunciadoDeFala;
    },
    [],
  );

  async function rodarPalavras() {
    setRodando("palavras");
    setPalavras(await testarEventosDePalavra(sintetizador, criar, vozEscolhida));
    setRodando(null);
  }

  async function rodarPausa() {
    setRodando("pausa");
    setPausa(await testarPausaNativa(sintetizador, criar, vozEscolhida));
    setRodando(null);
  }

  const relatorio = useMemo(() => {
    const dados: DadosDoRelatorio = {
      navegador: typeof navigator === "undefined" ? "desconhecido" : navigator.userAgent,
      plataforma: typeof navigator === "undefined" ? "desconhecido" : ((navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "desconhecido"),
      idioma: typeof document === "undefined" ? "?" : document.documentElement.lang || "?",
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      suporte: { sintese: sintetizador !== null, destaquePorPalavra: suporteDestaque(), reconhecimentoDeFala: ditadoSuportado() },
      vozes: resumirVozes(vozes),
      vozEscolhida,
      palavras,
      pausa,
      observacoes: { destaque, pausa: pausaObs, continuar, comentario },
      quando: new Date().toLocaleString("pt-BR"),
    };

    return montarRelatorio(dados);
  }, [sintetizador, vozes, vozEscolhida, palavras, pausa, destaque, pausaObs, continuar, comentario]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(relatorio);
      toast.success("Relatório copiado.");
    } catch {
      toast.error("Não foi possível copiar sozinho. Selecione o texto do relatório e copie com o teclado.");
    }
  }

  const resumo = resumirVozes(vozes);

  return (
    <div className="mt-6 space-y-8">
      {!sintetizador ? (
        <p role="alert" className="rounded-lg border-2 border-destructive/40 p-4 text-sm font-medium">
          Este navegador não tem síntese de fala. Não há o que testar aqui. Experimente o Chrome, o Edge ou o Safari.
        </p>
      ) : null}

      <section aria-labelledby={`${idBase}-vozes`} className="space-y-3">
        <h2 id={`${idBase}-vozes`} className="text-xl font-bold">
          1. Vozes deste aparelho
        </h2>
        <p role="status" className="text-sm">
          {resumo.total === 0 ? "Nenhuma voz encontrada ainda. Se acabou de abrir a página, espere um instante." : `${resumo.total} vozes; ${resumo.portugues} em português (${resumo.locaisEmPortugues} locais, ${resumo.deRedeEmPortugues} de rede).`}
        </p>
        <div className="space-y-1">
          <Label htmlFor={`${idBase}-voz`}>Voz para os testes</Label>
          <select id={`${idBase}-voz`} className={NATIVO} value={escolhida} onChange={(e) => setEscolhida(e.target.value)}>
            <option value="">A padrão do navegador</option>
            {vozes.map((v) => (
              <option key={`${v.name}-${v.lang}`} value={v.name}>
                {v.name} ({v.lang}, {v.localService ? "local" : "de rede"})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">As vozes locais ficam no aparelho. As de rede (como as “Google” do Chrome) usam a internet e costumam não informar cada palavra.</p>
        </div>
      </section>

      <section aria-labelledby={`${idBase}-medidas`} className="space-y-4">
        <h2 id={`${idBase}-medidas`} className="text-xl font-bold">
          2. Medições automáticas
        </h2>
        <p className="text-sm text-muted-foreground">Cada teste fala em voz alta. Aumente o volume e aperte um de cada vez.</p>

        <div className="space-y-2 rounded-xl border border-border p-4">
          <h3 className="font-semibold">A voz informa cada palavra?</h3>
          <Button type="button" className="min-h-11 gap-2" disabled={!sintetizador || rodando !== null} onClick={() => void rodarPalavras()}>
            <Play className="size-4" aria-hidden="true" /> {rodando === "palavras" ? "Falando…" : "Testar palavra por palavra"}
          </Button>
          {palavras ? (
            <p role="status" className="text-sm">
              {palavras.situacao === "sem-voz" ? "Sem síntese de fala." : `${palavras.palavrasInformadas} de ${palavras.totalDePalavras} palavras informadas${palavras.primeiroEventoMs !== null ? `, a primeira em ${palavras.primeiroEventoMs} ms` : ""}${palavras.erro ? `. Erro: ${palavras.erro}` : ""}.`}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 rounded-xl border border-border p-4">
          <h3 className="font-semibold">O pause do navegador funciona?</h3>
          <Button type="button" className="min-h-11 gap-2" disabled={!sintetizador || rodando !== null} onClick={() => void rodarPausa()}>
            <Play className="size-4" aria-hidden="true" /> {rodando === "pausa" ? "Testando…" : "Testar pausa e continuar"}
          </Button>
          {pausa ? (
            <p role="status" className="text-sm">
              {pausa.situacao === "sem-voz" ? "Sem síntese de fala." : `Marcou como pausado: ${pausa.marcouPausado ? "sim" : "não"}. A pausa cortou a fala: ${pausa.pausaCancelouAFala ? "sim" : "não"}. Voltou até o fim: ${pausa.retomouAteOFim ? "sim" : "não"}.${pausa.erro ? ` Erro: ${pausa.erro}` : ""}`}
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby={`${idBase}-real`} className="space-y-4">
        <h2 id={`${idBase}-real`} className="text-xl font-bold">
          3. A leitura de verdade do ACESSO
        </h2>
        <p className="text-sm text-muted-foreground">Aperte “Ouvir”. O texto abaixo é lido com o mesmo destaque e os mesmos botões de Pausar e Continuar do resto do site. Depois diga o que você viu.</p>

        <TextoOuvivel rotulo="Ouvir o texto de teste">
          <p className="rounded-lg border border-border p-4 text-base">{TEXTO_DE_LEITURA}</p>
        </TextoOuvivel>

        <p role="status" className="text-sm font-semibold">
          {lendo && modo ? `Modo do destaque agora: ${MODOS[modo]}.` : "Modo do destaque: aparece aqui enquanto a leitura está acontecendo."}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { id: "destaque", rotulo: "O destaque", valor: destaque, aoMudar: setDestaque, opcoes: OPCOES_DESTAQUE },
            { id: "pausa", rotulo: "Ao apertar Pausar", valor: pausaObs, aoMudar: setPausaObs, opcoes: OPCOES_PAUSA },
            { id: "continuar", rotulo: "Ao apertar Continuar", valor: continuar, aoMudar: setContinuar, opcoes: OPCOES_CONTINUAR },
          ].map((c) => (
            <div key={c.id} className="space-y-1">
              <Label htmlFor={`${idBase}-${c.id}`}>{c.rotulo}</Label>
              <select id={`${idBase}-${c.id}`} className={NATIVO} value={c.valor} onChange={(e) => c.aoMudar(e.target.value)}>
                <option value="">Não testei</option>
                {c.opcoes.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idBase}-comentario`}>Comentário (opcional)</Label>
          <Textarea id={`${idBase}-comentario`} rows={3} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} />
        </div>
      </section>

      <section aria-labelledby={`${idBase}-relatorio`} className="space-y-3">
        <h2 id={`${idBase}-relatorio`} className="text-xl font-bold">
          4. Relatório
        </h2>
        <p className="text-sm text-muted-foreground">Copie e envie para quem está acompanhando o projeto. Ele só tem o que está escrito abaixo: o navegador, as vozes, as medições e o que você marcou. Nada é enviado por esta tela.</p>
        <Textarea readOnly rows={14} value={relatorio} aria-label="Relatório do diagnóstico de voz" className="font-mono text-xs" />
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => void copiar()}>
          <ClipboardCopy className="size-4" aria-hidden="true" /> Copiar relatório
        </Button>
      </section>
    </div>
  );
}
