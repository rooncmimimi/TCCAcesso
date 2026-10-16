# Cabeçalhos de segurança do Site (`Referrer-Policy` e CSP)

Definidos em `Site/Frontend/vercel.json`, valem para todas as páginas. Guardados por
`Site/Frontend/src/politicaDeSeguranca.test.ts`, que impede afrouxar a política sem querer.

## O que cada um faz

| Cabeçalho | Valor | Por quê |
| --- | --- | --- |
| `Referrer-Policy` | `no-referrer` | O navegador não manda o endereço da página a outros sites. O retorno do Google e os links de e-mail levam códigos na URL. |
| `Content-Security-Policy` | ver abaixo | Só carrega script, estilo, imagem, fonte e conexão das origens listadas. Um script injetado (XSS) não executa e não consegue mandar dados para um site qualquer. |

## A política

| Diretiva | Libera | Quem precisa |
| --- | --- | --- |
| `default-src` | `'self'` | o que não foi listado abaixo só vem do próprio Site |
| `script-src` | `'self'`, `vlibras.gov.br`, `cdn.jsdelivr.net/gh/spbgovbr-vlibras/` | o widget VLibras. O jsDelivr só no **caminho** do VLibras, nunca o CDN inteiro. Sem `unsafe-inline` nem `unsafe-eval` |
| `style-src` | `'self'`, `'unsafe-inline'`, Google Fonts, cdnfonts, VLibras | as bibliotecas de interface (Sonner, Radix) injetam `<style>` em tempo de execução |
| `font-src` | `'self'`, `data:`, `fonts.gstatic.com`, `fonts.cdnfonts.com`, VLibras | Manrope e Plus Jakarta Sans, a fonte para dislexia (OpenDyslexic) e as fontes do VLibras |
| `img-src` | `'self'`, `data:`, `blob:`, `*.supabase.co`, a API, VLibras | fotos e anexos (Supabase Storage), pré-visualização de uploads (`blob:`) |
| `media-src` | `'self'`, `blob:`, `*.supabase.co`, a API | vídeos dos anexos |
| `connect-src` | `'self'`, a API (`https` e `wss`), `*.supabase.co`, IBGE, `vlibras.gov.br` | chamadas à API, socket.io, anexos, lista de cidades |
| `frame-src` | `vlibras.gov.br` | o avatar do VLibras roda num `iframe` |
| `worker-src` | `'self'`, `blob:` | reserva para bibliotecas que abrem workers |
| `object-src` | `'none'` | sem plugins |
| `base-uri`, `form-action` | `'self'` | ninguém troca a base dos links nem manda formulário para fora |
| `frame-ancestors` | `'none'` | o Site não aparece dentro de quadro de outro site (clickjacking) |

## Como foi testado

1. Build de produção servido com os cabeçalhos do `vercel.json`, e o navegador real aberto nas páginas
   públicas (`/`, `/entrar`, `/sobre-nos`, `/termos`, `/privacidade`, `/cadastro/candidato`), com a fonte
   para dislexia ligada e o VLibras aberto até o avatar sinalizar. Primeiro em modo **somente relatório**
   (`Content-Security-Policy-Report-Only`), que mostra tudo que seria bloqueado sem bloquear: foi assim
   que se descobriu que o VLibras puxa script, imagem e fonte do jsDelivr e usa um `iframe`.
2. Depois em modo que bloqueia: nenhuma violação e o VLibras funcionando.
3. Sondas dentro da página: IBGE, WebSocket da API e imagem do Supabase passam; um `fetch` a um site
   qualquer, um WebSocket para fora, uma imagem de fora, um `<script>` inline e `eval` são bloqueados.

**Não testado em navegador:** as páginas que exigem login (feed, mensagens, vagas, perfil). O que
elas carregam foi levantado pelo código (`fetch`, `<video>`, `URL.createObjectURL`, imagens do
Supabase e da API) e coberto pela política, mas vale uma volta pelo Site logado depois do primeiro
deploy, com o console aberto.

## Quando mexer

- **Trocou o endereço da API** (`VITE_API_URL` na Vercel)? Troque também `connect-src`, `img-src` e
  `media-src`. Sem isso o navegador bloqueia todas as chamadas à API e o Site fica sem dados.
  O endereço de produção é `https://acesso-backend.onrender.com`.
- **O VLibras mudou de versão ou de CDN?** O console mostra `Refused to load…` com o endereço novo.
  Teste com `Content-Security-Policy-Report-Only` antes de liberar qualquer origem nova.
- **Nova integração externa** (analytics, mapa, vídeo)? Acrescente só a diretiva e a origem de que ela
  precisa, com o caminho mais estreito possível, e atualize o teste.
- Para diagnosticar um bloqueio em produção, troque o nome do cabeçalho para
  `Content-Security-Policy-Report-Only`: tudo volta a funcionar e o console lista o que seria barrado.
