# Voz própria no navegador: decisão

Pendência: "Destaque por palavra em voz de rede e em celular; decidir se vale embutir um motor de voz
próprio (software livre)". Este documento registra o que foi feito, o que foi medido, o que foi
verificado nas fontes e a recomendação. **Nada foi instalado nem embutido.**

## 1. O problema, em uma frase

O navegador diz **quando uma frase começa e termina**, mas muitas vozes (as de rede, como as "Google" do
Chrome, e várias do Android) **não dizem em que palavra estão** (não emitem o evento `boundary`). Sem isso, o
destaque palavra por palavra exato não existe com essas vozes.

## 2. O que já foi resolvido sem motor próprio

| Situação | Como o ACESSO se comporta hoje |
|---|---|
| Voz que informa as palavras (as locais do computador, as do macOS e iOS) | Destaque exato, palavra por palavra. Medido em 05/11/2026 no navegador do app (Windows, vozes locais Microsoft): **16 de 16 palavras informadas**, a primeira em 150 ms. |
| Voz que não informa | **Destaque aproximado** (novo): a frase fica destacada e, dentro dela, a palavra é **estimada pelo tempo** (`lib/leituraEstimada.ts`). O ritmo da voz é medido a cada frase terminada e guardado na sessão, então a estimativa melhora ao longo da leitura e com a velocidade escolhida. A tela diz "destaque aproximado". Pode ser desligada em Configurações (volta a destacar só a frase). |
| Navegador sem a CSS Custom Highlight API | Marca o bloco inteiro (como antes). |

Limites honestos da estimativa: pode adiantar ou atrasar **uma ou duas palavras**, principalmente na primeira
frase de uma voz nova, em frases longas sem pontuação, com números e siglas (a voz as fala por extenso) e
quando o aparelho "engasga". Foi testada com relógio simulado (pausa congela, continuar solta, velocidade,
prefixo, calibração) e **não** foi comparada, palavra a palavra, com uma voz de rede de verdade: isso depende
da rodada de testes em aparelhos reais (seção 5).

## 3. Opções de motor próprio (o que foi verificado nas fontes, em 05/11/2026)

| Opção | O que se sabe | Problema |
|---|---|---|
| **Piper** (síntese neural local) rodando no navegador por WebAssembly | Existem vozes em português do Brasil (`cadu`, `edresson`, `faber`, `jeff`). A voz `faber` (qualidade média, 22,05 kHz) tem o modelo de **63,2 MB** e o conjunto de dados sob **CC0**. O repositório de vozes está sob MIT. | O Piper atual é **GPL-3.0** e **embute o espeak-ng** (a própria página diz "embeds espeak-ng for phonemization"). Pôr isso no site significa **distribuir código GPL-3** ao navegador de cada pessoa: o conjunto precisa ser oferecido sob GPL-3, com o código-fonte. Não achei uma versão confirmada e mantida do Piper para navegador; seria um trabalho de portar e manter. As vozes do repositório têm **licenças diferentes entre si** (a de `faber` é CC0; as outras precisam ser conferidas uma a uma). |
| **eSpeak NG** (sintetizador por regras) | Software livre, **GPL-3.0 ou posterior**, mais de 100 idiomas. Não confirmei o suporte e a qualidade do português do Brasil. | Voz **robótica**, difícil de ouvir por muito tempo. Mesma obrigação da GPL-3. |
| **sherpa-onnx** (execução de modelos de voz, inclusive no navegador) | Licença **Apache-2.0**. Tem demonstrações de síntese de voz por WebAssembly. | As demonstrações listadas são em inglês, alemão e chinês: **não confirmei nenhum modelo em português do Brasil** pronto. Cada modelo traz a própria licença. |
| **Voz no servidor** (o servidor sintetiza e devolve o áudio) | Daria o mesmo resultado em qualquer aparelho. | Cada leitura **envia o texto da vaga ou da página ao servidor**, gasta processamento do plano gratuito do Render, depende de internet e muda o que a política de privacidade promete. Fora do combinado (custo zero, nada de serviço novo). |

Não foi verificado: o **tamanho do tempo de execução** (WebAssembly) que acompanharia o modelo; se algum desses
motores entrega **o tempo de cada palavra** (alinhamento) ou só o áudio (sem isso, o destaque exato continuaria
sendo uma estimativa); o consumo de CPU e bateria em celulares simples.

## 4. Recomendação

**Não embutir um motor de voz próprio agora.** Motivos, em ordem de peso:

1. **O ganho é pequeno diante do custo.** O destaque exato já existe onde a voz informa as palavras, e onde não
   informa há o destaque aproximado. O motor próprio só trocaria "aproximado" por "exato" (e isso nem é
   garantido, ver o item não verificado do alinhamento).
2. **Licença.** O caminho mais promissor em qualidade (Piper) é GPL-3.0 e traz o espeak-ng (GPL-3.0 ou posterior).
   Isso obriga o site inteiro a ser distribuído com o código sob a mesma licença, uma decisão jurídica e de
   projeto que não é minha.
3. **Peso e desempenho.** Dezenas de megabytes por voz mais o tempo de execução, baixados no celular de quem já
   tem pouca banda ou aparelho simples, para um recurso opcional.
4. **Qualidade e consistência.** Uma voz neural de 22 kHz ou uma voz por regras soa diferente da voz que a
   pessoa já escolheu e configurou no próprio aparelho (velocidade, timbre, leitor de tela).
5. **Falta medir.** Ninguém ainda mediu, em aparelhos reais, **quantos** usuários caem no destaque aproximado
   e **se ele basta**. Essa medição é barata (a página de diagnóstico) e deve vir antes de qualquer motor.

**Quando reavaliar** (se TODAS as condições valerem depois da rodada de testes da seção 5):
- pelo menos 3 aparelhos reais usados por quem importa para o projeto (incluindo um Android e um iPhone ou Mac)
  mostram **nenhuma palavra informada** com a voz padrão do aparelho; **e**
- quem testou marca o destaque aproximado como "às vezes errada" ou "errada" na maioria dos textos; **e**
- há decisão do projeto sobre a licença GPL-3.0 (ou um modelo e um motor com licença permissiva e português do Brasil confirmado).

Se for reavaliar, o primeiro passo é um **protótipo isolado** (uma página de teste, sem entrar no site) com um
modelo de uma voz em português, medindo tamanho de download, tempo até a primeira fala, consumo e se há
alinhamento por palavra.

## 5. O que falta, e só pode ser feito com aparelhos reais

A página **Diagnóstico de voz** (`/diagnostico-de-voz`, link em Configurações → Leitura, foco e cores) mede
em cada aparelho: vozes locais e de rede, quantas palavras a voz informa, se `pause()` pausa ou cancela, e
registra o que a pessoa viu na leitura de verdade. Ela gera um relatório para copiar. O roteiro e a tabela de
aparelhos estão em [acessibilidade-avancada-verificacoes.md](acessibilidade-avancada-verificacoes.md).
