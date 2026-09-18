import { Alert } from "react-native";

/** Pede confirmação nativa (Cancelar ou Excluir) antes de uma exclusão. */
export function confirmarExclusao(titulo: string, mensagem: string, aoConfirmar: () => void) {
  Alert.alert(titulo, mensagem, [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: aoConfirmar },
  ]);
}
