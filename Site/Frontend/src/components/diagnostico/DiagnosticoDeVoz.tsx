import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCopy, HelpCircle, Play, XCircle, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextoOuvivel } from "@/components/acessibilidade/TextoOuvivel";
import { reconhecimentoDeFalaSuportado } from "@/lib/microfone";
import { useLeituraDestacada } from "@/hooks/useLeituraDestacada";
import { suporteDestaque } from "@/lib/leituraDestacada";
import { montarRelatorio, resumirVozes, testarEventosDePalavra, testarPausaNativa, type CriarEnunciado, type DadosDoRelatorio, type EnunciadoDeFala, type ResultadoDePalavras, type ResultadoDePausa, type SintetizadorDeFala, type VozDoAparelho } from "@/lib/diagnosticoDeVoz";
import { RESUMO_POR_NIVEL, ROTULO_DO_NIVEL, explicarMarcacaoDasPalavras, explicarPausaEContinuar, piorNivel, type Explicacao, type Nivel } from "@/lib/explicacaoDoDiagnostico";

/** Como o ACESSO está marcando o texto agora, em palavras de todo dia. */
const MODO_EM_PALAVRAS: Record<string, string> = {
  palavra: "a palavra certa fica marcada (exato)",
  estimado: "a frase fica marcada e a palavra é estimada pelo tempo (aproximado)",
  frase: "só a frase fica marcada",
  bloco: "o bloco inteiro fica marcado",
};

const OPCOES_DESTAQUE = ["A palavra certa ficou marcada", "Marcou, mas errou algumas palavras", "Só a frase ficou marcada", "O bloco inteiro ficou marcado", "Nada ficou marcado"];
const OPCOES_PAUSA = ["Parou na hora", "Demorou para parar", "Cortou a fala", "Não parou"];
const OPCOES_CONTINUAR = ["Continuou de onde parou", "Recomeçou do começo da frase", "Recomeçou do começo do texto", "Não voltou a falar"];

const TEXTO_DE_LEITURA = "Esta é a leitura de verdade do ACESSO. Confira se cada palavra fica marcada enquanto a voz fala. Depois, aperte Pausar, espere alguns segundos e aperte Continuar. A leitura deve voltar do ponto em que parou.";

const NATIVO = "flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

const ICONE_DO_NIVEL: Record<Nivel, LucideIcon> = { bom: CheckCircle2, atencao: AlertTriangle, problema: XCircle, inconclusivo: HelpCircle };
const COR_DO_NIVEL: Record<Nivel, string> = { bom: "border-primary/50", atencao: "border-border", problema: "border-destructive/60", inconclusivo: "border-border" };

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

/** Perguntas com poucas respostas: botões de opção (rádio) em vez de uma lista escondida. */
function Pergunta({ legenda, nome, opcoes, valor, aoMudar }: { legenda: string; nome: string; opcoes: string[]; valor: string; aoMudar: (v: string) => void }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-semibold">{legenda}</legend>
      {[...opcoes, "Não testei"].map((o) => {
        const escolhido = o === "Não testei" ? valor === "" : valor === o;

        return (
          <label key={o} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input type="radio" name={nome} className="size-5" checked={escolhido} onChange={() => aoMudar(o === "Não testei" ? "" : o)} />
            {o}
          </label>
        );
      })}
    </fieldset>
  );
}

function CartaoDeResultado({ titulo, explicacao }: { titulo: string; explicacao: Explicacao }) {
  const Icone = ICONE_DO_NIVEL[explicacao.nivel];

  return (
    <div className={`space-y-2 rounded-xl border-2 p-4 ${COR_DO_NIVEL[explicacao.nivel]}`}>
      <p className="text-sm font-semibold text-muted-foreground">{titulo}</p>
      <p className="flex items-start gap-2 font-bold">
        <Icone className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>
          {ROTULO_DO_NIVEL[explicacao.nivel]}: {explicacao.titulo}
        </span>
      </p>
      <p className="text-sm">{explicacao.significado}</p>
      <details className="text-xs text-muted-foreground">
        <summary className="min-h-11 cursor-pointer py-2.5 font-semibold">Detalhes técnicos</summary>
        <p>{explicacao.tecnico}</p>
      </details>
    </div>
  );
}

