// O idioma do documento ANTES do React montar. O título e as <meta> do index.html são o padrão
// (português) e o roteador os troca ao montar, mas o `lang` manda no leitor de tela desde a primeira
// pintura: com ele errado, a página inteira é anunciada com a pronúncia do idioma errado nesse
// intervalo.
//
// Isto é um ARQUIVO, e não um <script> embutido no HTML, porque o Content-Security-Policy de
// produção (`vercel.json`) só aceita script do próprio domínio. Embutido, ele era bloqueado em
// silêncio: a página funcionava, e esta correção simplesmente não acontecia.
//
// Mesma regra do IdiomaProvider: a escolha da pessoa, senão o idioma do navegador, senão português.
(function () {
  try {
    var locais = { pt: "pt-BR", en: "en-US", es: "es-ES" };
    var escolhido = window.localStorage.getItem("acesso:idioma");

    if (!locais[escolhido]) {
      escolhido = (navigator.languages || [navigator.language || ""])
        .map(function (l) {
          return String(l).toLowerCase().split("-")[0];
        })
        .find(function (l) {
          return locais[l];
        });
    }

    if (locais[escolhido]) document.documentElement.lang = locais[escolhido];
  } catch (e) {
    // Armazenamento bloqueado: fica o pt-BR do atributo.
  }

  // A rota sempre põe a sua própria `description`: a padrão do index.html só existe para quem não
  // executa JavaScript. Mantê-la daqui em diante deixaria a página com duas, e a primeira (em
  // português) é a que vale para quem indexa.
  var padrao = document.querySelector("meta[data-padrao][name=description]");

  if (padrao) padrao.remove();
})();
