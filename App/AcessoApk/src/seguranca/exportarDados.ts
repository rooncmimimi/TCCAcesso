import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { AccessibilityPreferences } from "../accessibility";
import type { AuthUser } from "../auth";
import { ConfiguracoesService } from "../configuracoes";
import { EmpresaService } from "../empresas";
import { PerfilService } from "../perfil";
import type { DadosExportados } from "./types";

/**
 * Fase 22 (LGPD/portabilidade de dados) — monta um retrato dos dados que o
 * ACESSO guarda sobre o usuário, usando SÓ endpoints "meus dados" que já
 * existem e o usuário já tem permissão de ler (nenhuma rota nova no
 * backend). Escopo desta fase, de propósito: conta + perfil (candidato OU
 * empresa) + preferências. NÃO inclui o histórico de publicações,
 * comentários, curtidas ou mensagens — são coleções sem limite que
 * exigiriam paginação em massa; registrado como uma exportação futura
 * separada, não fabricado aqui.
 */
export async function coletarMeusDados(
  usuario: AuthUser,
  preferenciasAcessibilidade: AccessibilityPreferences,
): Promise<DadosExportados> {
  const dados: DadosExportados = {
    geradoEm: new Date().toISOString(),
    conta: usuario,
    preferenciasAcessibilidade,
  };

  const tarefas: Promise<void>[] = [
    ConfiguracoesService.obterPreferenciasNotificacao().then((preferencias) => {
      dados.preferenciasNotificacao = preferencias;
    }),
  ];

  if (usuario.tipoUsuario === "candidato") {
    tarefas.push(
      PerfilService.meuCandidato().then((candidato) => {
        dados.candidato = candidato;
      }),
      PerfilService.listarExperiencias().then((experiencias) => {
        dados.experiencias = experiencias;
      }),
      PerfilService.listarFormacoes().then((formacoes) => {
        dados.formacoes = formacoes;
      }),
      PerfilService.listarCertificados().then((certificados) => {
        dados.certificados = certificados;
      }),
      PerfilService.listarHabilidades().then((habilidades) => {
        dados.habilidades = habilidades;
      }),
    );
  } else if (usuario.tipoUsuario === "empresa") {
    tarefas.push(
      EmpresaService.meuPerfil().then((empresa) => {
        dados.empresa = empresa;
      }),
    );
  }

  await Promise.all(tarefas);
  return dados;
}

/**
 * Escreve os dados coletados num arquivo JSON temporário (`Paths.cache`,
 * API nova de `expo-file-system` na SDK 57 — `FileSystem.writeAsStringAsync`
 * está descontinuada) e abre a folha de compartilhamento nativa, deixando o
 * PRÓPRIO usuário escolher onde salvar (Arquivos, e-mail, Drive etc.) —
 * nunca o app decide um destino sozinho.
 */
export async function exportarECompartilhar(dados: DadosExportados): Promise<void> {
  const disponivel = await Sharing.isAvailableAsync();
  if (!disponivel) {
    throw new Error("O compartilhamento de arquivos não está disponível neste aparelho.");
  }

  const nomeArquivo = `acesso-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
  const arquivo = new File(Paths.cache, nomeArquivo);
  arquivo.create({ overwrite: true, intermediates: true });
  arquivo.write(JSON.stringify(dados, null, 2));

  await Sharing.shareAsync(arquivo.uri, {
    mimeType: "application/json",
    dialogTitle: "Exportar meus dados do ACESSO",
  });
}
