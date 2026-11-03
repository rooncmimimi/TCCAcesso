import { useState } from "react";
import { Copy, Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * Os códigos de recuperação, mostrados **uma única vez**: o servidor só guarda o resumo deles. Cada um vale
 * uma vez e serve quando o aplicativo autenticador não está à mão. A pessoa só avança depois de marcar que os
 * guardou, para não perder o único momento em que eles existem.
 */
export function CodigosDeRecuperacao({
  codigos,
  aoConcluir,
  rotuloConcluir = "Concluir",
}: {
  codigos: string[];
  aoConcluir: () => void;
  rotuloConcluir?: string;
}) {
  const [guardei, setGuardei] = useState(false);
  const texto = codigos.join("\n");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Códigos copiados. Cole em um lugar seguro.");
    } catch {
      toast.error("Não foi possível copiar. Selecione os códigos e copie à mão.");
    }
  }

  function baixar() {
    try {
      const arquivo = new Blob(
        [`Códigos de recuperação do ACESSO\nCada código vale uma vez.\n\n${texto}\n`],
        { type: "text/plain;charset=utf-8" },
      );
      const endereco = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = endereco;
      link.download = "codigos-de-recuperacao-acesso.txt";
      link.click();
      URL.revokeObjectURL(endereco);
    } catch {
      toast.error("Não foi possível baixar o arquivo. Copie os códigos.");
    }
  }

  return (
    <div className="space-y-4">
      <div role="note" className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Guarde estes códigos agora.</strong> Eles aparecem só desta vez. Cada código vale uma única vez e
          entra no lugar do aplicativo se você perder o celular. Quem tiver um deles consegue entrar na sua conta, então
          não os deixe em um lugar que outras pessoas acessam.
        </p>
      </div>

      <ul aria-label="Códigos de recuperação" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {codigos.map((codigo) => (
          <li key={codigo} className="rounded-md border bg-muted px-3 py-2 text-center font-mono text-base tracking-wider">
            {codigo}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-11" onClick={copiar}>
          <Copy aria-hidden="true" /> Copiar códigos
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={baixar}>
          <Download aria-hidden="true" /> Baixar arquivo
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox id="guardei-codigos" checked={guardei} onCheckedChange={(valor) => setGuardei(valor === true)} className="mt-1" />
        <Label htmlFor="guardei-codigos" className="text-sm font-medium leading-snug">
          Guardei meus códigos de recuperação em um lugar seguro.
        </Label>
      </div>

      <Button type="button" className="min-h-12 w-full text-base" disabled={!guardei} onClick={aoConcluir}>
        {rotuloConcluir}
      </Button>
    </div>
  );
}
