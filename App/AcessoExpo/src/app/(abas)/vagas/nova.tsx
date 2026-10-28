import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, type TextInputInstance } from 'react-native';

import { criarVaga } from '@/api/conteudo';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Opcoes } from '@/componentes/Opcoes';
import { OpcoesMultiplas } from '@/componentes/OpcoesMultiplas';
import { Tela } from '@/componentes/Tela';
import { FalhaApi, MensagensErro, mensagemDe } from '@/servicos/erros';
import { emitir } from '@/utilitarios/eventos';
import { CONTRATOS, MODALIDADES, PUBLICOS, RECURSOS } from '@/utilitarios/rotulos';
import { validarDescricaoVaga, validarTamanhoMaximo, validarTituloVaga, validarUf } from '@/utilitarios/validacao';

const lista = (tabela: Record<string, string>) => Object.entries(tabela).map(([valor, texto]) => ({ valor, texto }));

type Erros = Partial<Record<'titulo' | 'descricao' | 'cidade' | 'estado', string | null>>;

/** Publicar vaga (só empresa aprovada; a API recusa as outras com 403). */
export default function NovaVaga() {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [modalidade, setModalidade] = useState('presencial');
  const [contrato, setContrato] = useState('clt');
  const [publicoAlvo, setPublicoAlvo] = useState('geral');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [recursos, setRecursos] = useState<string[]>([]);
  const [erros, setErros] = useState<Erros>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campoTitulo = useRef<TextInputInstance>(null);
  const campoDescricao = useRef<TextInputInstance>(null);
  const campoCidade = useRef<TextInputInstance>(null);
  const campoEstado = useRef<TextInputInstance>(null);

  const limpar = (campo: keyof Erros) => () => setErros((atual) => (atual[campo] ? { ...atual, [campo]: null } : atual));

  async function publicar() {
    const novos: Erros = {
      titulo: validarTituloVaga(titulo),
      descricao: validarDescricaoVaga(descricao),
      cidade: validarTamanhoMaximo(cidade, 100),
      estado: validarUf(estado),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) {
      setMensagem(MensagensErro.CAMPOS);
      (novos.titulo ? campoTitulo : novos.descricao ? campoDescricao : novos.cidade ? campoCidade : campoEstado).current?.focus();
      return;
    }
    setMensagem(null);
    setEnviando(true);
    try {
      await criarVaga({ titulo, descricao, modalidade, contrato, publicoAlvo, cidade, estado, recursosAcessibilidade: recursos });
      AccessibilityInfo.announceForAccessibility('Vaga publicada.');
      emitir('vagas');
      router.back();
    } catch (falha) {
      if (falha instanceof FalhaApi && Object.keys(falha.campos).length > 0) {
        setErros(falha.campos);
      }
      setMensagem(mensagemDe(falha));
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Aviso tipo="erro" mensagem={mensagem} />
      <Campo
        ref={campoTitulo}
        rotulo="Título da vaga"
        value={titulo}
        onChangeText={(valor) => {
          setTitulo(valor);
          limpar('titulo')();
        }}
        erro={erros.titulo}
        autoCapitalize="sentences"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoDescricao.current?.focus()}
      />
      <Campo
        ref={campoDescricao}
        rotulo="Descrição"
        value={descricao}
        onChangeText={(valor) => {
          setDescricao(valor);
          limpar('descricao')();
        }}
        erro={erros.descricao}
        ajuda="Conte o que a pessoa vai fazer e o que a empresa oferece (mínimo 20 caracteres)."
        multiline
        maxLength={8100}
      />
      <Opcoes rotulo="Modalidade" opcoes={lista(MODALIDADES)} valor={modalidade} aoMudar={(valor) => setModalidade(valor ?? 'presencial')} />
      <Opcoes rotulo="Tipo de contrato" opcoes={lista(CONTRATOS)} valor={contrato} aoMudar={(valor) => setContrato(valor ?? 'clt')} />
      <Opcoes rotulo="Para quem é a vaga" opcoes={lista(PUBLICOS)} valor={publicoAlvo} aoMudar={(valor) => setPublicoAlvo(valor ?? 'geral')} />
      <Campo
        ref={campoCidade}
        rotulo="Cidade (opcional)"
        value={cidade}
        onChangeText={(valor) => {
          setCidade(valor);
          limpar('cidade')();
        }}
        erro={erros.cidade}
        autoCapitalize="words"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoEstado.current?.focus()}
      />
      <Campo
        ref={campoEstado}
        rotulo="Estado (UF, opcional)"
        ajuda="Sigla com 2 letras, por exemplo: SP"
        value={estado}
        onChangeText={(valor) => {
          setEstado(valor.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase());
          limpar('estado')();
        }}
        erro={erros.estado}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <OpcoesMultiplas rotulo="Recursos de acessibilidade oferecidos" opcoes={lista(RECURSOS)} marcadas={recursos} aoMudar={setRecursos} />
      <Botao titulo="Publicar vaga" carregando={enviando} onPress={() => void publicar()} />
      <Botao titulo="Cancelar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}
