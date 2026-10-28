import { router } from 'expo-router';
import { useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type TextInputInstance } from 'react-native';

import { cadastrarPessoa } from '@/api/autenticacao';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Tela } from '@/componentes/Tela';
import { Titulo } from '@/componentes/Titulo';
import { FalhaApi, MensagensErro, mensagemDe } from '@/servicos/erros';
import { useSessao } from '@/sessao/ProvedorSessao';
import { cores, texto } from '@/tema';
import { mascaraCpf, mascaraData, mascaraTelefone } from '@/utilitarios/formatacao';
import {
  dataBrasileiraParaIso,
  validarAceiteTermos,
  validarCidade,
  validarConfirmacaoSenha,
  validarCpfObrigatorio,
  validarDataNascimento,
  validarEmail,
  validarNome,
  validarNovaSenha,
  validarTelefoneObrigatorio,
  validarUfObrigatoria,
} from '@/utilitarios/validacao';

/** Ordem dos campos na tela (o foco vai ao primeiro com erro). Os nomes são os mesmos da API. */
const CAMPOS = ['nome', 'email', 'telefone', 'cpf', 'dataNascimento', 'cidade', 'estado', 'senha', 'confirmacao', 'termos'] as const;
type NomeCampo = (typeof CAMPOS)[number];
type Formulario = Record<Exclude<NomeCampo, 'termos'>, string>;

