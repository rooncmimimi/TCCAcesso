import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CARTOES_PADRAO } from "@/dados/cartoesDeComunicacao";
import { lerCartoesPessoais } from "@/lib/cartoesPessoais";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Frases prontas dentro da conversa. Escolher uma frase só a COLOCA no campo de mensagem: quem envia
 * é a pessoa, com o botão de sempre, depois de ler. Mostra os cartões da própria pessoa primeiro.
 */
export function FrasesProntas({ aoEscolher }: { aoEscolher: (texto: string) => void }) {
  const { t } = useIdioma();
  const [aberto, setAberto] = useState(false);
  const pessoais = aberto ? lerCartoesPessoais() : [];
  const frases = [...pessoais.map((c) => c.texto), ...CARTOES_PADRAO.map((c) => c.texto)];

  return (
    <div className="border-t border-border px-3 pt-2">
      <Button type="button" variant="ghost" size="sm" className="min-h-11 gap-2" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        <MessageSquareText className="size-4" aria-hidden="true" /> {t("mensagens.frasesProntas.frasesProntas")}
      </Button>

      {aberto ? (
        <div className="space-y-2 pb-2">
          <p className="text-xs text-muted-foreground">{t("mensagens.frasesProntas.aoEscolherAFraseVaiParaOCampo")}</p>
          <ul className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {frases.map((f) => (
              <li key={f}>
                <Button type="button" variant="outline" size="sm" className="h-auto min-h-11 whitespace-normal text-left" onClick={() => aoEscolher(f)}>
                  {f}
                </Button>
              </li>
            ))}
          </ul>
          <Link to="/comunicacao" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">
            {t("mensagens.frasesProntas.criarMeusCartoes")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
