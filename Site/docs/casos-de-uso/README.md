# Casos de uso do Site ACESSO

Este documento descreve, em texto, **tudo o que cada tipo de usuário consegue fazer no Site** da plataforma ACESSO (inclusão profissional de pessoas com deficiência e profissionais 50+). Ele foi escrito a partir do código da branch `claude/zealous-pasteur-2cu3a1` e descreve o comportamento **atual**, inclusive limitações conhecidas. O aplicativo Android (`App/AcessoApk`) é um projeto separado e não está incluído.

## Atores

| Ator | Quem é | Seção |
| --- | --- | --- |
| Visitante | Quem ainda não entrou: vê as páginas públicas, cria conta ou faz login | [01-visitante.md](01-visitante.md) |
| Conta autenticada (qualquer tipo) | Funções que candidato, empresa e administrador usam: feed, mensagens, notificações, seguir, denunciar, bloquear, configurações, acessibilidade | [02-funcoes-comuns.md](02-funcoes-comuns.md) |
| Candidato | Pessoa que busca emprego: perfil, currículo, vagas, candidaturas | [03-candidato.md](03-candidato.md) |
| Empresa | Conta institucional criada a partir de uma conta de candidato; precisa ser aprovada para publicar vagas | [04-empresa.md](04-empresa.md) |
| Administrador | Equipe de moderação: usuários, empresas, denúncias, conteúdo e auditoria | [05-administrador.md](05-administrador.md) |

## Como ler

- Cada caso de uso tem o identificador `UC-<letra><número>` (V = visitante, G = funções comuns, C = candidato, E = empresa, A = administrador) e traz: ator, descrição, pré-condições, fluxo principal, fluxos alternativos e exceções, pós-condições, regras de negócio e as telas e endpoints envolvidos.
- Para não repetir, as funções comuns são descritas uma vez na seção 02; as demais seções citam o caso (por exemplo, "ver UC-G22") e descrevem só o que é específico do ator.
- "Tela" é a rota do Site; "API" é o endpoint do servidor, sempre sob o prefixo `/api`.
- Quando o sistema não faz o que o rótulo da tela sugere, o caso registra isso como limitação atual.

## Quantidade de casos de uso


| Seção | Casos |
| --- | --- |
| Visitante (não autenticado) | 37 |
| Funções comuns a contas autenticadas | 46 |
| Candidato | 27 |
| Empresa | 31 |
| Administrador | 39 |
| **Total** | **180** |

## Matriz resumida: quem faz o quê

| Área | Visitante | Candidato | Empresa | Administrador |
| --- | --- | --- | --- | --- |
| Ver páginas públicas, vagas e termos | sim | sim | sim | sim |
| Criar conta, entrar, recuperar senha | sim | – | – | – |
| Cadastrar a própria empresa | – | sim (cria uma segunda conta) | – | – |
| Perfil, currículo, deficiências, experiências | – | sim | – | – |
| Candidatar-se, favoritar vagas | – | sim | – | – |
| Publicar e gerir vagas e candidaturas | – | – | sim (aprovada) | – |
| Feed, mensagens, notificações, seguir, denunciar, bloquear | – | sim | sim (aprovada, em parte) | sim |
| Configurações e preferências de acessibilidade | só local | sim | sim | sim |
| Aprovar empresas, moderar denúncias e conteúdo, auditoria | – | – | – | sim |

A matriz é um guia; as regras exatas (por exemplo, o que a empresa não aprovada não consegue fazer) estão nos casos.
