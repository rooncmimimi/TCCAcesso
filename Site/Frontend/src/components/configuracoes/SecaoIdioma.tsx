import { Languages } from "lucide-react";

import { SeletorDeIdioma } from "@/components/SeletorDeIdioma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIdioma } from "@/hooks/useIdioma";
import { useSessao } from "@/hooks/useSessao";

/**
 * Configurações → idioma do site. A troca vale na hora e fica guardada no aparelho; com sessão e o recurso ligado no servidor, também
 * na conta (acompanha a pessoa em qualquer dispositivo). A frase embaixo diz qual dos dois aconteceu, para ninguém supor o que não é.
 */
export function SecaoIdioma() {
  const { t, salvoNaConta } = useIdioma();
  const { autenticado } = useSessao();

  return (
    <Card className="mt-6 shadow-card">
      <CardHeader className="space-y-1.5">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Languages className="size-5" aria-hidden="true" /> {t("idioma.titulo")}
        </CardTitle>
        <CardDescription>{t("idioma.descricao")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <SeletorDeIdioma />
        <p className="text-xs text-muted-foreground">{autenticado && salvoNaConta ? t("idioma.salvoNaConta") : t("idioma.salvoNoAparelho")}</p>
      </CardContent>
    </Card>
  );
}
