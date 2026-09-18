import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";

import { useAcessibilidade } from "../../acessibilidade";
import { useTema } from "../../tema";

const IDIOMA = "pt-BR";

type BotaoOuvirProps = {
  /** O texto a ser lido em voz alta, nunca gerado/resumido aqui, sempre o conteúdo real que o chamador já monta (ver `DetalheVagaScreen.tsx`/`DetalhePostagemScreen.tsx`). */
  texto: string;
  /** Nome do que será lido, usado no `accessibilityLabel` (ex.: "esta vaga", "esta publicação"). */
  rotulo?: string;
};

/**
 * Botão "Ouvir em voz alta": lê um trecho inteiro com `expo-speech`, diferente do TalkBack, que lê
 * elemento por elemento conforme a navegação. Continua disponível com leitor de tela ativo: os
 * motores de fala são diferentes, e esconder o botão tiraria a leitura contínua justamente de quem
 * mais usa tecnologia assistiva.
 *
 * Só aparece com `voiceEnabled` ligado (consentimento da pessoa) e com texto para ler; nunca fica
 * visível sem função.
 */
export function BotaoOuvir({ texto, rotulo = "este conteúdo" }: BotaoOuvirProps) {
  const { preferencias } = useAcessibilidade();
  const { tema } = useTema();
  const [falando, setFalando] = useState(false);

  // Nunca deixa uma leitura tocando "no vazio" depois que a tela some (o
  // usuário navegou pra outra publicação/vaga enquanto ainda ouvia esta).
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (!preferencias.voiceEnabled || texto.trim().length === 0) return null;

  function alternar() {
    if (falando) {
      Speech.stop();
      setFalando(false);
      return;
    }

    setFalando(true);
    Speech.speak(texto, {
      language: IDIOMA,
      onDone: () => setFalando(false),
      onStopped: () => setFalando(false),
      onError: () => setFalando(false),
    });
  }

  return (
    <Pressable
      onPress={alternar}
      accessibilityRole="button"
      accessibilityLabel={falando ? `Parar leitura de ${rotulo}` : `Ouvir ${rotulo} em voz alta`}
      accessibilityState={{ selected: falando }}
      hitSlop={10}
      style={{
        minHeight: tema.sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: tema.spacing.xs,
        alignSelf: "flex-start",
      }}
    >
      <Text style={[tema.typography.button, { color: tema.colors.primary.solid }]}>
        {falando ? "Parar leitura" : "Ouvir em voz alta"}
      </Text>
    </Pressable>
  );
}
