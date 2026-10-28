import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Text } from 'react-native';

import { atualizarPerfil, carregarMeuPerfil, type EdicaoPerfil } from '@/api/conteudo';
import type { Perfil } from '@/api/leitores';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Tela } from '@/componentes/Tela';
import { FalhaApi, MensagensErro, mensagemDe } from '@/servicos/erros';
import { useSessao } from '@/sessao/ProvedorSessao';
import { texto } from '@/tema';
import { emitir } from '@/utilitarios/eventos';
import { useCarregar } from '@/utilitarios/useCarregar';
import { validarCidade, validarNome, validarSite, validarTamanhoMaximo, validarUf } from '@/utilitarios/validacao';

/** Editar o perfil de texto (TelaEditarPerfil no Android). Foto e capa ainda não: use o site ou o app Android. */
export default function EditarPerfil() {
  const { sessao } = useSessao();
  const tipo = sessao?.tipo ?? 'candidato';
  const carregamento = useCarregar(() => carregarMeuPerfil(tipo, sessao?.idUsuario ?? ''), [tipo, sessao?.idUsuario]);
  return (
    <Tela>
      <EstadoConteudo
        carregando={carregamento.carregando}
        erro={carregamento.erro}
        vazio={false}
        mensagemVazio=""
        aoTentarDeNovo={() => void carregamento.recarregar()}
      />
      {carregamento.dados && sessao ? <Formulario perfil={carregamento.dados} idUsuario={sessao.idUsuario} /> : null}
    </Tela>
  );
}

type Erros = Partial<Record<'nome' | 'titulo' | 'sobre' | 'cidade' | 'estado' | 'setor' | 'cultura' | 'site', string | null>>;

function Formulario({ perfil, idUsuario }: { perfil: Perfil; idUsuario: string }) {
  const { atualizarNome } = useSessao();
  const empresa = perfil.tipo === 'empresa';
  const [nome, setNome] = useState(perfil.nomeEditavel ?? '');
  const [titulo, setTitulo] = useState(perfil.tituloProfissional ?? '');
  const [sobre, setSobre] = useState(perfil.sobre ?? '');
  const [cidade, setCidade] = useState(perfil.cidade ?? '');
  const [estado, setEstado] = useState(perfil.estado ?? '');
  const [setor, setSetor] = useState(perfil.setor ?? '');
  const [cultura, setCultura] = useState(perfil.culturaInclusiva ?? '');
  const [site, setSite] = useState(perfil.site ?? '');
  const [erros, setErros] = useState<Erros>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo: keyof Erros, definir: (valor: string) => void) => (valor: string) => {
    definir(valor);
    setErros((atual) => (atual[campo] ? { ...atual, [campo]: null } : atual));
  };

  async function salvar() {
    const novos: Erros = {
      nome: empresa ? validarTamanhoMaximo(nome, 200) : validarNome(nome),
      titulo: validarTamanhoMaximo(titulo, 150),
      sobre: validarTamanhoMaximo(sobre, empresa ? 4000 : 2000),
      cidade: cidade.trim() ? validarCidade(cidade) : null,
      estado: validarUf(estado),
      setor: validarTamanhoMaximo(setor, 120),
      cultura: validarTamanhoMaximo(cultura, 4000),
      site: validarSite(site),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) {
      setMensagem(MensagensErro.CAMPOS);
      return;
    }
    if (!perfil.registroId) {
      setMensagem('Não foi possível identificar o seu perfil. Tente de novo mais tarde.');
      return;
    }
    setMensagem(null);
    setEnviando(true);
    const edicao: EdicaoPerfil = {
      tipo: perfil.tipo,
      usuarioId: idUsuario,
      registroId: perfil.registroId,
      nome,
      cidade,
      estado,
      tituloProfissional: titulo,
      sobre,
      setor,
      culturaInclusiva: cultura,
      site,
    };
    try {
      await atualizarPerfil(edicao);
      if (!empresa) await atualizarNome(nome);
      AccessibilityInfo.announceForAccessibility('Perfil salvo.');
      emitir('perfil');
      router.back();
    } catch (falha) {
      if (falha instanceof FalhaApi && Object.keys(falha.campos).length > 0) {
        setErros({ nome: falha.campos.nome ?? falha.campos.nomeFantasia, cidade: falha.campos.cidade, estado: falha.campos.estado, site: falha.campos.site });
      }
      setMensagem(mensagemDe(falha));
      setEnviando(false);
    }
  }

  return (
    <>
      <Text style={texto.secundario}>Foto e capa ainda são trocadas pelo site ou pelo app Android.</Text>
      <Aviso tipo="erro" mensagem={mensagem} />
      <Campo rotulo={empresa ? 'Nome da empresa' : 'Nome completo'} value={nome} onChangeText={mudar('nome', setNome)} erro={erros.nome} autoCapitalize="words" />
      {empresa ? (
        <Campo rotulo="Setor" value={setor} onChangeText={mudar('setor', setSetor)} erro={erros.setor} />
      ) : (
        <Campo rotulo="Título profissional" value={titulo} onChangeText={mudar('titulo', setTitulo)} erro={erros.titulo} ajuda="Exemplo: Analista de dados" />
      )}
      <Campo
        rotulo={empresa ? 'Descrição da empresa' : 'Sobre você'}
        value={sobre}
        onChangeText={mudar('sobre', setSobre)}
        erro={erros.sobre}
        multiline
      />
      {empresa ? (
        <>
          <Campo rotulo="Cultura inclusiva" value={cultura} onChangeText={mudar('cultura', setCultura)} erro={erros.cultura} multiline />
          <Campo
            rotulo="Site"
            value={site}
            onChangeText={mudar('site', setSite)}
            erro={erros.site}
            ajuda="Comece com https://"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </>
      ) : null}
      <Campo rotulo="Cidade" value={cidade} onChangeText={mudar('cidade', setCidade)} erro={erros.cidade} autoCapitalize="words" />
      <Campo
        rotulo="Estado (UF)"
        ajuda="Sigla com 2 letras, por exemplo: SP"
        value={estado}
        onChangeText={mudar('estado', (valor) => setEstado(valor.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase()))}
        erro={erros.estado}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Botao titulo="Salvar" carregando={enviando} onPress={() => void salvar()} />
      <Botao titulo="Cancelar" variante="texto" onPress={() => router.back()} />
    </>
  );
}
