import { View } from "react-native";

import { useTema } from "../../tema";

/** Linha divisória simples: decorativa, nunca deve ser lida pelo TalkBack. */
export function Divisor() {
  const { tema } = useTema();
  return <View accessible={false} style={{ height: 1, backgroundColor: tema.colors.divider }} />;
}
