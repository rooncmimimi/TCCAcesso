import * as Speech from "expo-speech";
import { Alert, ScrollView, Text, View } from "react-native";

import { useAcessibilidade } from "../acessibilidade";
import { Avatar, Etiqueta, Botao, Cartao, Divisor, CampoTexto, ContainerTela, ControleSegmentado, LinhaInterruptor } from "../components/ui";
import { useTema } from "../tema";
import type { Tema } from "../tema";

const FRASE_TESTE = "Este é um exemplo de como o Sistema de Voz vai ler o conteúdo do aplicativo.";

/**
 * Preferências de acessibilidade. Usa só o `useAcessibilidade()`, sem estado próprio nem acesso
 * direto ao AsyncStorage. Como o app inteiro lê `tema.colors` e `tema.typography`, cada ajuste
 * aparece na hora nesta própria tela, sem código de prévia à parte.
 */
export function AcessibilidadeScreen() {
  const { tema } = useTema();
  const { preferencias, definirPreferencia, alternarPreferencia, restaurarPreferencias, sistema } = useAcessibilidade();

  function confirmarRestaurarPadroes() {
    Alert.alert(
      "Restaurar padrões de acessibilidade",
      "Todas as preferências desta tela voltam ao valor padrão (tema do sistema, sem alto contraste, fonte no tamanho normal). O restante da sua conta não é afetado.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Restaurar", onPress: () => restaurarPreferencias() },
      ],
    );
  }

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.xl, paddingVertical: tema.spacing.lg }}>
        <View style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.heading, { color: tema.colors.textPrimary }]}>
            Personalize sua experiência
          </Text>
          <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>
            Ajuste o aplicativo para deixá-lo mais confortável e acessível. As mudanças aparecem imediatamente nesta
            tela.
          </Text>
        </View>

        <View style={{ gap: tema.spacing.lg }}>
          <RotuloGrupo titulo="Visual" tema={tema} />

          <ControleSegmentado
            rotulo="Tema"
            value={preferencias.themeMode}
            onChange={(valor) => definirPreferencia("themeMode", valor)}
            opcoes={[
              { rotulo: "Sistema", value: "system" },
              { rotulo: "Claro", value: "light" },
              { rotulo: "Escuro", value: "dark" },
            ]}
          />

          <LinhaInterruptor
            rotulo="Alto contraste"
            descricao="Aumenta o contraste entre texto, fundo e elementos da interface para facilitar a leitura."
            value={preferencias.highContrast}
            onValueChange={() => alternarPreferencia("highContrast")}
          />

          <ControleSegmentado
            rotulo="Tamanho do texto"
            value={preferencias.fontScale}
            onChange={(valor) => definirPreferencia("fontScale", valor)}
            opcoes={[
              { rotulo: "Pequeno", value: "small" },
              { rotulo: "Médio", value: "medium" },
              { rotulo: "Grande", value: "large" },
              { rotulo: "Muito grande", value: "extraLarge" },
            ]}
          />

          <ControleSegmentado
            rotulo="Espaçamento entre letras"
            dica="Aumenta o espaço entre as letras para facilitar a leitura."
            value={preferencias.letterSpacing}
            onChange={(valor) => definirPreferencia("letterSpacing", valor)}
            opcoes={[
              { rotulo: "Normal", value: "normal" },
              { rotulo: "Confortável", value: "comfortable" },
              { rotulo: "Amplo", value: "wide" },
            ]}
          />

          <ControleSegmentado
            rotulo="Espaçamento entre linhas"
            value={preferencias.lineHeightScale}
            onChange={(valor) => definirPreferencia("lineHeightScale", valor)}
            opcoes={[
              { rotulo: "Normal", value: "normal" },
              { rotulo: "Relaxado", value: "relaxed" },
              { rotulo: "Amplo", value: "loose" },
            ]}
          />
        </View>

        <Divisor />

        <View style={{ gap: tema.spacing.lg }}>
          <RotuloGrupo titulo="Interação" tema={tema} />

          <LinhaInterruptor
            rotulo="Foco ampliado"
            descricao="Torna o indicador de foco mais visível para navegação por teclado, D-pad e tecnologias assistivas."
            value={preferencias.enhancedFocus}
            onValueChange={() => alternarPreferencia("enhancedFocus")}
          />

          <LinhaInterruptor
            rotulo="Reduzir animações"
            descricao="Reduz movimentos e animações da interface."
            value={preferencias.reduceMotion}
            onValueChange={() => alternarPreferencia("reduceMotion")}
          />

          {/* Sem controle de propósito: o foco por teclado físico, D-pad e acesso por botão já
              funciona sempre no Android, e um botão aqui não teria efeito. */}
          <LinhaInformacao
            rotulo="Navegação por teclado"
            value="Suportada automaticamente pelo aplicativo, sem nenhum ajuste necessário."
            tema={tema}
          />
        </View>

        <Divisor />

        <View style={{ gap: tema.spacing.lg }}>
          <RotuloGrupo titulo="Leitura" tema={tema} />

          {/* Não cita o TalkBack pelo nome: a API só informa que há algum leitor de tela ativo,
              não qual. */}
          <LinhaInformacao
            rotulo="Leitor de tela"
            value={sistema.leitorDeTelaAtivo ? "Leitor de tela detectado." : "Nenhum leitor de tela detectado."}
            tema={tema}
          />

          <LinhaInterruptor
            rotulo="Leitura por voz"
            descricao="Ativa botões de 'Ouvir em voz alta' em vagas e publicações, lendo o conteúdo com a voz do próprio aparelho. É diferente do leitor de tela: continua disponível mesmo se você já usa um."
            value={preferencias.voiceEnabled}
            onValueChange={() => alternarPreferencia("voiceEnabled")}
          />
          {preferencias.voiceEnabled ? (
            <Botao
              variant="outline"
              size="small"
              onPress={() => Speech.speak(FRASE_TESTE, { language: "pt-BR" })}
              accessibilityLabel="Testar leitura por voz"
            >
              Testar leitura por voz
            </Botao>
          ) : null}
        </View>

        <Divisor />

        <View style={{ gap: tema.spacing.lg }}>
          <RotuloGrupo titulo="Outras opções" tema={tema} />

          <LinhaInterruptor
            rotulo="Fonte para dislexia"
            descricao="Troca a fonte do aplicativo pela Lexend, desenhada para deixar a leitura mais fácil."
            value={preferencias.dyslexiaFont}
            onValueChange={() => alternarPreferencia("dyslexiaFont")}
          />

          {/* Sem controle de propósito: interfaces de toque não têm cursor para ampliar (ver
              `acessibilidade/README.md`), e um botão sugeriria uma função que não existe. */}
          <LinhaInformacao rotulo="Cursor ampliado" value="Não se aplica a interfaces por toque." tema={tema} />
        </View>

        <Divisor />

        <View style={{ gap: tema.spacing.md }}>
          <RotuloGrupo titulo="Prévia" tema={tema} />
          <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
            Estes elementos usam o mesmo tema do resto do aplicativo — o que você vê aqui é exatamente o que vai
            aparecer nas outras telas.
          </Text>

          <Cartao elevacao="md" style={{ gap: tema.spacing.md }}>
            {/* Avatar de exemplo, o mesmo componente do feed, das vagas e do perfil, para a
                prévia mostrar como avatar e texto reagem às preferências. O nome é fictício,
                como o título e o campo de exemplo. */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
              <Avatar nome="Exemplo de Usuário" size="medium" />
              <View style={{ flex: 1 }}>
                <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>Título de exemplo</Text>
                <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>Legenda de exemplo</Text>
              </View>
            </View>
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>
              Este texto demonstra como ficará a leitura no aplicativo, incluindo o espaçamento entre letras e entre
              linhas escolhido acima.
            </Text>

            <Botao variant="primary" accessibilityLabel="Botão principal, exemplo" onPress={() => {}}>
              Botão principal
            </Botao>

            <CampoTexto rotulo="Campo de exemplo" placeholder="Digite aqui..." />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tema.spacing.sm }}>
              <Etiqueta variant="success">Mensagem de sucesso</Etiqueta>
              <Etiqueta variant="warning">Mensagem de atenção</Etiqueta>
            </View>
          </Cartao>
        </View>

        <Botao variant="outline" onPress={confirmarRestaurarPadroes} accessibilityLabel="Restaurar padrões de acessibilidade">
          Restaurar padrões
        </Botao>
      </ScrollView>
    </ContainerTela>
  );
}

function RotuloGrupo({ titulo, tema }: { titulo: string; tema: Tema }) {
  return (
    <Text accessibilityRole="header" style={[tema.typography.label, { color: tema.colors.primary.solid }]}>
      {titulo.toUpperCase()}
    </Text>
  );
}

/** Linha "rótulo + valor" só informativa: sem controle nenhum, de propósito (ver comentários de uso acima). */
function LinhaInformacao({ rotulo, value, tema }: { rotulo: string; value: string; tema: Tema }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]}>{rotulo}</Text>
      <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{value}</Text>
    </View>
  );
}