/**
 * Teste da leitura em voz alta, em três etapas. Etapas 1 e 2: a pessoa ouve a leitura de verdade do ACESSO e diz o que
 * viu. Etapa 3 (opcional): o ACESSO testa sozinho a voz e explica o resultado em português comum. No fim, um
 * resultado em texto para copiar e enviar a quem acompanha o projeto. Nada é enviado por esta tela.
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

  const criar = useCallback<CriarEnunciado>((texto, voz) => {
    const u = new SpeechSynthesisUtterance(texto);

    u.lang = voz?.lang ?? (document.documentElement.lang || "pt-BR");
    if (voz) {
      const real = window.speechSynthesis.getVoices().find((v) => v.name === voz.name && v.lang === voz.lang);

      if (real) u.voice = real;
    }

    return u as unknown as EnunciadoDeFala;
  }, []);

  async function testarSozinho() {
    setPalavras(null);
    setPausa(null);
    setRodando("palavras");

    const resultadoPalavras = await testarEventosDePalavra(sintetizador, criar, vozEscolhida);

    setPalavras(resultadoPalavras);
    setRodando("pausa");
    setPausa(await testarPausaNativa(sintetizador, criar, vozEscolhida));
    setRodando(null);
  }

  const explicacaoDasPalavras = explicarMarcacaoDasPalavras(palavras);
  const explicacaoDaPausa = explicarPausaEContinuar(pausa, palavras);
  const resumo = piorNivel([explicacaoDasPalavras, explicacaoDaPausa]);

  const relatorio = useMemo(() => {
    const dados: DadosDoRelatorio = {
      navegador: typeof navigator === "undefined" ? "desconhecido" : navigator.userAgent,
      plataforma: typeof navigator === "undefined" ? "desconhecido" : ((navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "desconhecido"),
      idioma: typeof document === "undefined" ? "?" : document.documentElement.lang || "?",
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      suporte: { sintese: sintetizador !== null, destaquePorPalavra: suporteDestaque(), reconhecimentoDeFala: reconhecimentoDeFalaSuportado() },
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
      toast.success("Resultado copiado.");
    } catch {
      toast.error("Não foi possível copiar sozinho. Selecione o texto e copie com o teclado.");
    }
  }

  const resumoDasVozes = resumirVozes(vozes);

  return (
    <div className="mt-6 space-y-8">
      <div className="rounded-xl border border-border p-4 text-sm">
        <p className="font-semibold">Como funciona</p>
        <p className="mt-1">Você ouve um trecho, vê se as palavras ficam marcadas e se Pausar e Continuar funcionam. Leva cerca de 1 minuto. Aumente o volume e fique em um lugar silencioso.</p>
      </div>

      {!sintetizador ? (
        <p role="alert" className="rounded-lg border-2 border-destructive/40 p-4 text-sm font-medium">
          Este navegador não tem leitura em voz alta. Não há o que testar aqui. Experimente o Chrome, o Edge ou o Safari.
        </p>
      ) : null}

      <section aria-labelledby={`${idBase}-e1`} className="space-y-4">
        <h2 id={`${idBase}-e1`} className="text-xl font-bold">
          Etapa 1 de 3: ouça um trecho
        </h2>
        <p className="text-sm text-muted-foreground">Aperte “Ouvir”. Enquanto a voz lê, a palavra que ela está dizendo deve ficar marcada.</p>

        <TextoOuvivel rotulo="Ouvir o texto de teste">
          <p className="rounded-lg border border-border p-4 text-base">{TEXTO_DE_LEITURA}</p>
        </TextoOuvivel>

        <p role="status" className="text-sm font-semibold">
          {lendo && modo ? `Agora, no ACESSO: ${MODO_EM_PALAVRAS[modo]}.` : ""}
        </p>

        <Pergunta legenda="O que você viu enquanto a voz lia?" nome={`${idBase}-destaque`} opcoes={OPCOES_DESTAQUE} valor={destaque} aoMudar={setDestaque} />
      </section>

      <section aria-labelledby={`${idBase}-e2`} className="space-y-4">
        <h2 id={`${idBase}-e2`} className="text-xl font-bold">
          Etapa 2 de 3: pause e continue
        </h2>
        <p className="text-sm text-muted-foreground">Aperte “Ouvir” de novo. Quando aparecer embaixo da tela a barra com os botões, aperte “Pausar”, espere uns 5 segundos e aperte “Continuar”.</p>

        <Pergunta legenda="O que aconteceu ao apertar Pausar?" nome={`${idBase}-pausa`} opcoes={OPCOES_PAUSA} valor={pausaObs} aoMudar={setPausaObs} />
        <Pergunta legenda="O que aconteceu ao apertar Continuar?" nome={`${idBase}-continuar`} opcoes={OPCOES_CONTINUAR} valor={continuar} aoMudar={setContinuar} />

        <div className="space-y-1">
          <Label htmlFor={`${idBase}-comentario`}>Quer contar mais alguma coisa? (opcional)</Label>
          <Textarea id={`${idBase}-comentario`} rows={3} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} />
        </div>
      </section>

      <section aria-labelledby={`${idBase}-e3`} className="space-y-4">
        <h2 id={`${idBase}-e3`} className="text-xl font-bold">
          Etapa 3 de 3 (opcional): teste automático
        </h2>
        <p className="text-sm text-muted-foreground">Aqui o ACESSO testa sozinho a voz do seu aparelho. A voz fala duas frases curtas e depois o resultado aparece explicado. Leva uns 20 segundos.</p>

        <Button type="button" className="min-h-11 gap-2" disabled={!sintetizador || rodando !== null} onClick={() => void testarSozinho()}>
          <Play className="size-4" aria-hidden="true" /> {rodando ? "Testando…" : "Fazer o teste automático"}
        </Button>

        <p role="status" className="text-sm font-semibold">
          {rodando === "palavras" ? "Testando a marcação das palavras: a voz vai falar uma frase." : rodando === "pausa" ? "Testando pausar e continuar: a voz vai parar e voltar." : ""}
        </p>

        {resumo ? (
          <div className="space-y-3">
            <p role="status" className="text-lg font-bold">
              {RESUMO_POR_NIVEL[resumo]}
            </p>
            {explicacaoDasPalavras ? <CartaoDeResultado titulo="Marcação das palavras" explicacao={explicacaoDasPalavras} /> : null}
            {explicacaoDaPausa ? <CartaoDeResultado titulo="Pausar e continuar" explicacao={explicacaoDaPausa} /> : null}
          </div>
        ) : null}
      </section>

      <section aria-labelledby={`${idBase}-enviar`} className="space-y-3">
        <h2 id={`${idBase}-enviar`} className="text-xl font-bold">
          Enviar o resultado
        </h2>
        <p className="text-sm text-muted-foreground">Se você está ajudando a testar o projeto, copie o resultado e envie para quem acompanha. Nada é enviado por esta tela.</p>
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => void copiar()}>
          <ClipboardCopy className="size-4" aria-hidden="true" /> Copiar resultado
        </Button>
        <details className="rounded-lg border border-border">
          <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-semibold">Ver o texto que será copiado</summary>
          <div className="border-t border-border p-3">
            <Textarea readOnly rows={14} value={relatorio} aria-label="Resultado do teste de voz" className="font-mono text-xs" />
          </div>
        </details>
      </section>

      <details className="rounded-lg border border-border">
        <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-semibold">Vozes instaladas neste aparelho ({resumoDasVozes.total})</summary>
        <div className="space-y-3 border-t border-border p-3">
          <p role="status" className="text-sm">
            {resumoDasVozes.total === 0 ? "Nenhuma voz encontrada ainda. Se acabou de abrir a página, espere um instante." : `${resumoDasVozes.portugues} em português (${resumoDasVozes.locaisEmPortugues} instaladas no aparelho, ${resumoDasVozes.deRedeEmPortugues} que usam a internet).`}
          </p>
          <div className="space-y-1">
            <Label htmlFor={`${idBase}-voz`}>Voz usada no teste automático</Label>
            <select id={`${idBase}-voz`} className={NATIVO} value={escolhida} onChange={(e) => setEscolhida(e.target.value)}>
              <option value="">A voz padrão do aparelho</option>
              {vozes.map((v) => (
                <option key={`${v.name}-${v.lang}`} value={v.name}>
                  {v.name} ({v.lang}, {v.localService ? "instalada" : "usa a internet"})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Você não precisa mexer nisto. Troque só para comparar vozes. As que usam a internet (como as “Google” do Chrome) costumam não avisar em que palavra estão.</p>
          </div>
        </div>
      </details>
    </div>
  );
}
