# Nota técnica: migrar a sessão para cookies

**Status: proposta. Nada disto foi implementado.** Esta fase só auditou o mecanismo atual, conforme
pedido. A autenticação continua exatamente como está.

## Como está hoje

| | Onde | Validade |
| --- | --- | --- |
| Access token (JWT) | Site: `localStorage` (`acesso:accessToken`) · App: `expo-secure-store` | `JWT_EXPIRES_IN`, padrão 30 min |
| Refresh token | Site: `localStorage` (`acesso:refreshToken`) · App: `expo-secure-store` | linha na tabela `sessoes`, ~30 dias |
| Envio | Cabeçalho `Authorization: Bearer`, montado em `services/api.ts` | — |
| Rotação | `POST /auth/refresh` rotaciona o refresh token (`SessaoService.rotacionar`) | — |
| Revogação | `sessoes` por dispositivo, com "encerrar outras sessões" | — |
| CORS | allowlist de origens (`FRONTEND_URL`), `withCredentials: true` já ligado no cliente | — |

O que isso implica, sem rodeio: **qualquer script que rode na página do Site consegue ler os dois
tokens**. É o risco clássico de XSS com `localStorage`. O App não tem esse problema — `SecureStore`
é armazenamento do sistema operacional, não do JavaScript.

Há um segundo ponto, introduzido nesta fase: o retorno do Google passa um "código de entrega" de 60
segundos pela URL (`/entrar/google?codigo=…`), porque sem cookie de sessão não existe outro canal
entre o redirecionamento do Google e o Site. Ele é de uso único, dura um minuto e sozinho não
autentica ninguém — mas fica no histórico do navegador. A migração para cookies elimina essa
passagem.

## O que mudaria

1. **Refresh token em cookie `HttpOnly`** — é o alvo principal: é ele que dura 30 dias. Fora do
   alcance do JavaScript, um XSS deixa de render sessão persistente.
2. **Access token continua em memória** (não em `localStorage`), recarregado via refresh a cada
   abertura de aba. Some do disco, e 30 minutos de exposição é bem menos que 30 dias.
3. **Atributos do cookie:**
   - `HttpOnly` sempre;
   - `Secure` em produção; em desenvolvimento (`http://localhost`) o navegador recusaria o cookie,
     então o atributo entra condicionado ao ambiente;
   - `SameSite`: `Lax` não serve, porque Site (Vercel) e API (Render) são domínios diferentes —
     seria `None; Secure`, ou um domínio próprio para a API (`api.seu-dominio`) que permitiria
     `Lax`. A segunda opção é melhor e **exige decisão de infraestrutura**, não só de código.
   - `Path=/api/auth/refresh`, para o cookie não viajar em toda requisição.
4. **CSRF** — com cookie, toda requisição do navegador passa a carregar credencial automaticamente,
   e aí CSRF deixa de ser teórico. Como só a rota de refresh receberia o cookie, o padrão
   *double-submit* (um token em cookie legível + o mesmo valor em cabeçalho) cobre o caso com pouco
   código. A allowlist de CORS ajuda, mas não substitui.
5. **Rotação e expiração** — o que já existe em `SessaoService.rotacionar` continua valendo; muda só
   onde o token é guardado.
6. **Logout** — passa a precisar limpar o cookie no servidor (`Set-Cookie` expirado) além de revogar
   a linha em `sessoes`.

## Compatibilidade

- **Vercel (Site)** — sem obstáculo; o cliente já manda `withCredentials: true`.
- **Render (API)** — precisa de `app.set("trust proxy", 1)` para `Secure` funcionar atrás do proxy, e
  o CORS precisa de `credentials: true` com origem explícita (não `*`).
- **Supabase** — indiferente: não participa da sessão da aplicação.
- **App (Expo)** — **não deve migrar.** React Native não tem cookie jar de navegador, e `SecureStore`
  já é mais seguro que cookie. O backend precisaria aceitar os dois modos: cookie para o navegador,
  `Authorization: Bearer` para o App. É o ponto de maior risco da migração, e o que mais justifica
  fazê-la em fases.

## Migração sem derrubar quem está logado

1. O backend passa a **aceitar os dois**: refresh por cookie ou por corpo da requisição.
2. O Site passa a enviar por cookie; quem tinha token em `localStorage` renova uma vez pelo caminho
   antigo e recebe o cookie — sem precisar entrar de novo.
3. Depois de uma janela maior que a validade do refresh (~30 dias), o caminho antigo sai para
   requisições vindas de navegador. O App continua no `Bearer`.

Fazer os três passos de uma vez desconecta todo mundo. Fazer em três fases não desconecta ninguém.

## Fora de escopo

Banner de consentimento de cookies **não** entra junto. Cookie estritamente necessário para
autenticação não exige consentimento prévio na LGPD nem no GDPR; banner é assunto de cookie de
análise e marketing, que o ACESSO não usa hoje. Misturar as duas coisas criaria um aviso que não
protege ninguém e atrapalha quem usa leitor de tela.
