import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [
      { title: "Central de ajuda — ACESSO" },
      { name: "description", content: "Tire dúvidas sobre conta, vagas, acessibilidade e privacidade no ACESSO." },
      { property: "og:title", content: "Central de ajuda — ACESSO" },
      { property: "og:description", content: "Respostas rápidas para usar o ACESSO com tranquilidade." },
    ],
  }),
  component: Ajuda,
});

const atalhos = [
  "Adicionar ou alterar e-mail",
  "Redefinir sua senha",
  "Ativar a leitura por voz",
  "Usar o VLibras na plataforma",
  "Candidatar-se a uma vaga",
  "Encerrar sua conta",
];

const topicos = [
  { titulo: "Informações básicas", texto: "Primeiros passos, conta e perfil no ACESSO." },
  { titulo: "Acessibilidade", texto: "Voz, Libras, contraste, fontes e navegação por teclado." },
  { titulo: "Vagas e candidaturas", texto: "Como buscar, salvar e acompanhar processos seletivos." },
  { titulo: "Privacidade dos dados", texto: "Quem vê seus dados e como baixá-los ou excluí-los." },
];

function Ajuda() {
  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Estamos aqui para ajudar</h1>
      <p className="mt-2 text-muted-foreground">Qual é a sua dúvida?</p>

      <form className="mt-6 grid max-w-xl grid-cols-[minmax(0,1fr)_auto] gap-2" role="search">
        <div className="min-w-0">
          <Label htmlFor="busca-ajuda" className="sr-only">
            Buscar na central de ajuda
          </Label>
          <Input id="busca-ajuda" className="min-h-12" placeholder="Ex.: como ativar a voz" />
        </div>
        <Button type="submit" className="min-h-12 shrink-0">
          <Search aria-hidden="true" /> Buscar
        </Button>
      </form>

      <section aria-labelledby="atalhos" className="mt-10">
        <h2 id="atalhos" className="text-xl font-bold">
          Atalhos
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {atalhos.map((a) => (
            <li key={a}>
              <button
                type="button"
                className="w-full rounded-lg border border-border px-4 py-3 text-left text-sm font-semibold hover:bg-secondary"
              >
                {a}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="topicos" className="mt-10">
        <h2 id="topicos" className="text-xl font-bold">
          Tópicos recomendados
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {topicos.map((t) => (
            <li key={t.titulo}>
              <Card className="h-full shadow-none">
                <CardContent className="p-5">
                  <h3 className="font-bold">{t.titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.texto}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">
        Precisa ajustar como você vê ou ouve o site?{" "}
        <Link to="/configuracoes/acessibilidade" className="font-semibold text-primary underline">
          Abrir configurações de acessibilidade
        </Link>
      </p>
    </AppShell>
  );
}
