import { useId } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * A amostra da personalização visual.
 *
 * São os COMPONENTES DE VERDADE do ACESSO — o mesmo selo de status, o mesmo aviso, o mesmo botão,
 * o mesmo campo com erro que aparecem nas telas. Nada aqui é desenho de amostra: se fosse, a
 * amostra poderia continuar bonita enquanto a tela de verdade quebrava.
 *
 * Eles mudam sozinhos junto com a escolha porque leem as mesmas variáveis de cor que o
 * `AcessibilidadeProvider` escreve no documento. Não existe fio ligando esta amostra aos
 * controles: ela simplesmente é o site.
 *
 * Os controles aqui dentro funcionam (recebem foco, mostram o contorno) mas não fazem nada: dar
 * foco neles é parte do que se quer ver, porque o contorno de foco tambem muda de cor.
 */
export function AmostraDaPersonalizacao() {
  const { t } = useIdioma();
  const idCampo = useId();
  const idErro = useId();

  return (
    <section
      aria-labelledby="amostra-personalizacao"
      className="space-y-4 rounded-xl border-2 border-dashed border-border bg-card p-4"
    >
      <div>
        <h4 id="amostra-personalizacao" className="text-sm font-bold">
          {t("acessibilidade.amostra.titulo")}
        </h4>
        <p className="text-xs text-muted-foreground">{t("acessibilidade.amostra.descricao")}</p>
      </div>

      {/* ---------------------------------------------------------------- status */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("acessibilidade.amostra.statusTitulo")}
        </p>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="aprovada" />
          <StatusBadge status="em_analise" />
          <StatusBadge status="rejeitada" />
        </div>
      </div>

      {/* ---------------------------------------------------------------- avisos */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("acessibilidade.amostra.avisosTitulo")}
        </p>

        {/* `role="note"` no lugar do `role="alert"` que o componente usa: aviso de verdade e regiao
            ao vivo, e quatro deles numa amostra seriam quatro anuncios a cada vez que a pessoa abre a
            pagina ou troca de padrao. A APARENCIA, que e o que a amostra existe para mostrar, e a
            mesma. */}
        <Alert variant="success" role="note">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          <AlertDescription>{t("acessibilidade.amostra.sucessoTexto")}</AlertDescription>
        </Alert>

        <Alert variant="warning" role="note">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertDescription>{t("acessibilidade.amostra.alertaTexto")}</AlertDescription>
        </Alert>

        <Alert variant="info" role="note">
          <Info className="size-4" aria-hidden="true" />
          <AlertDescription>{t("acessibilidade.amostra.infoTexto")}</AlertDescription>
        </Alert>

        <Alert variant="destructive" role="note">
          <XCircle className="size-4" aria-hidden="true" />
          <AlertDescription>{t("acessibilidade.amostra.erroTexto")}</AlertDescription>
        </Alert>
      </div>

      {/* ---------------------------------------------------------------- botões */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("acessibilidade.amostra.botoesTitulo")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-11">
            {t("acessibilidade.amostra.botaoPrincipal")}
          </Button>
          <Button type="button" variant="outline" className="min-h-11">
            {t("acessibilidade.amostra.botaoSecundario")}
          </Button>
          <Button type="button" variant="destructive" className="min-h-11">
            {t("acessibilidade.amostra.botaoPerigo")}
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- campo com erro */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("acessibilidade.amostra.formularioTitulo")}
        </p>

        <Label htmlFor={idCampo} className="text-sm font-semibold">
          {t("acessibilidade.amostra.campoRotulo")}
        </Label>
        <Input
          id={idCampo}
          type="email"
          readOnly
          defaultValue="maria@"
          aria-invalid
          aria-describedby={idErro}
          className="min-h-11"
        />
        {/* O erro nao e so vermelho: tem icone e texto, como em qualquer formulario do site. */}
        <p id={idErro} className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
          <XCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {t("acessibilidade.amostra.campoErro")}
        </p>
      </div>

      {/* ---------------------------------------------------------------- notificação */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("acessibilidade.amostra.notificacaoTitulo")}
        </p>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2.5">
          <span className="size-2.5 shrink-0 rounded-full bg-info" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm">{t("acessibilidade.amostra.notificacaoTexto")}</span>
          {/* "Nao lida" escrito: a bolinha sozinha seria so cor. */}
          <span className="text-xs font-semibold text-muted-foreground">
            {t("acessibilidade.amostra.naoLida")}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("acessibilidade.amostra.semGrafico")}</p>
    </section>
  );
}
