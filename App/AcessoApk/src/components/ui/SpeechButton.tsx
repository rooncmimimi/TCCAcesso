import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";

import { useAccessibility } from "../../accessibility";
import { useTheme } from "../../theme";

const IDIOMA = "pt-BR";

type SpeechButtonProps = {
  /** O texto a ser lido em voz alta — nunca gerado/resumido aqui, sempre o conteúdo real que o chamador já monta (ver `VagaDetailScreen.tsx`/`PostagemDetailScreen.tsx`). */
  texto: string;
  /** Nome do que será lido, usado no `accessibilityLabel` (ex.: "esta vaga", "esta publicação"). */
  rotulo?: string;
};

/**
 * Botão "Ouvir em voz alta" (Fase 21) — Text-to-Speech de verdade via
 * `expo-speech`, a integração que a Fase 5 preparou o terreno mas não
 * instalou (`preferences.voiceEnabled`, ver `accessibility/README.md`).
 *
 * Diferente do TalkBack (que lê elemento por elemento conforme o usuário
 * navega), isto lê um trecho de conteúdo inteiro de uma vez, sem precisar
 * varrer a tela — as duas coisas coexistem sem conflito técnico (motores de
 * fala diferentes) e continuam disponíveis juntas mesmo com um leitor de
 * tela ativo (`system.screenReaderEnabled`): decisão de UX desta fase,
 * documentada aqui porque o `README.md` da pasta deixou a pergunta em
 * aberto — esconder o botão privaria justamente quem mais usa tecnologia
 * assistiva de uma leitura contínua, sem ganho real de acessibilidade.
 *
 * Só se renderiza quando `voiceEnabled` está ativo (consentimento
 * explícito do usuário) e há texto de verdade para ler — nunca aparece
 * "morto" (desabilitado) sem função nenhuma.
 */
export function SpeechButton({ texto, rotulo = "este conteúdo" }: SpeechButtonProps) {
  const { preferences } = useAccessibility();
  const { theme } = useTheme();
  const [falando, setFalando] = useState(false);

  // Nunca deixa uma leitura tocando "no vazio" depois que a tela some (o
  // usuário navegou pra outra publicação/vaga enquanto ainda ouvia esta).
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (!preferences.voiceEnabled || texto.trim().length === 0) return null;

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
        minHeight: theme.sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        alignSelf: "flex-start",
      }}
    >
      <Text style={[theme.typography.button, { color: theme.colors.primary.solid }]}>
        {falando ? "Parar leitura" : "Ouvir em voz alta"}
      </Text>
    </Pressable>
  );
}
