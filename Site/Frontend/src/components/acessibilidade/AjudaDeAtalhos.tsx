import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { EVENTO_ABRIR_ATALHOS } from "@/hooks/useAtalhosDeTeclado";
import { useSessao } from "@/hooks/useSessao";
import { atalhosDisponiveis, textoDasTeclas } from "@/lib/atalhos";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * A lista de atalhos de teclado (tecla `?`), com o interruptor para desligá-los. Mostra só os
 * atalhos que a pessoa pode usar agora (quem não entrou não vê os de áreas privadas).
 */
export function AjudaDeAtalhos() {
  const { t } = useIdioma();
  const [aberto, setAberto] = useState(false);
  const { autenticado } = useSessao();
  const { rascunho, salvar } = useAcessibilidade();

  useEffect(() => {
    const abrir = () => setAberto(true);

    window.addEventListener(EVENTO_ABRIR_ATALHOS, abrir);

    return () => window.removeEventListener(EVENTO_ABRIR_ATALHOS, abrir);
  }, []);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5" aria-hidden="true" /> {t("acessibilidade.ajudaDeAtalhos.atalhosDeTeclado")}
          </DialogTitle>
          <DialogDescription>{t("acessibilidade.ajudaDeAtalhos.aperteAsTeclasEmSequenciaSem")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <Label htmlFor="atalhos-ligados" className="min-h-11 flex-1 content-center text-sm font-semibold">
            {t("acessibilidade.ajudaDeAtalhos.atalhosDeTecladoLigados")}
          </Label>
          <Switch id="atalhos-ligados" checked={rascunho.shortcuts} onCheckedChange={(v) => salvar({ ...rascunho, shortcuts: v })} />
        </div>

        {rascunho.shortcuts ? (
          <dl className="space-y-2 text-sm">
            {atalhosDisponiveis(autenticado).map((a) => (
              <div key={a.teclas.join("+")} className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
                <dt className="font-medium">{a.descricao}</dt>
                <dd>
                  <kbd className="rounded border border-border bg-muted px-2 py-1 font-mono text-xs font-semibold">{textoDasTeclas(a.teclas)}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            {t("acessibilidade.ajudaDeAtalhos.osAtalhosEstaoDesligadosLigueO")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
