import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Briefcase, ChefHat, Code2, Cog, GraduationCap, HeartPulse, Headset, Package, Palette, Receipt, ShoppingBag, Sparkles, Truck, Users, ClipboardList, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextoOuvivel } from "@/components/acessibilidade/TextoOuvivel";
import { PROFISSOES, buscarProfissoes, type IconeDeProfissao, type Profissao } from "@/dados/profissoes";
import { useIdioma } from "@/hooks/useIdioma";

const ICONES: Record<IconeDeProfissao, LucideIcon> = {
  atendimento: Headset,
  administrativo: ClipboardList,
  caixa: Receipt,
  producao: Cog,
  motorista: Truck,
  cozinha: ChefHat,
  limpeza: Sparkles,
  software: Code2,
  design: Palette,
  ensino: GraduationCap,
  vendas: ShoppingBag,
  rh: Users,
  estoque: Package,
  saude: HeartPulse,
};

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold">{titulo}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
        {itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function FichaDaProfissao({ profissao: p }: { profissao: Profissao }) {
  const { t } = useIdioma();
  const Icone = ICONES[p.icone];

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <header className="flex items-start gap-4">
        <span role="img" aria-label={p.descricaoDaImagem} className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Icone className="size-10" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{p.nome}</h2>
          <p className="mt-1 text-sm">{p.resumo}</p>
        </div>
      </header>

      <details className="mt-3 rounded-lg border border-border">
        <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-semibold text-primary">Ver atividades, ferramentas, habilidades e rotina</summary>
        <div className="space-y-4 border-t border-border p-3">
          <TextoOuvivel rotulo={`Ouvir a ficha de ${p.nome}`}>
            <div className="space-y-4">
              <Lista titulo={t("profissoes.dicionarioDeProfissoes.oQueAPessoaFaz")} itens={p.atividades} />
              <Lista titulo={t("profissoes.dicionarioDeProfissoes.ferramentasQueUsa")} itens={p.ferramentas} />
              <Lista titulo={t("profissoes.dicionarioDeProfissoes.habilidadesQueAjudam")} itens={p.habilidades} />
              <Lista titulo={t("profissoes.dicionarioDeProfissoes.exemploDeUmDiaDeTrabalho")} itens={p.rotina} />
            </div>
          </TextoOuvivel>
          <p className="text-xs text-muted-foreground">{t("profissoes.dicionarioDeProfissoes.istoEUmExemploGeralARotinaDe")}</p>
          <Button asChild variant="outline" className="min-h-11">
            <Link to="/vagas" search={{ q: p.nome.split(" ou ")[0] }}>
              Procurar vagas de {p.nome.split(" ou ")[0].toLowerCase()}
            </Link>
          </Button>
        </div>
      </details>
    </article>
  );
}

/**
 * Dicionário visual de profissões: uma ficha por profissão, com ícone grande, descrição simples,
 * atividades, ferramentas, habilidades e um exemplo de rotina. A busca filtra na hora. A ilustração é
 * um ícone (sem imagens de terceiros) com descrição em texto.
 */
export function DicionarioDeProfissoes() {
  const idBusca = useId();
  const [busca, setBusca] = useState("");
  const lista = buscarProfissoes(busca);

  return (
    <div className="mt-6 space-y-4">
      <div className="space-y-1">
        <Label htmlFor={idBusca} className="flex items-center gap-2">
          <Briefcase className="size-4" aria-hidden="true" /> Procurar uma profissão
        </Label>
        <Input id={idBusca} type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: atendente, planilhas, cozinha" maxLength={60} />
      </div>

      <p role="status" className="text-sm text-muted-foreground">
        {lista.length === 0 ? "Nenhuma profissão encontrada. Tente outra palavra." : lista.length === PROFISSOES.length ? `${lista.length} profissões.` : `${lista.length} de ${PROFISSOES.length} profissões.`}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {lista.map((p) => (
          <FichaDaProfissao key={p.id} profissao={p} />
        ))}
      </div>
    </div>
  );
}
