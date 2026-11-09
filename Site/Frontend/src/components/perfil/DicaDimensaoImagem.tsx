import { limiteEmMb } from "@/lib/arquivos";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Dica de dimensão/formato/tamanho para campos de upload de imagem
 * (foto de perfil e banner). Os valores recomendados batem com o
 * tamanho real em que cada imagem é exibida no ACESSO:
 * - Foto de perfil: sempre circular/quadrada (`Avatar`); 400×400 é um
 *   valor comum e nítido em qualquer tela, inclusive retina.
 * - Banner: `CapaUploader` renderiza `h-32 sm:h-40` em largura total;
 *   proporção ~4:1, a mesma de 1584×396.
 */
export function DicaDimensaoImagem({ tipo }: { tipo: "foto" | "banner" }) {
  const { t } = useIdioma();
  const recomendado = tipo === "foto" ? "400 × 400 px" : "1584 × 396 px";

  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      {t("perfil.dicaDimensaoImagem.recomendadoFormatos", { medida: recomendado, mb: limiteEmMb("imagem") })}
    </p>
  );
}
