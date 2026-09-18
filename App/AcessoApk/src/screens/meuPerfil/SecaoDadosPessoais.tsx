import { useState } from "react";
import { Text, View } from "react-native";

import { useAutenticacao } from "../../autenticacao";
import { Botao, Cartao, CampoTexto, CabecalhoSecao, ErroAcao } from "../../components/ui";
import type { Candidato } from "../../perfil";
import { PerfilService } from "../../perfil";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";

/**
 * Dados pessoais, que vêm de `Usuario` (nome e telefone) e de `Candidato` (o restante). Ao salvar,
 * sempre envia os dois `PUT` sem comparar o que mudou: o backend grava os campos enviados e o
 * formulário já parte dos valores atuais.
 */
export function SecaoDadosPessoais({
  candidato,
  tema,
  onAtualizado,
}: {
  candidato: Candidato;
  tema: Tema;
  onAtualizado: (candidato: Candidato) => void;
}) {
  const usuario = candidato.usuario;
  const { atualizarUsuario } = useAutenticacao();
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");
  const [tituloProfissional, setTituloProfissional] = useState(candidato.tituloProfissional ?? "");
  const [biografia, setBiografia] = useState(candidato.biografia ?? "");
  const [cidade, setCidade] = useState(candidato.cidade ?? "");
  const [estado, setEstado] = useState(candidato.estado ?? "");
  const [endereco, setEndereco] = useState(candidato.endereco ?? "");
  const [cep, setCep] = useState(candidato.cep ?? "");
  const [escolaridade, setEscolaridade] = useState(candidato.escolaridade ?? "");
  const [linkedin, setLinkedin] = useState(candidato.linkedin ?? "");
  const [github, setGithub] = useState(candidato.github ?? "");
  const [disponibilidade, setDisponibilidade] = useState(candidato.disponibilidade ?? "");
  const [pretensaoSalarial, setPretensaoSalarial] = useState(
    candidato.pretensaoSalarial !== null && candidato.pretensaoSalarial !== undefined
      ? String(candidato.pretensaoSalarial)
      : "",
  );
  const [cpf, setCpf] = useState(candidato.cpf ?? "");
  const [dataNascimento, setDataNascimento] = useState(candidato.dataNascimento ?? "");
  const [genero, setGenero] = useState(candidato.genero ?? "");
  const [necessidadesAcessibilidade, setNecessidadesAcessibilidade] = useState(
    candidato.necessidadesAcessibilidade ?? "",
  );

  function cancelar() {
    setEditando(false);
    setErro(null);
    // Volta os campos para os valores atuais do candidato: descarta qualquer edição não salva.
    setNome(usuario?.nome ?? "");
    setTelefone(usuario?.telefone ?? "");
    setTituloProfissional(candidato.tituloProfissional ?? "");
    setBiografia(candidato.biografia ?? "");
    setCidade(candidato.cidade ?? "");
    setEstado(candidato.estado ?? "");
    setEndereco(candidato.endereco ?? "");
    setCep(candidato.cep ?? "");
    setEscolaridade(candidato.escolaridade ?? "");
    setLinkedin(candidato.linkedin ?? "");
    setGithub(candidato.github ?? "");
    setDisponibilidade(candidato.disponibilidade ?? "");
    setPretensaoSalarial(
      candidato.pretensaoSalarial !== null && candidato.pretensaoSalarial !== undefined
        ? String(candidato.pretensaoSalarial)
        : "",
    );
    setCpf(candidato.cpf ?? "");
    setDataNascimento(candidato.dataNascimento ?? "");
    setGenero(candidato.genero ?? "");
    setNecessidadesAcessibilidade(candidato.necessidadesAcessibilidade ?? "");
  }

  async function salvar() {
    if (salvando || !usuario) return;
    if (!nome.trim()) {
      setErro("O nome não pode ficar vazio.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const usuarioAtualizado = await PerfilService.atualizarUsuario(usuario.id, {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
      });
      const candidatoAtualizado = await PerfilService.atualizarDadosPessoais(candidato.id, {
        tituloProfissional: tituloProfissional.trim() || null,
        biografia: biografia.trim() || null,
        cidade: cidade.trim() || null,
        // O backend não normaliza a UF em `PUT /candidatos/:id`; sem isto, "sp" seria gravado em
        // minúsculas, diferente do resto do app.
        estado: estado.trim() ? estado.trim().toUpperCase() : null,
        endereco: endereco.trim() || null,
        cep: cep.trim() || null,
        escolaridade: escolaridade.trim() || null,
        linkedin: linkedin.trim() || null,
        github: github.trim() || null,
        disponibilidade: disponibilidade.trim() || null,
        pretensaoSalarial: pretensaoSalarial.trim() || null,
        cpf: cpf.trim() || null,
        dataNascimento: dataNascimento.trim() || null,
        genero: genero.trim() || null,
        necessidadesAcessibilidade: necessidadesAcessibilidade.trim() || null,
      });
      // O `usuario` embutido em `candidatoAtualizado` (resposta de `PUT /candidatos/:id`) é o valor
      // de antes da troca de nome/telefone; as duas chamadas são independentes. Mescla o `usuario`
      // de verdade (da primeira chamada) por cima, para a tela nunca mostrar um nome desatualizado
      // depois de salvar.
      onAtualizado({ ...candidatoAtualizado, usuario: usuarioAtualizado });
      setEditando(false);
      // Atualiza o usuário do contexto para o feed e o menu do Perfil mostrarem o nome novo. Se
      // falhar, só o resto do app fica desatualizado até o próximo login; esta tela já está certa.
      void atualizarUsuario();
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível salvar seus dados agora."));
    } finally {
      setSalvando(false);
    }
  }

  if (!editando) {
    return (
      <View style={{ gap: tema.spacing.sm }}>
        <CabecalhoSecao titulo="Dados pessoais" icone="call-outline" />
        <Cartao elevacao="sm" style={{ gap: tema.spacing.xs }}>
          {/* Nome, cargo, localização e biografia já aparecem no cabeçalho
              visual do perfil (`CabecalhoPerfil`, logo acima): repeti-los aqui
              duplicaria a mesma informação duas vezes na mesma tela. Este
              card foca no que o cabeçalho não mostra: contato e o campo
              livre de acessibilidade. */}
          <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>{usuario?.email}</Text>
          {telefone ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>{telefone}</Text>
          ) : null}
          {necessidadesAcessibilidade ? (
            <View style={{ gap: 2 }}>
              <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>
                Necessidades de acessibilidade
              </Text>
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
                {necessidadesAcessibilidade}
              </Text>
            </View>
          ) : null}
          <Botao variant="outline" size="small" onPress={() => setEditando(true)}>
            Editar dados pessoais
          </Botao>
        </Cartao>
      </View>
    );
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Editar dados pessoais" icone="call-outline" />
      <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
        <CampoTexto rotulo="Nome" value={nome} onChangeText={setNome} editable={!salvando} />
        <CampoTexto rotulo="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" editable={!salvando} />
        <CampoTexto rotulo="Título profissional" value={tituloProfissional} onChangeText={setTituloProfissional} editable={!salvando} textoAjuda="Ex.: Desenvolvedor(a) Front-end" />
        <CampoTexto rotulo="Biografia" value={biografia} onChangeText={setBiografia} multiline editable={!salvando} style={{ minHeight: 80, textAlignVertical: "top" }} />
        <CampoTexto rotulo="Cidade" value={cidade} onChangeText={setCidade} editable={!salvando} />
        <CampoTexto rotulo="Estado" value={estado} onChangeText={setEstado} maxLength={2} autoCapitalize="characters" editable={!salvando} textoAjuda="Sigla, ex.: SP" />
        <CampoTexto rotulo="Endereço" value={endereco} onChangeText={setEndereco} editable={!salvando} />
        <CampoTexto rotulo="CEP" value={cep} onChangeText={setCep} keyboardType="number-pad" maxLength={8} editable={!salvando} textoAjuda="Somente números." />
        <CampoTexto rotulo="Escolaridade" value={escolaridade} onChangeText={setEscolaridade} editable={!salvando} />
        <CampoTexto rotulo="LinkedIn" value={linkedin} onChangeText={setLinkedin} autoCapitalize="none" editable={!salvando} textoAjuda="URL completa (https://...)." />
        <CampoTexto rotulo="GitHub" value={github} onChangeText={setGithub} autoCapitalize="none" editable={!salvando} textoAjuda="URL completa (https://...)." />
        <CampoTexto rotulo="Disponibilidade" value={disponibilidade} onChangeText={setDisponibilidade} editable={!salvando} textoAjuda="Ex.: Imediata, 30 dias" />
        <CampoTexto rotulo="Pretensão salarial" value={pretensaoSalarial} onChangeText={setPretensaoSalarial} keyboardType="decimal-pad" editable={!salvando} />
        <CampoTexto rotulo="CPF" value={cpf} onChangeText={setCpf} keyboardType="number-pad" maxLength={11} editable={!salvando} textoAjuda="Somente números." />
        <CampoTexto rotulo="Data de nascimento" value={dataNascimento} onChangeText={setDataNascimento} editable={!salvando} textoAjuda="Formato AAAA-MM-DD." />
        <CampoTexto rotulo="Gênero" value={genero} onChangeText={setGenero} editable={!salvando} />
        <CampoTexto
          rotulo="Necessidades de acessibilidade"
          value={necessidadesAcessibilidade}
          onChangeText={setNecessidadesAcessibilidade}
          multiline
          editable={!salvando}
          style={{ minHeight: 80, textAlignVertical: "top" }}
          textoAjuda="Descreva em texto livre — além das deficiências marcadas na seção abaixo."
        />

        {erro ? <ErroAcao mensagem={erro} /> : null}

        <Botao onPress={() => void salvar()} carregando={salvando} disabled={salvando}>
          Salvar
        </Botao>
        <Botao variant="ghost" onPress={cancelar} disabled={salvando}>
          Cancelar
        </Botao>
      </Cartao>
    </View>
  );
}
