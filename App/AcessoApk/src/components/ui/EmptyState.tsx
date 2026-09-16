import { Text } from "react-native";

import { useTheme } from "../../theme";
import { Button } from "./Button";
import { Card } from "./Card";

type EmptyStateProps = {
  /** Algumas telas (`FollowListScreen`, `BlockedUsersScreen`) usam só uma
   * frase, sem título — omitir esta prop reproduz esse caso mais simples. */
  title?: string;
  description: string;
  action?: { label: string; onPress: () => void };
};

/**
 * "Nenhum item encontrado" (redesign visual, Bloco 8 — "Estados globais") —
 * substitui as 9 cópias quase idênticas deste card espalhadas por
 * `ListEmptyComponent`s (`HomeScreen`, `JobsScreen`, `MessagesScreen`,
 * `NotificationsScreen`, `MyJobsScreen`, `SearchScreen`,
 * `SearchResultsScreen`, `FollowListScreen`, `BlockedUsersScreen`). Não
 * inclui `ScreenContainer`: quem usa isto já está dentro de um (como
 * `ListEmptyComponent` de uma lista, ou dentro do próprio scroll da tela).
 * As mensagens "Nenhuma X cadastrada ainda." dentro das seções de
 * `MyProfileScreen.tsx` continuam como texto simples, de propósito — ali o
 * `SectionHeader` da própria seção já dá o contexto do "o quê", um card
 * cheio ali seria peso visual sem necessidade.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <Card elevation="md" style={{ gap: theme.spacing.xs }}>
      {title ? (
        <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      ) : null}
      <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{description}</Text>
      {action ? (
        <Button variant="outline" size="small" onPress={action.onPress}>
          {action.label}
        </Button>
      ) : null}
    </Card>
  );
}
