import { View } from "react-native";

import { useTheme } from "../../theme";

/** Linha divisória simples — decorativa, nunca deve ser lida pelo TalkBack. */
export function Divider() {
  const { theme } = useTheme();
  return <View accessible={false} style={{ height: 1, backgroundColor: theme.colors.divider }} />;
}
