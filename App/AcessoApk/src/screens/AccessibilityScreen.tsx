import * as Speech from "expo-speech";
import { Alert, ScrollView, Text, View } from "react-native";

import { useAccessibility } from "../accessibility";
import { Badge, Button, Card, Divider, Input, ScreenContainer, SegmentedControl, ToggleRow } from "../components/ui";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const FRASE_TESTE = "Este é um exemplo de como o Sistema de Voz vai ler o conteúdo do aplicativo.";

/**
 * Configurações → Acessibilidade (Fase 6). Fala só com `useAccessibility()`
 * — nenhum estado próprio de preferência, nenhum `AsyncStorage` direto.
 * Como o resto do app já lê `theme.colors`/`theme.typography` (nunca hex ou
 * `fontSize` soltos), qualquer alteração aqui já aparece em tempo real na
 * própria tela sem nenhum código extra de "preview" — é a mesma árvore de
 * componentes (`Card`/`Button`/`Input`/`Badge`) usada no resto do app.
 */
export function AccessibilityScreen() {
  const { theme } = useTheme();
  const { preferences, setPreference, togglePreference, resetPreferences, system } = useAccessibility();

  function confirmarRestaurarPadroes() {
    Alert.alert(
      "Restaurar padrões de acessibilidade",
      "Todas as preferências desta tela voltam ao valor padrão (tema do sistema, sem alto contraste, fonte no tamanho normal). O restante da sua conta não é afetado.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Restaurar", onPress: () => resetPreferences() },
      ],
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.xl, paddingVertical: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>
            Personalize sua experiência
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
            Ajuste o aplicativo para deixá-lo mais confortável e acessível. As mudanças aparecem imediatamente nesta
            tela.
          </Text>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionHeader title="Visual" theme={theme} />

          <SegmentedControl
            label="Tema"
            value={preferences.themeMode}
            onChange={(valor) => setPreference("themeMode", valor)}
            options={[
              { label: "Sistema", value: "system" },
              { label: "Claro", value: "light" },
              { label: "Escuro", value: "dark" },
            ]}
          />

          <ToggleRow
            label="Alto contraste"
            description="Aumenta o contraste entre texto, fundo e elementos da interface para facilitar a leitura."
            value={preferences.highContrast}
            onValueChange={() => togglePreference("highContrast")}
          />

          <SegmentedControl
            label="Tamanho do texto"
            value={preferences.fontScale}
            onChange={(valor) => setPreference("fontScale", valor)}
            options={[
              { label: "Pequeno", value: "small" },
              { label: "Médio", value: "medium" },
              { label: "Grande", value: "large" },
              { label: "Muito grande", value: "extraLarge" },
            ]}
          />

          <SegmentedControl
            label="Espaçamento entre letras"
            hint="Aumenta o espaço entre as letras para facilitar a leitura."
            value={preferences.letterSpacing}
            onChange={(valor) => setPreference("letterSpacing", valor)}
            options={[
              { label: "Normal", value: "normal" },
              { label: "Confortável", value: "comfortable" },
              { label: "Amplo", value: "wide" },
            ]}
          />

          <SegmentedControl
            label="Espaçamento entre linhas"
            value={preferences.lineHeightScale}
            onChange={(valor) => setPreference("lineHeightScale", valor)}
            options={[
              { label: "Normal", value: "normal" },
              { label: "Relaxado", value: "relaxed" },
              { label: "Amplo", value: "loose" },
            ]}
          />
        </View>

        <Divider />

        <View style={{ gap: theme.spacing.lg }}>
          <SectionHeader title="Interação" theme={theme} />

          <ToggleRow
            label="Foco ampliado"
            description="Torna o indicador de foco mais visível para navegação por teclado, D-pad e tecnologias assistivas."
            value={preferences.enhancedFocus}
            onValueChange={() => togglePreference("enhancedFocus")}
          />

          <ToggleRow
            label="Reduzir animações"
            description="Reduz movimentos e animações da interface."
            value={preferences.reduceMotion}
            onValueChange={() => togglePreference("reduceMotion")}
          />

          {/* Sem controle nenhum de propósito: não existe um "modo" de
              navegação por teclado para ligar/desligar — o foco por
              teclado físico, D-pad e switch access já funciona sempre no
              Android (Fase 5/6, item 17). Um botão aqui não teria efeito
              nenhum, então não existe. */}
          <InfoRow
            label="Navegação por teclado"
            value="Suportada automaticamente pelo aplicativo, sem nenhum ajuste necessário."
            theme={theme}
          />
        </View>

        <Divider />

        <View style={{ gap: theme.spacing.lg }}>
          <SectionHeader title="Leitura" theme={theme} />

          {/* Nunca nomeamos o TalkBack especificamente aqui — a API só
              informa que ALGUM leitor de tela está ativo, nunca qual
              (Fase 5, item 32). */}
          <InfoRow
            label="Leitor de tela"
            value={system.screenReaderEnabled ? "Leitor de tela detectado." : "Nenhum leitor de tela detectado."}
            theme={theme}
          />

          <ToggleRow
            label="Leitura por voz"
            description="Ativa botões de 'Ouvir em voz alta' em vagas e publicações, lendo o conteúdo com a voz do próprio aparelho. É diferente do leitor de tela: continua disponível mesmo se você já usa um."
            value={preferences.voiceEnabled}
            onValueChange={() => togglePreference("voiceEnabled")}
          />
          {preferences.voiceEnabled ? (
            <Button
              variant="outline"
              size="small"
              onPress={() => Speech.speak(FRASE_TESTE, { language: "pt-BR" })}
              accessibilityLabel="Testar leitura por voz"
            >
              Testar leitura por voz
            </Button>
          ) : null}
        </View>

        <Divider />

        <View style={{ gap: theme.spacing.lg }}>
          <SectionHeader title="Outras opções" theme={theme} />

          <ToggleRow
            label="Fonte para dislexia"
            description="Troca a fonte do aplicativo pela Lexend, desenhada para deixar a leitura mais fácil."
            value={preferences.dyslexiaFont}
            onValueChange={() => togglePreference("dyslexiaFont")}
          />

          {/* Sem controle nenhum de propósito: não existe um "cursor" em
              interfaces de toque para ampliar — ver `README.md` desta
              pasta. Um botão aqui sugeriria uma função que não existe. */}
          <InfoRow label="Cursor ampliado" value="Não se aplica a interfaces por toque." theme={theme} />
        </View>

        <Divider />

        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Prévia" theme={theme} />
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
            Estes elementos usam o mesmo tema do resto do aplicativo — o que você vê aqui é exatamente o que vai
            aparecer nas outras telas.
          </Text>

          <Card elevation="md" style={{ gap: theme.spacing.md }}>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Título de exemplo</Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              Este texto demonstra como ficará a leitura no aplicativo, incluindo o espaçamento entre letras e entre
              linhas escolhido acima.
            </Text>

            <Button variant="primary" accessibilityLabel="Botão principal, exemplo" onPress={() => {}}>
              Botão principal
            </Button>

            <Input label="Campo de exemplo" placeholder="Digite aqui..." />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
              <Badge variant="success">Mensagem de sucesso</Badge>
              <Badge variant="warning">Mensagem de atenção</Badge>
            </View>
          </Card>
        </View>

        <Button variant="outline" onPress={confirmarRestaurarPadroes} accessibilityLabel="Restaurar padrões de acessibilidade">
          Restaurar padrões
        </Button>
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionHeader({ title, theme }: { title: string; theme: Theme }) {
  return (
    <Text accessibilityRole="header" style={[theme.typography.label, { color: theme.colors.primary.solid }]}>
      {title.toUpperCase()}
    </Text>
  );
}

/** Linha "rótulo + valor" só informativa — sem controle nenhum, de propósito (ver comentários de uso acima). */
function InfoRow({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]}>{label}</Text>
      <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{value}</Text>
    </View>
  );
}
