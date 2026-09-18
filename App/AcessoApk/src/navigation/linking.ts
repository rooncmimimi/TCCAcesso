import type { LinkingOptions } from "@react-navigation/native";

import type { RaizStackParamList } from "./types";

/**
 * Deep links do app. `prefixes` usa só o esquema próprio (`acesso://`, definido em `app.json`), que
 * funciona em builds de desenvolvimento e produção; o prefixo do Expo Go (`Linking.createURL()`, do
 * `expo-linking`) ficou de fora para não adicionar uma dependência só para testes.
 *
 * Links para telas protegidas só resolvem com a sessão ativa, porque o React Navigation só associa
 * um link a telas montadas. Assim um link não fura a autenticação.
 */
export const linking: LinkingOptions<RaizStackParamList> = {
  prefixes: ["acesso://"],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: "entrar",
        },
        // ForgotPassword/ResetPassword de propósito não têm link próprio:
        // dependem de um código enviado por e-mail, não fazem sentido como
        // destino de deep link genérico.
      },
      App: {
        screens: {
          Tabs: {
            screens: {
              Home: "home",
              Notifications: "notificacoes",
              Messages: "mensagens",
              Jobs: "vagas",
              Profile: {
                screens: {
                  ProfileMenu: "perfil",
                },
                // Perfis de outras pessoas (`PublicProfile`) ainda não têm deep link; `ProfileMenu`
                // é só o menu da própria conta.
              },
            },
          },
          // `VagaDetail` fica na pilha principal, ao lado de `Tabs`, e não dentro da aba de vagas.
          VagaDetail: "vagas/:vagaId",
        },
      },
      // Splash/Unsupported não são destinos de link: são estados
      // derivados da sessão, não rotas que alguém deveria compartilhar.
    },
  },
};
