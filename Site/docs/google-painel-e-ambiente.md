# Login com Google: painéis e ambiente (etapa 8)

O que fica **fora do código** — Google Cloud Console, Render, Vercel — e como conferir cada coisa.
Os painéis são seus: nada aqui foi alterado por quem escreveu este roteiro. Os nomes de menu abaixo
podem variar com a versão do console do Google; confirme na tela.

## 1. O que já foi conferido (16/10/2026, sem entrar com ninguém)

| O quê | Resultado | Como foi visto |
| --- | --- | --- |
| Endereço de retorno de **produção** (`https://acesso-backend.onrender.com/api/auth/google/callback`) | Cadastrado no Google | A tela de autorização levou ao login; um endereço inventado levou à página de erro |
| Endereço de retorno de **desenvolvimento** (`http://localhost:3000/api/auth/google/callback`) | Cadastrado no Google | Idem |
| ID e segredo que estão no `.env` local | **O Google os aceita hoje** | `npm run google:verificar` (troca um código inventado: o Google respondeu `invalid_grant`, não `invalid_client`) |
| As três variáveis em produção | Preenchidas | A API respondeu `disponivel: true` |
| `FRONTEND_URL` em produção | **Lista `http://localhost:5173`** | A API de produção devolveu `Access-Control-Allow-Origin: http://localhost:5173` |
| Origens JavaScript autorizadas | Não são usadas | O ACESSO troca o código no servidor; elas só importam para o botão do Google que roda no navegador |
| Nome do app na tela do Google | Aparece o **domínio** (`acesso-backend.onrender.com`), não "ACESSO" | Texto "Prosseguir para…" da tela de login |

O que **não** dá para ver de fora: o status da tela de consentimento, a lista de usuários de teste, quantos
segredos estão ativos e se o segredo antigo já foi desativado. Isso é com o painel.

## 2. Trocar o segredo do cliente (achado 9)

O segredo antigo foi colado numa conversa. Sozinho ele não autentica ninguém, mas quem o tem pode se passar
pelo servidor junto ao Google. A ordem abaixo evita ficar sem login em algum momento: **o antigo só é
desativado no fim**, então dá para voltar atrás até lá.

1. **Google Cloud Console** → o cliente OAuth do tipo "Aplicativo da Web" do ACESSO (ID começando por
   `123082460646-telhp6…`) → seção de segredos → **adicionar um segredo novo**. O console permite dois ao mesmo
   tempo; confira na tela. Copie o valor na hora: depois ele pode não ser mostrado de novo. **Não cole o segredo
   em conversa nem em arquivo do repositório.**
2. **Confira o novo antes de usá-lo**, no seu computador, na pasta `Site/Backend`:

   ```powershell
   $env:GOOGLE_CLIENT_SECRET = "cole-o-segredo-novo-aqui"
   npm run google:verificar
   ```

   Tem de aparecer `[ok] O Google aceita o ID e o segredo do cliente`. Se aparecer `[FALHA] … invalid_client`, o
   valor copiado está errado. (O comando vale só para aquela janela do PowerShell; o histórico dele guarda a linha
   digitada, então feche a janela depois.)
3. **Render** → serviço `acesso-backend` → Environment → `GOOGLE_CLIENT_SECRET` = o valor novo → salvar. O Render
   publica de novo sozinho.
4. Espere o deploy terminar e **entre uma vez com o Google em produção** (conta de candidato; se não houver
   conta, o cadastro pelo Google também serve de teste).
5. Só então, no Google Cloud Console, **desative o segredo antigo**. Se algo quebrar, reative-o e ponha o valor
   antigo de volta no Render. Depois de alguns dias sem problema, exclua-o.
6. Atualize o `.env` local do Backend com o segredo novo; o antigo deixa de funcionar quando for desativado.

Quem já está logado no ACESSO não é afetado: as sessões do site não dependem do segredo do Google.

## 3. Endereços de retorno e origens

- **Já estão certos** (tabela acima). Se um dia o endereço da API mudar, cadastre o novo em "URIs de
  redirecionamento autorizados" **antes** de trocar `GOOGLE_REDIRECT_URI` no Render, idêntico, caractere a
  caractere, e rode `npm run google:verificar` com o valor novo.
- "Origens JavaScript autorizadas" podem ficar vazias.

## 4. Tela de consentimento (Branding e Público-alvo / "Audience")

- **Status.** Em "Público-alvo" veja se está **Em produção** (qualquer conta Google pode entrar) ou **Em teste**
  (só os "usuários de teste" listados entram, até 100). Se o ACESSO é para o público, tem de estar em produção.
  Os escopos usados (`openid`, `email`, `profile`) são os básicos; pelo que o Google documenta, eles não
  exigem verificação para publicar, mas confirme na tela.
- **Nome do app.** A tela de login do Google mostra hoje "Prosseguir para `acesso-backend.onrender.com`", e não
  "ACESSO". Em "Branding", preencha o nome do app (ACESSO), o e-mail de suporte e, se quiser, o logotipo. O domínio
  `onrender.com` é da hospedagem e não pode ser verificado como seu; um domínio próprio para a API resolveria
  isso, mas é decisão de infraestrutura.

## 5. `FRONTEND_URL` em produção lista localhost

A API de produção aceita chamadas vindas de `http://localhost:5173`. O código foi escrito assim de propósito
(`config/env.js` aceita uma lista de origens "localhost em desenvolvimento junto da URL de produção"), e serve para
desenvolver o Site contra a API publicada. O custo é que a API aceita chamadas de qualquer página servida em
`localhost`.

- **Se você só desenvolve contra o Backend local**, remova `http://localhost:5173` de `FRONTEND_URL` no Render,
  deixando só `https://acessoinclusivo.vercel.app`.
- **Se desenvolve contra a API publicada**, deixe como está. O Backend avisa no log de inicialização
  (`[ENV] Produção com … origem(ns) local(is)`) para lembrar.

## 6. `render.yaml`

Agora declara `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` (`sync: false`, sem valor). Um
teste (`avisosDeAmbiente.test.js`) garante que elas continuam lá e que nenhuma variável com cara de segredo tem
valor escrito no arquivo. O serviço atual não é recriado por isso; é só para que um serviço novo nasça completo.

## 7. Conferir a qualquer momento

```powershell
cd Site/Backend
npm run google:verificar
```

Diz, sem entrar com ninguém e sem alterar nada: se as três variáveis estão preenchidas, se o Google aceita o
endereço de retorno e se aceita o ID e o segredo. Para conferir os valores de produção, defina-os só naquela
janela (`$env:GOOGLE_REDIRECT_URI = "https://acesso-backend.onrender.com/api/auth/google/callback"`).

**O que ele não prova:** a volta completa (troca do código real, `callback`, `concluir`, sessão). Isso só se vê
entrando de verdade com uma conta Google.

Na inicialização, o `env.js` também avisa no log (sem imprimir valores) se faltar uma ou duas das três variáveis,
se o endereço de retorno não terminar em `/auth/google/callback` e, em produção, se ele apontar para `localhost`.
