import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Pause, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CampoComDitado } from "@/components/acessibilidade/CampoComDitado";
import { TextoOuvivel } from "@/components/acessibilidade/TextoOuvivel";
import {
  AVISO_DE_SIMULACAO,
  EXPERIENCIAS_FICTICIAS,
  HABILIDADES_FICTICIAS,
  MODELO_DE_PEDIDO_DE_ADAPTACAO,
  PERGUNTAS_DE_ENTREVISTA,
  REQUISITOS_DA_VAGA,
  VAGA_FICTICIA,
  type Importancia,
} from "@/dados/simulador";
import { explicarClassificacao, retornoDaResposta } from "@/lib/feedbackDeResposta";
import { temProgresso, useProgressoDoSimulador } from "@/hooks/useProgressoDoSimulador";

const ETAPAS_DA_CANDIDATURA = [
  "Ler a vaga",
  "Entender os requisitos",
  "Apresentação",
  "Escolher experiências",
  "Escolher habilidades",
  "Pedir uma adaptação",
  "Revisar",
] as const;

/**
 * Área de treino. Duas atividades: simular uma candidatura a uma vaga FICTÍCIA e simular uma
 * entrevista. Nada é enviado, nenhuma candidatura real é criada e o perfil real não é lido: o
 * componente nem chama o servidor. O progresso fica só neste navegador, para pausar e continuar.
 */
export function PaginaSimulador() {
  const { progresso, atualizar, recomecar } = useProgressoDoSimulador();

  return (
    <div className="mt-6 space-y-6">
      <p role="note" className="rounded-lg border-2 border-primary/40 bg-primary-soft/40 p-3 text-sm font-medium">
        {AVISO_DE_SIMULACAO}
      </p>

      {progresso.modo === "menu" ? (
        <Menu progresso={progresso} aoEscolher={(modo) => atualizar({ modo })} aoRecomecar={recomecar} />
      ) : progresso.modo === "candidatura" ? (
        <SimuladorDeCandidatura progresso={progresso} atualizar={atualizar} />
      ) : (
        <SimuladorDeEntrevista progresso={progresso} atualizar={atualizar} />
      )}
    </div>
  );
}

type Props = {
  progresso: ReturnType<typeof useProgressoDoSimulador>["progresso"];
  atualizar: ReturnType<typeof useProgressoDoSimulador>["atualizar"];
};

function Menu({ progresso, aoEscolher, aoRecomecar }: { progresso: Props["progresso"]; aoEscolher: (m: "candidatura" | "entrevista") => void; aoRecomecar: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-xl">Simular uma candidatura</CardTitle>
            <CardDescription>Ler uma vaga fictícia, entender os requisitos, montar a apresentação e revisar, em 7 etapas, no seu ritmo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="min-h-11" onClick={() => aoEscolher("candidatura")}>
              {progresso.passoCandidatura > 0 ? "Continuar de onde parei" : "Começar"}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-xl">Simular uma entrevista</CardTitle>
            <CardDescription>Seis perguntas comuns de seleção. Você pode ouvir, ler as orientações, responder por texto ou ditado e ver sugestões.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="min-h-11" onClick={() => aoEscolher("entrevista")}>
              {progresso.passoEntrevista > 0 ? "Continuar de onde parei" : "Começar"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Pode repetir quantas vezes quiser. Não há nota, aprovação nem reprovação: é treino.</li>
        <li>O que você escreve aqui fica só neste navegador. Nada do seu perfil é usado.</li>
        <li>
          Para se candidatar de verdade, abra uma{" "}
          <Link to="/vagas" className="font-semibold text-primary underline">
            vaga
          </Link>
          . Para registrar suas adaptações, vá em{" "}
          <Link to="/minha-acessibilidade" className="font-semibold text-primary underline">
            Minha Acessibilidade
          </Link>
          .
        </li>
      </ul>

      {temProgresso(progresso) ? (
        <Button variant="ghost" onClick={aoRecomecar} className="min-h-11 gap-2">
          <RotateCcw className="size-4" aria-hidden="true" /> Apagar o que escrevi e recomeçar do zero
        </Button>
      ) : null}
    </div>
  );
}

function Cabecalho({ rotulo, passo, total, titulo, aoPausar }: { rotulo: string; passo: number; total: number; titulo: string; aoPausar: () => void }) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  // Ao mudar de etapa, o foco vai para o título, para o leitor de tela anunciar onde a pessoa está.
  useEffect(() => {
    if (passo > 0) tituloRef.current?.focus();
  }, [passo]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm font-semibold text-primary">
          Etapa {passo + 1} de {total} — {titulo}
        </p>
        <Button type="button" variant="outline" size="sm" className="min-h-11 gap-2" onClick={aoPausar}>
          <Pause className="size-4" aria-hidden="true" /> Pausar e continuar depois
        </Button>
      </div>
      <h2 ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
        {rotulo}
      </h2>
    </div>
  );
}

