import { imagemDoPrint } from "@/dados/tutoriaisAjuda";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";

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
 * Os prints são capturas das telas do ACESSO, os mesmos da Central de Ajuda, no idioma de quem lê.
 * Quando essas telas mudarem, `npm run ajuda:prints` tira tudo de novo.
 */

type Passo = { texto: ChaveBase; print?: string; alt?: ChaveBase };

const PASSOS: ReadonlyArray<Passo> = [
  { texto: "retorno-google.tutorialPasso1", print: "google-1-entrar", alt: "retorno-google.tutorialPasso1Alt" },
  { texto: "retorno-google.tutorialPasso2", print: "google-2-contas", alt: "retorno-google.tutorialPasso2Alt" },
  { texto: "retorno-google.tutorialPasso3", print: "google-3-senha", alt: "retorno-google.tutorialPasso3Alt" },
  // O último passo acontece na página do próprio Google: não é tela do ACESSO e não tem print.
  { texto: "retorno-google.tutorialPasso4" },
];

function Print({ nome, alt, idioma }: { nome: string; alt: string; idioma: Parameters<typeof imagemDoPrint>[1] }) {
  const imagem = imagemDoPrint(nome, idioma);

  return (
    <img
      src={imagem.src}
      alt={alt}
      width={imagem.largura}
      height={imagem.altura}
      loading="lazy"
      decoding="async"
      className="h-auto w-full max-w-md rounded-lg border border-border bg-background shadow-sm"
    />
  );
}

export function TutorialVincularGoogle() {
  const { t, idioma } = useIdioma();

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

              {passo.print && passo.alt ? <Print nome={passo.print} alt={t(passo.alt)} idioma={idioma} /> : null}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-muted-foreground">{t("retorno-google.tutorialSoCandidato")}</p>
    </section>
  );
}
