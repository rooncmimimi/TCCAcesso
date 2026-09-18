import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useAutenticacao } from "../autenticacao";
import { Avatar, Botao, Cartao, Divisor, ContainerTela } from "../components/ui";
import type { PerfilStackParamList } from "../navigation/types";
import { useTema } from "../tema";

/**
 * Só as telas do menu que não recebem parâmetros; `JobForm` e `JobApplicants` precisam de `vagaId`
 * e são abertas a partir de `MyJobs`.
 */
type TelaDoMenu = "MyProfile" | "Activities" | "Discover" | "Search" | "Settings" | "Accessibility" | "Help" | "MyJobs";

type ItemMenu = { label: string; hint: string; screen: TelaDoMenu };

const ITENS_MENU_BASE: ItemMenu[] = [
  { label: "Meu perfil", hint: "Ver e editar seu perfil", screen: "MyProfile" },
  { label: "Atividades", hint: "Ver seu histórico de atividades", screen: "Activities" },
  { label: "Descobrir", hint: "Encontrar pessoas e empresas no ACESSO", screen: "Discover" },
  { label: "Buscar", hint: "Pesquisar pessoas, empresas, vagas e publicações", screen: "Search" },
  { label: "Configurações", hint: "Ajustar as configurações da sua conta", screen: "Settings" },
  { label: "Acessibilidade", hint: "Ajustar preferências de acessibilidade do aplicativo", screen: "Accessibility" },
  { label: "Ajuda", hint: "Ver perguntas frequentes e suporte", screen: "Help" },
];

/** "Minhas Vagas" só aparece para empresa; o backend também recusa (403) um candidato que tente a rota direto. */
const ITEM_MINHAS_VAGAS: ItemMenu = { label: "Minhas Vagas", hint: "Gerenciar as vagas publicadas pela sua empresa", screen: "MyJobs" };

/**
 * Tela inicial da aba Perfil: um menu, e não o perfil em si, que é o item "Meu perfil". "Sair" usa
 * o `sair` do `AutenticacaoProvider`.
 */
export function MenuPerfilScreen() {
  const { tema } = useTema();
  const { usuario, sair } = useAutenticacao();
  const navigation = useNavigation<NativeStackNavigationProp<PerfilStackParamList>>();

  const itensMenu =
    usuario?.tipoUsuario === "empresa"
      ? [ITENS_MENU_BASE[0], ITEM_MINHAS_VAGAS, ...ITENS_MENU_BASE.slice(1)]
      : ITENS_MENU_BASE;

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.lg, paddingVertical: tema.spacing.lg }}>
        <Cartao elevacao="md" style={{ flexDirection: "row", gap: tema.spacing.md, alignItems: "center" }}>
          {/* Mesmo `Avatar` do resto do app: mostra o logo em conta de empresa e as iniciais
              nas demais. */}
          <Avatar nome={usuario?.nome} fotoUrl={usuario?.tipoUsuario === "empresa" ? usuario.empresa?.logo : undefined} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>
              {usuario?.nome ?? "Seu perfil"}
            </Text>
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>{usuario?.email}</Text>
          </View>
        </Cartao>

        <Cartao style={{ padding: 0, overflow: "hidden" }}>
          {itensMenu.map((item, indice) => (
            <View key={item.screen}>
              <Pressable
                onPress={() => navigation.navigate(item.screen)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityHint={item.hint}
                android_ripple={{ color: tema.colors.divider }}
                style={{
                  minHeight: tema.sizes.touchTarget,
                  justifyContent: "center",
                  paddingHorizontal: tema.spacing.md,
                }}
              >
                <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]}>{item.label}</Text>
              </Pressable>
              {indice < itensMenu.length - 1 ? <Divisor /> : null}
            </View>
          ))}
        </Cartao>

        <Botao variant="destructive" onPress={() => void sair()} accessibilityLabel="Sair da conta">
          Sair
        </Botao>
      </ScrollView>
    </ContainerTela>
  );
}