function Navegacao({ passo, total, aoVoltar, aoAvancar, aoTerminar }: { passo: number; total: number; aoVoltar: () => void; aoAvancar: () => void; aoTerminar: () => void }) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {passo > 0 ? (
        <Button type="button" variant="outline" className="min-h-11" onClick={aoVoltar}>
          Voltar
        </Button>
      ) : null}
      {passo < total - 1 ? (
        <Button type="button" className="min-h-11" onClick={aoAvancar}>
          Continuar
        </Button>
      ) : (
        <Button type="button" className="min-h-11" onClick={aoTerminar}>
          Terminar o treino
        </Button>
      )}
    </div>
  );
}

function SimuladorDeCandidatura({ progresso, atualizar }: Props) {
  const passo = Math.min(progresso.passoCandidatura, ETAPAS_DA_CANDIDATURA.length - 1);
  const total = ETAPAS_DA_CANDIDATURA.length;
  const irPara = (p: number) => atualizar({ passoCandidatura: p });
  const texto = (chave: string) => progresso.textos[chave] ?? "";
  const definirTexto = (chave: string, valor: string) => atualizar({ textos: { ...progresso.textos, [chave]: valor } });

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4 p-6">
        <Cabecalho rotulo={ETAPAS_DA_CANDIDATURA[passo]} passo={passo} total={total} titulo={ETAPAS_DA_CANDIDATURA[passo]} aoPausar={() => atualizar({ modo: "menu" })} />

        {passo === 0 ? (
          <div className="space-y-3">
            <h3 className="text-lg font-bold">
              {VAGA_FICTICIA.titulo} — {VAGA_FICTICIA.empresa}
            </h3>
            <TextoOuvivel rotulo="Ouvir a vaga fictícia">
              <p className="text-sm">{VAGA_FICTICIA.descricao}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                <li>Local e horário: {VAGA_FICTICIA.local}.</li>
                <li>Contrato: {VAGA_FICTICIA.contrato}.</li>
                <li>Benefícios: {VAGA_FICTICIA.beneficios}</li>
                <li>Acessibilidade: {VAGA_FICTICIA.acessibilidade}</li>
              </ul>
            </TextoOuvivel>
            <p className="text-sm text-muted-foreground">Leia com calma. Na próxima etapa você separa o que a vaga exige do que é só um diferencial.</p>
          </div>
        ) : null}

        {passo === 1 ? (
          <div className="space-y-3">
            <p className="text-sm">
              A vaga diz que são <strong>indispensáveis</strong> o ensino médio, escrever e-mails claros e gostar de atender pessoas. Planilhas e inglês básico são <strong>diferenciais</strong>, e ter
              trabalhado com atendimento é “ótimo, mas não obrigatório”. Marque cada requisito como obrigatório ou desejável.
            </p>
            <ul className="space-y-4">
              {REQUISITOS_DA_VAGA.map((r) => {
                const escolhida = progresso.classificacao[r.id];

                return (
                  <li key={r.id} className="space-y-1">
                    <fieldset>
                      <legend className="text-sm font-semibold">{r.texto}</legend>
                      <div className="mt-1 flex flex-wrap gap-4">
                        {(["obrigatorio", "desejavel"] as Importancia[]).map((valor) => (
                          <label key={valor} className="flex min-h-11 items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`requisito-${r.id}`}
                              checked={escolhida === valor}
                              onChange={() => atualizar({ classificacao: { ...progresso.classificacao, [r.id]: valor } })}
                            />
                            {valor === "obrigatorio" ? "Obrigatório" : "Desejável"}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {escolhida ? (
                      <p role="status" className="text-sm text-muted-foreground">
                        {explicarClassificacao(r.correta, escolhida)} <span className="italic">{r.dica}</span>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {passo === 2 ? (
          <div className="space-y-2">
            <p className="text-sm">Escreva, em poucas frases, quem você é profissionalmente. É só um treino: pode ser uma pessoa inventada.</p>
            <Label htmlFor="sim-apresentacao">Apresentação</Label>
            <CampoComDitado id="sim-apresentacao" valor={texto("apresentacao")} aoMudar={(v) => definirTexto("apresentacao", v)} rows={5} maxLength={1000} ajuda="Exemplo: “Trabalhei dois anos em atendimento e gosto de organizar tarefas. Busco uma vaga administrativa.”" />
          </div>
        ) : null}

        {passo === 3 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm">Escolha as experiências fictícias que combinam com a vaga. Não precisa marcar todas.</legend>
            <ul className="space-y-2">
              {EXPERIENCIAS_FICTICIAS.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`sim-exp-${e.id}`}
                    className="mt-1"
                    checked={progresso.experiencias.includes(e.id)}
                    onCheckedChange={(v) => atualizar({ experiencias: v === true ? [...progresso.experiencias, e.id] : progresso.experiencias.filter((x) => x !== e.id) })}
                  />
                  <Label htmlFor={`sim-exp-${e.id}`} className="text-sm font-normal leading-snug">
                    <strong>{e.titulo}.</strong> {e.detalhe}
                  </Label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}

        {passo === 4 ? (
          <div className="space-y-3">
            <fieldset className="space-y-2">
              <legend className="text-sm">Escolha de três a cinco habilidades que a vaga procura.</legend>
              <ul className="space-y-1">
                {HABILIDADES_FICTICIAS.map((h) => (
                  <li key={h} className="flex items-start gap-3">
                    <Checkbox
                      id={`sim-hab-${h}`}
                      className="mt-1"
                      checked={progresso.habilidades.includes(h)}
                      onCheckedChange={(v) => atualizar({ habilidades: v === true ? [...progresso.habilidades, h] : progresso.habilidades.filter((x) => x !== h) })}
                    />
                    <Label htmlFor={`sim-hab-${h}`} className="text-sm font-normal">
                      {h}
                    </Label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <Label htmlFor="sim-habilidade-exemplo">Conte como você usou uma delas (opcional)</Label>
            <CampoComDitado id="sim-habilidade-exemplo" valor={texto("habilidade")} aoMudar={(v) => definirTexto("habilidade", v)} rows={3} maxLength={600} />
          </div>
        ) : null}

        {passo === 5 ? (
          <div className="space-y-2">
            <p className="text-sm">
              Pedir uma adaptação é um direito e é normal. Diga o que você precisa para participar, sem precisar explicar a sua condição. Veja um modelo e escreva o seu:
            </p>
            <blockquote className="rounded-lg border-l-4 border-primary bg-muted/40 p-3 text-sm italic">{MODELO_DE_PEDIDO_DE_ADAPTACAO}</blockquote>
            <Label htmlFor="sim-adaptacao">Seu pedido de adaptação</Label>
            <CampoComDitado id="sim-adaptacao" valor={texto("adaptacao")} aoMudar={(v) => definirTexto("adaptacao", v)} rows={4} maxLength={600} />
          </div>
        ) : null}

        {passo === 6 ? (
          <div className="space-y-3">
            <h3 className="text-lg font-bold">Sua candidatura de treino</h3>
            <p className="text-sm text-muted-foreground">É assim que ficaria. Nada disto foi enviado e nenhuma candidatura de verdade foi criada.</p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold">Vaga</dt>
                <dd>
                  {VAGA_FICTICIA.titulo}, {VAGA_FICTICIA.empresa}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Requisitos que você separou</dt>
                <dd>{Object.keys(progresso.classificacao).length} de {REQUISITOS_DA_VAGA.length} classificados</dd>
              </div>
              <div>
                <dt className="font-semibold">Apresentação</dt>
                <dd className="whitespace-pre-line">{texto("apresentacao") || "Você não escreveu ainda."}</dd>
              </div>
              <div>
                <dt className="font-semibold">Experiências escolhidas</dt>
                <dd>{progresso.experiencias.length ? EXPERIENCIAS_FICTICIAS.filter((e) => progresso.experiencias.includes(e.id)).map((e) => e.titulo).join("; ") : "Nenhuma."}</dd>
              </div>
              <div>
                <dt className="font-semibold">Habilidades</dt>
                <dd>{progresso.habilidades.length ? progresso.habilidades.join(", ") : "Nenhuma."}</dd>
              </div>
              <div>
                <dt className="font-semibold">Pedido de adaptação</dt>
                <dd className="whitespace-pre-line">{texto("adaptacao") || "Você não escreveu ainda."}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <Navegacao passo={passo} total={total} aoVoltar={() => irPara(passo - 1)} aoAvancar={() => irPara(passo + 1)} aoTerminar={() => atualizar({ modo: "menu", passoCandidatura: 0 })} />
      </CardContent>
    </Card>
  );
}

function SimuladorDeEntrevista({ progresso, atualizar }: Props) {
  const total = PERGUNTAS_DE_ENTREVISTA.length;
  const passo = Math.min(progresso.passoEntrevista, total - 1);
  const pergunta = PERGUNTAS_DE_ENTREVISTA[passo];
  const resposta = progresso.respostas[pergunta.id] ?? "";
  const retorno = resposta.trim() ? retornoDaResposta(resposta) : null;

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4 p-6">
        <Cabecalho rotulo={`Pergunta ${passo + 1}`} passo={passo} total={total} titulo={pergunta.pergunta} aoPausar={() => atualizar({ modo: "menu" })} />

        <TextoOuvivel rotulo="Ouvir a pergunta">
          <p className="text-lg font-semibold">{pergunta.pergunta}</p>
        </TextoOuvivel>

        <details className="rounded-lg border p-3 text-sm">
          <summary className="min-h-11 cursor-pointer font-semibold text-primary">Orientações e um exemplo</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {pergunta.orientacao.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <p className="mt-2">
            <span className="font-semibold">Exemplo (invente a sua resposta, este é só uma ilustração): </span>
            {pergunta.exemplo}
          </p>
        </details>

        <div className="space-y-2">
          <Label htmlFor="sim-resposta">Sua resposta</Label>
          <CampoComDitado id="sim-resposta" valor={resposta} aoMudar={(v) => atualizar({ respostas: { ...progresso.respostas, [pergunta.id]: v } })} rows={5} maxLength={1500} ajuda="Respostas curtas e diretas também valem." />
        </div>

        {retorno ? (
          <section aria-labelledby="sim-retorno" className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <h3 id="sim-retorno" className="font-bold">
              Sugestões para a sua resposta
            </h3>
            {retorno.pontosFortes.length > 0 ? (
              <div>
                <p className="font-semibold">O que já está bom</p>
                <ul className="list-disc pl-5">
                  {retorno.pontosFortes.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {retorno.sugestoes.length > 0 ? (
              <div>
                <p className="font-semibold">Ideias para melhorar</p>
                <ul className="list-disc pl-5">
                  {retorno.sugestoes.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">Isto é um treino, sem nota. Não avalia você nem a sua capacidade: cada pessoa tem o seu jeito de se comunicar.</p>
          </section>
        ) : null}

        <Navegacao passo={passo} total={total} aoVoltar={() => atualizar({ passoEntrevista: passo - 1 })} aoAvancar={() => atualizar({ passoEntrevista: passo + 1 })} aoTerminar={() => atualizar({ modo: "menu", passoEntrevista: 0 })} />
      </CardContent>
    </Card>
  );
}