/** Criar conta de pessoa (candidato), com os mesmos campos obrigatórios da API e do app Android. */
export default function Cadastro() {
  const { iniciar } = useSessao();
  const [form, setForm] = useState<Formulario>({
    nome: '', email: '', telefone: '', cpf: '', dataNascimento: '', cidade: '', estado: '', senha: '', confirmacao: '',
  });
  const [aceitou, setAceitou] = useState(false);
  const [erros, setErros] = useState<Partial<Record<NomeCampo, string | null>>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Um ref por campo, para levar o foco ao primeiro erro e ao próximo campo com o "seguinte" do teclado.
  const refNome = useRef<TextInputInstance>(null);
  const refEmail = useRef<TextInputInstance>(null);
  const refTelefone = useRef<TextInputInstance>(null);
  const refCpf = useRef<TextInputInstance>(null);
  const refData = useRef<TextInputInstance>(null);
  const refCidade = useRef<TextInputInstance>(null);
  const refEstado = useRef<TextInputInstance>(null);
  const refSenha = useRef<TextInputInstance>(null);
  const refConfirmacao = useRef<TextInputInstance>(null);

  /** Só para os eventos (nunca durante a renderização). */
  function referencia(campo: NomeCampo): RefObject<TextInputInstance | null> | null {
    const todas = {
      nome: refNome, email: refEmail, telefone: refTelefone, cpf: refCpf, dataNascimento: refData,
      cidade: refCidade, estado: refEstado, senha: refSenha, confirmacao: refConfirmacao, termos: null,
    };
    return todas[campo];
  }

  // Ao corrigir um campo, o erro dele some (os outros continuam até o próximo envio).
  const alterar = (campo: keyof Formulario, mascara?: (valor: string) => string) => (valor: string) => {
    setForm((atual) => ({ ...atual, [campo]: mascara ? mascara(valor) : valor }));
    setErros((atual) => (atual[campo] ? { ...atual, [campo]: null } : atual));
  };

  function focarPrimeiroErro(lista: Partial<Record<NomeCampo, string | null>>) {
    const primeiro = CAMPOS.find((campo) => lista[campo]);
    if (primeiro) {
      referencia(primeiro)?.current?.focus();
    }
  }

  async function enviar() {
    const novos: Partial<Record<NomeCampo, string | null>> = {
      nome: validarNome(form.nome),
      email: validarEmail(form.email),
      telefone: validarTelefoneObrigatorio(form.telefone),
      cpf: validarCpfObrigatorio(form.cpf),
      dataNascimento: validarDataNascimento(form.dataNascimento),
      cidade: validarCidade(form.cidade),
      estado: validarUfObrigatoria(form.estado),
      senha: validarNovaSenha(form.senha),
      confirmacao: validarConfirmacaoSenha(form.senha, form.confirmacao),
      termos: validarAceiteTermos(aceitou),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) {
      setMensagem(MensagensErro.CAMPOS);
      focarPrimeiroErro(novos);
      return;
    }
    setMensagem(null);
    setEnviando(true);
    try {
      const resultado = await cadastrarPessoa({
        ...form,
        dataNascimento: dataBrasileiraParaIso(form.dataNascimento) ?? '',
      });
      if (resultado.tipo === 'autenticado') {
        await iniciar(resultado.sessao);
      } else {
        router.replace({ pathname: '/confirmar-email', params: { email: resultado.email } });
      }
    } catch (erro) {
      if (erro instanceof FalhaApi && Object.keys(erro.campos).length > 0) {
        setErros(erro.campos);
        focarPrimeiroErro(erro.campos as Partial<Record<NomeCampo, string>>);
      }
      setMensagem(mensagemDe(erro));
    } finally {
      setEnviando(false);
    }
  }

  const campo = (nome: keyof Formulario) => ({
    value: form[nome],
    erro: erros[nome],
    returnKeyType: 'next' as const,
    submitBehavior: 'submit' as const,
  });

  return (
    <Tela>
      <Text style={texto.secundario}>Todos os campos são obrigatórios. Seus dados são usados só para a sua conta no ACESSO.</Text>
      <Aviso tipo="erro" mensagem={mensagem} />

      <Titulo nivel={2}>Seus dados</Titulo>
      <Campo {...campo('nome')} ref={refNome} onSubmitEditing={() => refEmail.current?.focus()} rotulo="Nome completo" onChangeText={alterar('nome')} autoComplete="name" textContentType="name" autoCapitalize="words" />
      <Campo
        {...campo('email')} ref={refEmail} onSubmitEditing={() => refTelefone.current?.focus()}
        rotulo="E-mail"
        onChangeText={alterar('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Campo
        {...campo('telefone')} ref={refTelefone} onSubmitEditing={() => refCpf.current?.focus()}
        rotulo="Telefone com DDD"
        ajuda="Exemplo: (11) 98765-4321"
        onChangeText={alterar('telefone', mascaraTelefone)}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <Campo {...campo('cpf')} ref={refCpf} onSubmitEditing={() => refData.current?.focus()} rotulo="CPF" ajuda="Só os números; os pontos entram sozinhos." onChangeText={alterar('cpf', mascaraCpf)} keyboardType="number-pad" />
      <Campo
        {...campo('dataNascimento')} ref={refData} onSubmitEditing={() => refCidade.current?.focus()}
        rotulo="Data de nascimento"
        ajuda="Dia, mês e ano: 25/09/2000"
        onChangeText={alterar('dataNascimento', mascaraData)}
        keyboardType="number-pad"
        autoComplete="birthdate-full"
      />
      <Campo {...campo('cidade')} ref={refCidade} onSubmitEditing={() => refEstado.current?.focus()} rotulo="Cidade" onChangeText={alterar('cidade')} autoComplete="postal-address-locality" textContentType="addressCity" autoCapitalize="words" />
      <Campo
        {...campo('estado')} ref={refEstado} onSubmitEditing={() => refSenha.current?.focus()}
        rotulo="Estado (UF)"
        ajuda="Sigla com 2 letras, por exemplo: SP"
        onChangeText={alterar('estado', (valor) => valor.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        textContentType="addressState"
      />

      <Titulo nivel={2}>Senha</Titulo>
      <Campo
        {...campo('senha')} ref={refSenha} onSubmitEditing={() => refConfirmacao.current?.focus()}
        rotulo="Crie uma senha"
        ajuda="De 8 a 72 caracteres, com letra minúscula, letra maiúscula, número e símbolo."
        onChangeText={alterar('senha')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        passwordRules="minlength: 8; maxlength: 72; required: lower; required: upper; required: digit; required: special;"
      />
      <Campo
        {...campo('confirmacao')} ref={refConfirmacao}
        rotulo="Repita a senha"
        onChangeText={alterar('confirmacao')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={() => void enviar()}
      />

      <Pressable
        onPress={() => {
          setAceitou((atual) => !atual);
          setErros((atual) => ({ ...atual, termos: null }));
        }}
        accessibilityRole="switch"
        accessibilityState={{ checked: aceitou }}
        accessibilityLabel={`Li e aceito os Termos de Uso e a Política de Privacidade${erros.termos ? `. Erro: ${erros.termos}` : ''}`}
        style={estilos.termos}
      >
        {/* O botão em volta já é o "interruptor" para o VoiceOver; este fica só como visual. */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          <Switch
            value={aceitou}
            onValueChange={setAceitou}
            trackColor={{ true: cores.primaria, false: cores.contorno }}
            accessible={false}
          />
        </View>
        <Text style={[texto.corpo, estilos.flex]}>Li e aceito os Termos de Uso e a Política de Privacidade.</Text>
      </Pressable>
      {erros.termos ? <Text style={estilos.erro} accessible={false} aria-hidden>! {erros.termos}</Text> : null}
      <Botao titulo="Ler os Termos e a Política de Privacidade" variante="texto" onPress={() => router.push('/termos')} />

      <Botao titulo="Criar conta" carregando={enviando} onPress={() => void enviar()} />
      <View>
        <Botao titulo="Já tenho conta: entrar" variante="texto" onPress={() => router.replace('/entrar')} />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  termos: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  flex: { flex: 1 },
  erro: { fontSize: 15, color: cores.erro, fontWeight: '600' },
});
