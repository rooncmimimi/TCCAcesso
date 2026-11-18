import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";

import passo1 from "@/assets/tutorial-google/1-entrar-com-email-e-senha.png";
import passo2 from "@/assets/tutorial-google/2-contas-conectadas.png";
import passo3 from "@/assets/tutorial-google/3-confirmar-a-senha.png";

/**
 * O passo a passo que aparece quando a pessoa tenta entrar com o Google e já existe uma conta
 * ACESSO com aquele e-mail, criada com senha.
 *
 * Antes disso aqui, a tela dizia o caminho inteiro num parágrafo só ("entre, vá em Configurações,
 * Segurança, Contas conectadas..."). Quem chega aqui acabou de levar um "não" e precisa executar
 * quatro passos em duas telas diferentes: um parágrafo corrido é o pior formato possível para isso.
 *
 * **O texto de cada passo se basta.** A imagem mostra onde a coisa fica, não o que fazer — quem não
 * enxerga a imagem (leitor de tela, imagem que não carregou, conexão ruim) não perde nenhuma
 * informação necessária. É por isso que o `alt` descreve o que está na tela em vez de repetir a
 * instrução, que já está escrita ao lado.
 *
 * Os prints são capturas reais das telas do ACESSO. Quando essas telas mudarem, estas imagens
 * precisam ser recapturadas — elas moram em `src/assets/tutorial-google/`.
 */

type Passo = { texto: ChaveBase; imagem?: string; alt?: ChaveBase; largura?: number; altura?: number };

const PASSOS: ReadonlyArray<Passo> = [
  {
    texto: "retorno-google.tutorialPasso1",
    imagem: passo1,
    alt: "retorno-google.tutorialPasso1Alt",
    largura: 364,
    altura: 222,
  },
  {
    texto: "retorno-google.tutorialPasso2",
    imagem: passo2,
    alt: "retorno-google.tutorialPasso2Alt",
    largura: 732,
    altura: 64,
  },
  {
    texto: "retorno-google.tutorialPasso3",
    imagem: passo3,
    alt: "retorno-google.tutorialPasso3Alt",
    largura: 364,
    altura: 230,
  },
  // O último passo acontece na página do próprio Google: não é tela do ACESSO e não tem print.
  { texto: "retorno-google.tutorialPasso4" },
];

export function TutorialVincularGoogle() {
  const { t } = useIdioma();

  return (
    <section aria-labelledby="tutorial-google-titulo" className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-left">
      {/*
        `h2` e não `h3`: o título do aviso que vem antes é o `h1` da tela, e pular um nível deixa
        quem navega por cabeçalhos achando que perdeu uma seção pelo caminho.
      */}
      <h2 id="tutorial-google-titulo" className="text-sm font-bold">
        {t("retorno-google.tutorialTitulo")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("retorno-google.tutorialIntro")}</p>

      <ol className="mt-4 space-y-5">
        {PASSOS.map((passo, indice) => (
          <li key={passo.texto} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
            >
              {indice + 1}
            </span>

            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm">{t(passo.texto)}</p>

              {passo.imagem && passo.alt ? (
                <img
                  src={passo.imagem}
                  alt={t(passo.alt)}
                  width={passo.largura}
                  height={passo.altura}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full max-w-md rounded-lg border border-border bg-background shadow-sm"
                />
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-muted-foreground">{t("retorno-google.tutorialSoCandidato")}</p>
    </section>
  );
}
