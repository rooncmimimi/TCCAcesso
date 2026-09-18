import { useEffect, useState } from "react";
import { ScrollView } from "react-native";

import { useAutenticacao } from "../autenticacao";
import { EstadoErro, EstadoCarregamento, ContainerTela } from "../components/ui";
import { SecaoCurriculo } from "./meuPerfil/SecaoCurriculo";
import { PerfilEmpresaScreen } from "./PerfilEmpresaScreen";
import type { Candidato, Certificado, Deficiencia, Experiencia, Formacao, Habilidade } from "../perfil";
import { PerfilService } from "../perfil";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import { CabecalhoPerfil } from "./meuPerfil/CabecalhoPerfil";
import { SecaoDadosPessoais } from "./meuPerfil/SecaoDadosPessoais";
import { SecaoExperiencias } from "./meuPerfil/SecaoExperiencias";
import { SecaoFormacoes } from "./meuPerfil/SecaoFormacoes";
import { SecaoCertificados } from "./meuPerfil/SecaoCertificados";
import { SecaoHabilidades } from "./meuPerfil/SecaoHabilidades";
import { SecaoDeficiencias } from "./meuPerfil/SecaoDeficiencias";

/**
 * "Meu perfil" usa uma única rota (`MyProfile`) para os dois tipos de conta: empresa vê o
 * `PerfilEmpresaScreen`, e candidato, o perfil abaixo.
 */
export function MeuPerfilScreen() {
  const { usuario } = useAutenticacao();
  if (usuario?.tipoUsuario === "empresa") return <PerfilEmpresaScreen />;
  return <PerfilCandidato />;
}

/**
 * Perfil do candidato numa única tela com seções (dados pessoais, currículo, experiências,
 * formações, certificados, habilidades e deficiências), sem rotas próprias, porque tudo pertence à
 * conta logada. A foto de perfil não é editada no app.
 */
function PerfilCandidato() {
  const { tema } = useTema();

  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [experiencias, setExperiencias] = useState<Experiencia[]>([]);
  const [formacoes, setFormacoes] = useState<Formacao[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [habilidades, setHabilidades] = useState<Habilidade[]>([]);
  const [catalogoDeficiencias, setCatalogoDeficiencias] = useState<Deficiencia[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  // As buscas rodam juntas (`Promise.all`): é um perfil só, então há um único estado de
  // carregamento e de erro. A função fica dentro do efeito para evitar o aviso
  // `react-hooks/set-state-in-effect`.
  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const [candidatoRes, experienciasRes, formacoesRes, certificadosRes, habilidadesRes, deficienciasRes] =
          await Promise.all([
            PerfilService.meuCandidato(),
            PerfilService.listarExperiencias(),
            PerfilService.listarFormacoes(),
            PerfilService.listarCertificados(),
            PerfilService.listarHabilidades(),
            PerfilService.listarDeficiencias(),
          ]);
        if (cancelado) return;
        setCandidato(candidatoRes);
        setExperiencias(experienciasRes);
        setFormacoes(formacoesRes);
        setCertificados(certificadosRes);
        setHabilidades(habilidadesRes);
        setCatalogoDeficiencias(deficienciasRes);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar seu perfil."));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [tentativa]);

  function tentarNovamente() {
    setErro(null);
    setCarregando(true);
    setTentativa((valor) => valor + 1);
  }

  if (carregando) {
    return <EstadoCarregamento />;
  }

  if (erro && !candidato) {
    return <EstadoErro titulo="Não foi possível carregar seu perfil" mensagem={erro} onTentarNovamente={tentarNovamente} />;
  }

  if (!candidato) return null;

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.xl, paddingVertical: tema.spacing.lg }}>
        <CabecalhoPerfil candidato={candidato} tema={tema} />

        <SecaoDadosPessoais candidato={candidato} tema={tema} onAtualizado={setCandidato} />

        <SecaoCurriculo candidato={candidato} onAtualizado={setCandidato} />

        <SecaoExperiencias tema={tema} itens={experiencias} onAtualizarLista={setExperiencias} />
        <SecaoFormacoes tema={tema} itens={formacoes} onAtualizarLista={setFormacoes} />
        <SecaoCertificados tema={tema} itens={certificados} onAtualizarLista={setCertificados} />
        <SecaoHabilidades tema={tema} itens={habilidades} onAtualizarLista={setHabilidades} />

        <SecaoDeficiencias
          tema={tema}
          candidato={candidato}
          catalogo={catalogoDeficiencias}
          onAtualizado={setCandidato}
        />
      </ScrollView>
    </ContainerTela>
  );
}
