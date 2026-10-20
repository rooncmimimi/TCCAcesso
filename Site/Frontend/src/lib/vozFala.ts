/**
 * Escolha da voz do `speechSynthesis` para um locale (`pt-BR`, `en-US`, `es-ES`).
 *
 * Só definir `utterance.lang` já faz o navegador procurar uma voz do idioma, mas nem todo navegador
 * respeita; escolher a voz explicitamente garante o idioma certo quando existe uma instalada. Sem
 * voz do idioma, devolve `null` e a fala segue com o padrão do navegador.
 */
function normalizar(lang: string): string {
  return lang.replace("_", "-").toLowerCase();
}

export function escolherVoz(vozes: readonly SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice | null {
  const alvo = normalizar(locale);
  const idioma = alvo.split("-")[0];

  const doIdioma = vozes.filter((v) => normalizar(v.lang).split("-")[0] === idioma);
  if (doIdioma.length === 0) return null;

  // Primeiro o locale exato (pt-BR), depois qualquer variante do idioma (pt-PT); entre iguais, a
  // voz padrão do sistema ganha.
  const exatas = doIdioma.filter((v) => normalizar(v.lang) === alvo);
  const candidatas = exatas.length > 0 ? exatas : doIdioma;
  return candidatas.find((v) => v.default) ?? candidatas[0];
}
