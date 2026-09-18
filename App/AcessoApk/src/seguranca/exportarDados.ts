import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { PreferenciasAcessibilidade } from "../acessibilidade";
import type { UsuarioAutenticado } from "../autenticacao";
import { ConfiguracoesService } from "../configuracoes";
import { EmpresaService } from "../empresas";
import { PerfilService } from "../perfil";
import type { DadosExportados } from "./types";

/**
 * Monta um retrato dos dados que o ACESSO guarda sobre o usuário (portabilidade prevista na LGPD),
 * usando só rotas de "meus dados" que já existem. Inclui conta, perfil de candidato ou de empresa e
 * preferências. Publicações, comentários, curtidas e mensagens ficam de fora: são coleções sem
 * limite que exigiriam paginar tudo.
 */
export async function coletarMeusDados(
  usuario: UsuarioAutenticado,
  preferenciasAcessibilidade: PreferenciasAcessibilidade,
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
 * Grava os dados num JSON temporário (`Paths.cache`, da API nova do `expo-file-system`) e abre o
 * compartilhamento nativo, para a própria pessoa escolher onde salvar.
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
