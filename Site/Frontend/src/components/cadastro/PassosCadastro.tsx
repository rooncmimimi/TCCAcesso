import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/**
 * Indicador de progresso do cadastro.
 *
 * O estado de cada passo nunca depende só de cor: a etapa atual tem `aria-current="step"`, as
 * concluídas trazem um ✓ com texto e as futuras ficam numeradas. A frase "Etapa 2 de 5 — Dados
 * pessoais" vive numa região `aria-live="polite"` para o leitor de tela anunciar a troca sem que o
 * foco precise passar por aqui (WCAG 4.1.3).
 *
 * A barra mostra só os números, nunca os cinco nomes: no cartão de autenticação (`max-w-lg`) cada
 * rótulo ficaria com menos de 60px e seria cortado em "Ide…". O nome da etapa atual aparece por
 * extenso na frase acima, que é também o que o leitor de tela anuncia; para leitor de tela cada
 * item ainda diz o nome e o estado, então a lista completa continua disponível.
 */
export function PassosCadastro({
  passos,
  atual,
  frase,
  rotulos,
}: {
  /** Nome curto de cada etapa, na ordem. */
  passos: readonly string[];
  /** Índice da etapa atual, começando em 0. */
  atual: number;
  /** Monta "Etapa 2 de 4 — Dados pessoais" no idioma escolhido. */
  frase?: (numero: number, total: number, nome: string) => string;
  /** Palavras de estado para leitor de tela, no idioma escolhido. */
  rotulos?: { concluida: string; atual: string; pendente: string; lista: string };
}) {
  const dp = useT().cadastro.passos;
  const total = passos.length;
  const numeroAtual = Math.min(atual + 1, total);
  const texto = (frase ?? dp.etapaDe)(numeroAtual, total, passos[atual]);
  const estados = rotulos ?? {
    concluida: dp.concluida,
    atual: dp.atual,
    pendente: dp.pendente,
    lista: dp.lista,
  };

  return (
    <div className="mb-8">
      <p aria-live="polite" className="text-sm font-semibold text-primary">
        {texto}
      </p>

      <ol className="mt-3 flex items-center gap-2" aria-label={estados.lista}>
        {passos.map((passo, indice) => {
          const concluido = indice < atual;
          const ehAtual = indice === atual;

          return (
            <li
              key={passo}
              aria-current={ehAtual ? "step" : undefined}
              /* O último passo não tem linha depois dele, então não precisa esticar. */
              className={cn("flex items-center gap-2", indice < total - 1 && "flex-1")}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-colors",
                  concluido && "border-primary bg-primary text-primary-foreground",
                  ehAtual && "border-primary text-primary",
                  !concluido && !ehAtual && "border-border text-muted-foreground",
                )}
              >
                {concluido ? <Check className="size-4" aria-hidden="true" /> : indice + 1}
              </span>

              {indice < total - 1 && (
                <span
                  aria-hidden="true"
                  className={cn("h-0.5 min-w-2 flex-1 rounded-full", concluido ? "bg-primary" : "bg-border")}
                />
              )}

              {/* Só para leitor de tela: o nome da etapa e o estado, sem depender da cor nem do ✓. */}
              <span className="sr-only">
                {passo}: {concluido ? estados.concluida : ehAtual ? estados.atual : estados.pendente}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
