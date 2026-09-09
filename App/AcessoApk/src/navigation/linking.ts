import type { LinkingOptions } from "@react-navigation/native";

import type { RootStackParamList } from "./types";

/**
 * Preparação de Deep Linking (Fase 4, item 26) — a arquitetura de rotas já
 * existe e resolve os links abaixo; nenhum destino que dependa de uma tela
 * que ainda não existe foi inventado.
 *
 * `prefixes` usa só o esquema customizado (`app.json` → `"scheme": "acesso"`),
 * que funciona em builds standalone/dev client. Não incluí o prefixo
 * dinâmico do Expo Go (`Linking.createURL()`, do pacote `expo-linking`) para
 * não instalar uma dependência nova só por conveniência de teste — se algum
 * dia isso for necessário, é só somar um item a este array, sem mudar mais
 * nada da configuração.
 *
 * Um link para uma rota protegida (ex.: `acesso://mensagens`) só resolve de
 * fato depois que o usuário estiver autenticado — o React Navigation só
 * associa um link a uma tela que esteja MONTADA no momento, e enquanto
 * `status !== "authenticated"` a árvore do `App Stack` nem existe. Isso é
 * intencional (o link não deveria "furar" a autenticação) e não uma
 * limitação a corrigir agora.
 */
export const linking: LinkingOptions<RootStackParamList> = {
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
                // `acesso://perfil/123` (perfil de OUTRO usuário) e
                // `acesso://vagas/123` (detalhe de uma vaga) ainda não têm
                // tela — MyProfile só mostra o perfil do próprio usuário
                // logado, e o detalhe de vaga é da Fase 7 (item 16).
                // PENDÊNCIA PARA FASE FUTURA: mapear esses dois assim que as
                // telas de destino existirem.
              },
            },
          },
        },
      },
      // Splash/Unsupported não são destinos de link — são estados
      // derivados da sessão, não rotas que alguém deveria compartilhar.
    },
  },
};
