import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Image as ImageIcon,
  MessageCircle,
  Paperclip,
  Share2,
  ThumbsUp,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { noticias, posts as postsIniciais, vagas } from "@/lib/mock-data";
import { initials, useSession } from "@/lib/session";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — ACESSO" },
      {
        name: "description",
        content: "Acompanhe vagas inclusivas, histórias da comunidade e novidades das empresas parceiras.",
      },
      { property: "og:title", content: "Feed — ACESSO" },
      { property: "og:description", content: "Vagas, comunidade e inclusão em um só lugar." },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { user } = useSession();
  const [posts, setPosts] = useState(postsIniciais);
  const [texto, setTexto] = useState("");
  const [curtidos, setCurtidos] = useState<string[]>([]);

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* Coluna esquerda */}
        <aside aria-label="Seu resumo" className="hidden space-y-4 lg:block">
          <Card className="shadow-card">
            <CardContent className="p-5 text-center">
              <Avatar className="mx-auto size-16">
                <AvatarFallback className="bg-primary-soft text-lg font-bold text-primary">
                  {initials(user?.nome ?? "Visitante")}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-3 truncate font-bold">{user?.nome ?? "Visitante"}</h2>
              <p className="text-sm text-muted-foreground">
                {user?.titulo ?? "Entre para personalizar"}
              </p>
              <Button asChild variant="secondary" className="mt-4 min-h-11 w-full">
                <Link to="/perfil">Ver meu perfil</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="space-y-2 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Atalhos
              </h2>
              <Link to="/vagas" className="block rounded-lg px-2 py-2 text-sm font-semibold hover:bg-secondary">
                Vagas salvas
              </Link>
              <Link
                to="/configuracoes/acessibilidade"
                className="block rounded-lg px-2 py-2 text-sm font-semibold hover:bg-secondary"
              >
                Acessibilidade
              </Link>
              <Link to="/ajuda" className="block rounded-lg px-2 py-2 text-sm font-semibold hover:bg-secondary">
                Central de ajuda
              </Link>
            </CardContent>
          </Card>
        </aside>

        {/* Feed */}
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!texto.trim()) return;
                  setPosts((p) => [
                    {
                      id: `novo-${Date.now()}`,
                      autor: user?.nome ?? "Você",
                      papel: user?.titulo ?? "Membro do ACESSO",
                      tempo: "agora",
                      tipo: "texto",
                      conteudo: texto.trim(),
                      curtidas: 0,
                      comentarios: 0,
                    },
                    ...p,
                  ]);
                  setTexto("");
                }}
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                      {initials(user?.nome ?? "Visitante")}
                    </AvatarFallback>
                  </Avatar>
                  <Textarea
                    id="novo-post"
                    aria-label="Compartilhe algo com a comunidade"
                    placeholder="Compartilhe algo…"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    className="min-h-12 resize-none"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[
                    { icon: ImageIcon, label: "Foto" },
                    { icon: Video, label: "Vídeo" },
                    { icon: Paperclip, label: "Artigo" },
                  ].map((a) => (
                    <Button key={a.label} type="button" variant="ghost" className="min-h-11 gap-2">
                      <a.icon className="size-4" aria-hidden="true" /> {a.label}
                    </Button>
                  ))}
                  <Button type="submit" className="ml-auto min-h-11" disabled={!texto.trim()}>
                    Publicar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <ul className="space-y-4">
            {posts.map((post) => {
              const curtido = curtidos.includes(post.id);
              return (
                <li key={post.id}>
                  <Card className="shadow-card">
                    <CardContent className="p-5">
                      <article aria-labelledby={`autor-${post.id}`}>
                        <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                          <Avatar className="size-11 shrink-0">
                            <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
                              {initials(post.autor)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h2 id={`autor-${post.id}`} className="truncate text-base font-bold">
                              {post.autor}
                            </h2>
                            <p className="truncate text-sm text-muted-foreground">
                              {post.papel} · {post.tempo}
                            </p>
                          </div>
                        </header>

                        <p className="mt-4 text-[15px] leading-relaxed">{post.conteudo}</p>

                        {post.tipo === "vaga" && post.vagaId && (
                          <div className="mt-4 rounded-xl border border-border bg-secondary p-4">
                            <h3 className="font-bold">
                              {vagas.find((v) => v.id === post.vagaId)?.titulo}
                            </h3>
                            <ul className="mt-3 flex flex-wrap gap-2">
                              {vagas
                                .find((v) => v.id === post.vagaId)
                                ?.recursos.map((r) => (
                                  <li key={r}>
                                    <Badge variant="secondary" className="bg-card font-medium">
                                      {r}
                                    </Badge>
                                  </li>
                                ))}
                            </ul>
                            <Button asChild className="mt-4 min-h-11">
                              <Link to="/vagas">Ver vaga</Link>
                            </Button>
                          </div>
                        )}

                        <footer className="mt-4 flex flex-wrap gap-1 border-t border-border pt-3">
                          <Button
                            variant="ghost"
                            className="min-h-11 gap-2"
                            aria-pressed={curtido}
                            onClick={() =>
                              setCurtidos((c) =>
                                curtido ? c.filter((id) => id !== post.id) : [...c, post.id],
                              )
                            }
                          >
                            <ThumbsUp className="size-4" aria-hidden="true" />
                            Curtir ({post.curtidas + (curtido ? 1 : 0)})
                          </Button>
                          <Button variant="ghost" className="min-h-11 gap-2">
                            <MessageCircle className="size-4" aria-hidden="true" /> Comentar (
                            {post.comentarios})
                          </Button>
                          <Button variant="ghost" className="min-h-11 gap-2">
                            <Share2 className="size-4" aria-hidden="true" /> Compartilhar
                          </Button>
                        </footer>
                      </article>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Coluna direita */}
        <aside aria-label="Destaques" className="space-y-4">
          <Card className="shadow-card">
            <CardContent className="p-5">
              <h2 className="text-base font-bold">Vagas para você</h2>
              <ul className="mt-3 space-y-3">
                {vagas.slice(0, 3).map((v) => (
                  <li key={v.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-bold leading-snug">{v.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {v.modalidade} · {v.local}
                    </p>
                  </li>
                ))}
              </ul>
              <Button asChild variant="link" className="mt-2 h-11 px-0 font-semibold">
                <Link to="/vagas">Ver todas as vagas</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-5">
              <h2 className="text-base font-bold">Notícias de inclusão</h2>
              <ul className="mt-3 space-y-3">
                {noticias.map((n) => (
                  <li key={n} className="text-sm font-medium leading-snug">
                    {n}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
