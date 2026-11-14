import { HACHURAS, idDaHachura } from "@/lib/hachuras";

/**
 * As cinco texturas de um gráfico. Devolve só as `<pattern>`: quem põe o `<defs>` em volta é o
 * gráfico, porque o recharts repassa um `<defs>` para dentro do seu `<svg>` (é assim que os
 * exemplos de gradiente dele funcionam), mas descarta um componente que ele não conhece.
 *
 * A `<pattern>` precisa estar no MESMO `<svg>` que a usa: num `<svg>` escondido ao lado, o
 * `fill="url(#id)"` resolve mas não pinta nada.
 *
 * Não desenha nada sozinha: só declara as cinco texturas. Quem as usa é o `fill` de cada barra ou
 * fatia, por `preenchimentoDaSerie`.
 */
export function HachurasDeGrafico({ prefixo }: { prefixo: string }) {
  return (
    <>
      {HACHURAS.map((hachura, indice) => (
        <pattern
          key={hachura.tipo + indice}
          id={idDaHachura(prefixo, indice)}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${hachura.giro})`}
        >
          {/* A cor da série, que o padrão visual escolhido redefine. */}
          <rect width="8" height="8" fill={`var(--chart-${indice + 1})`} />

          {hachura.tipo === "diagonal" || hachura.tipo === "cruzada" ? (
            <path d="M 0 0 L 0 8" stroke="var(--hachura)" strokeWidth="2.5" />
          ) : null}

          {hachura.tipo === "cruzada" ? (
            <path d="M 0 0 L 8 0" stroke="var(--hachura)" strokeWidth="2.5" />
          ) : null}

          {hachura.tipo === "horizontal" ? (
            <path d="M 0 4 L 8 4" stroke="var(--hachura)" strokeWidth="3" />
          ) : null}

          {hachura.tipo === "pontos" ? <circle cx="4" cy="4" r="1.8" fill="var(--hachura)" /> : null}
        </pattern>
      ))}
    </>
  );
}
