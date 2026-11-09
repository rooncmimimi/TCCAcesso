import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Os três estados que toda lista tem antes de mostrar dados: carregando, falhou e vazia.
 *
 * Existem como componente porque o que importa neles não é o desenho, e sim **como são anunciados**: quem usa
 * leitor de tela precisa ouvir "carregando", ouvir o erro assim que ele acontece e saber que a lista está vazia.
 * Repetido à mão em cada tela, isso se perde — foi o que aconteceu nas sete tabelas da administração, que não
 * anunciavam nada. Com um lugar só, toda lista que adotar estes componentes já nasce anunciando certo.
 *
 * - **Carregando:** `role="status"` com `aria-busy`, e um texto para leitor de tela (o esqueleto cinza não é lido).
 * - **Erro:** `role="alert"`, que interrompe e é dito na hora, mais o botão de tentar de novo.
 * - **Vazia:** `role="status"`, dito com calma, sem interromper. O ícone é decorativo.
 */

export function ListaCarregando({ rotulo, linhas = 5 }: { rotulo: string; linhas?: number }) {
  return (
    <div role="status" aria-busy="true" className="space-y-2 p-4">
      <span className="sr-only">{rotulo}</span>
      {Array.from({ length: linhas }).map((_, indice) => (
        <Skeleton key={indice} className="h-12 w-full" aria-hidden="true" />
      ))}
    </div>
  );
}

export function ListaComErro({ mensagem, aoTentarDeNovo }: { mensagem: string; aoTentarDeNovo: () => void }) {
  const { t } = useIdioma();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center">
      <p className="text-sm text-muted-foreground">{mensagem}</p>
      <Button variant="outline" size="sm" className="min-h-11" onClick={aoTentarDeNovo}>
        {t("raiz.tentarNovamente")}
      </Button>
    </div>
  );
}

export function ListaVazia({ icone: Icone, mensagem }: { icone?: LucideIcon; mensagem: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
      {Icone ? <Icone className="size-8" aria-hidden="true" /> : null}
      <p className="text-sm">{mensagem}</p>
    </div>
  );
}
