import { TextoOuvivel } from "@/components/acessibilidade/TextoOuvivel";
import { competenciasNoTexto } from "@/dados/competencias";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * "Entenda estas expressões": explica as competências que o texto de requisitos usa ("boa
 * comunicação", "proatividade"...), separando o que costuma ser necessário do que pode ser só uma
 * preferência genérica e mostrando outras formas de demonstrar. Fechado por padrão, nativo
 * (`<details>`), com leitura em voz alta. Não avalia ninguém e não altera o texto da vaga.
 */
export function ExplicacaoDeRequisitos({ texto }: { texto: string | null | undefined }) {
  const { t } = useIdioma();
  const achadas = competenciasNoTexto(texto);
  if (achadas.length === 0) return null;

  return (
    <details className="mt-2 rounded-lg border border-border bg-muted/30 text-sm">
      <summary className="min-h-11 cursor-pointer px-3 py-2.5 font-semibold text-primary">Entenda estas expressões ({achadas.map((c) => c.termo).join(", ")})</summary>
      <ul className="space-y-4 border-t border-border px-3 py-3">
        {achadas.map((c) => (
          <li key={c.id}>
            <TextoOuvivel rotulo={t("acessibilidade.explicacaoDeRequisitos.ouvirAExplicacaoDe", { var1: c.termo })}>
              <p>
                <span className="font-semibold">{c.termo}:</span> {c.significa}
              </p>
              <p className="mt-1">
                <span className="font-semibold">{t("acessibilidade.explicacaoDeRequisitos.costumaSerNecessariaQuando")}</span> {c.necessariaQuando}
              </p>
              <p className="mt-1">
                <span className="font-semibold">{t("acessibilidade.explicacaoDeRequisitos.podeSerSoUmaPreferenciaQuando")}</span> {c.preferenciaQuando}
              </p>
              <p className="mt-1 font-semibold">{t("acessibilidade.explicacaoDeRequisitos.formasDeDemonstrar")}</p>
              <ul className="list-disc pl-5">
                {c.outrasFormas.map((forma) => (
                  <li key={forma}>{forma}</li>
                ))}
              </ul>
              <p className="mt-1">
                <span className="font-semibold">{t("acessibilidade.explicacaoDeRequisitos.pergunteAEmpresa")}</span> {c.perguntar}
              </p>
            </TextoOuvivel>
          </li>
        ))}
      </ul>
    </details>
  );
}
