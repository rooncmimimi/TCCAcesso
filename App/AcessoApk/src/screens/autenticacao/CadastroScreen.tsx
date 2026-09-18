import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from "react-native";

import { anunciarParaLeitorDeTela } from "../../acessibilidade";
import { AutenticacaoService, useAutenticacao } from "../../autenticacao";
import { Botao, Cartao, CampoTexto, ContainerTela, ControleSegmentado } from "../../components/ui";
import { extrairMensagemErro } from "../../services/api/erros";
import { useTema } from "../../tema";

type TipoConta = "candidato" | "empresa";

/**
 * Etapas desta mesma tentativa de cadastro (não telas separadas navegáveis
 * pelo Stack), a mesma decisão de `EntrarScreen.tsx` para "conta
 * pausada"/"e-mail não verificado": são estados de um fluxo, não destinos
 * independentes.
 */
type Etapa = "formulario" | "confirmar-email" | "sucesso";

/**
 * Mesma regra de anúncio do `EntrarScreen.tsx`: só a entrada em cada etapa nova é anunciada; a
 * volta não, porque a pessoa acabou de tocar num botão com esse nome.
 */
const ANUNCIOS_TRANSICAO: Record<Exclude<Etapa, "formulario">, string> = {
  "confirmar-email": "Cadastro enviado. Confirme seu e-mail.",
  sucesso: "E-mail confirmado. Bem-vindo ao ACESSO.",
};

/**
 * Cadastro de candidato ou empresa. Com o provedor de e-mail ativo no backend, segue para a
 * confirmação do código de 6 dígitos antes de liberar o login.
 */
export function CadastroScreen({
  onVoltarParaLogin,
}: {
  onVoltarParaLogin: (emailConfirmado?: string) => void;
}) {
  const { tema } = useTema();
  const { cadastrarCandidato, cadastrarEmpresa } = useAutenticacao();

  const [etapa, setEtapa] = useState<Etapa>("formulario");
  const [tipoConta, setTipoConta] = useState<TipoConta>("candidato");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  // Um só toggle para os dois campos (mesmo padrão de utilidade do
  // `EntrarScreen.tsx`, adaptado para dois campos de senha): ver o que se
  // digitou em "Confirmar senha" é tão útil quanto em "Senha"; não faria
  // sentido esconder um e mostrar o outro.
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [codigo, setCodigo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [erroConfirmar, setErroConfirmar] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  // Trava síncrona contra duplo toque (mesmo padrão de `EntrarScreen.tsx`);
  // aqui é ainda mais importante: um duplo cadastro tentaria criar a mesma
  // conta duas vezes (a segunda tentativa tomaria 409 "e-mail já
  // cadastrado", um erro confuso para algo que foi só um toque duplicado).
  const enviandoRef = useRef(false);

  function irParaEtapa(nova: Exclude<Etapa, "formulario">) {
    setEtapa(nova);
    anunciarParaLeitorDeTela(ANUNCIOS_TRANSICAO[nova]);
  }

  async function cadastrar() {
    if (enviandoRef.current) return;

    if (!nome.trim() || !email.trim() || !senha) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (tipoConta === "empresa" && (!cnpj.trim() || !razaoSocial.trim())) {
      setErro("Preencha o CNPJ e a razão social.");
      return;
    }

    enviandoRef.current = true;
    setCarregando(true);
    setErro(null);

    try {
      const resposta =
        tipoConta === "candidato"
          ? await cadastrarCandidato({
              nome: nome.trim(),
              email: email.trim(),
              senha,
              telefone: telefone.trim() || undefined,
              cpf: cpf.trim() || undefined,
            })
          : await cadastrarEmpresa({
              nome: nome.trim(),
              email: email.trim(),
              senha,
              telefone: telefone.trim() || undefined,
              cnpj: cnpj.trim(),
              razaoSocial: razaoSocial.trim(),
              nomeFantasia: nomeFantasia.trim() || undefined,
            });

      if ("pendenteVerificacaoEmail" in resposta) {
        irParaEtapa("confirmar-email");
        return;
      }
      // Com `token` na resposta, o `AutenticacaoProvider` já gravou a sessão e o `RaizNavigator`
      // troca de tela sozinho quando o status muda, como no login. Esta tela desmonta antes de
      // qualquer outra coisa rodar.
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível concluir o cadastro agora."));
    } finally {
      enviandoRef.current = false;
      setCarregando(false);
    }
  }

  async function confirmarEmail() {
    if (confirmando || !codigo.trim()) return;
    setConfirmando(true);
    setErroConfirmar(null);
    try {
      await AutenticacaoService.confirmarCadastro(email.trim(), codigo.trim());
      irParaEtapa("sucesso");
    } catch (erroRequisicao) {
      setErroConfirmar(extrairMensagemErro(erroRequisicao, "Código inválido ou expirado."));
    } finally {
      setConfirmando(false);
    }
  }

  async function reenviarCodigo() {
    if (reenviando) return;
    setReenviando(true);
    setErroConfirmar(null);
    try {
      await AutenticacaoService.reenviarConfirmacao(email.trim());
      setReenviado(true);
    } catch (erroRequisicao) {
      setErroConfirmar(extrairMensagemErro(erroRequisicao, "Não foi possível reenviar o código agora."));
    } finally {
      setReenviando(false);
    }
  }

  if (etapa === "sucesso") {
    return (
      <ContainerTela>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: tema.spacing.xl }}>
          <Cartao elevacao="md" style={{ gap: tema.spacing.md }}>
            <Text style={[tema.typography.heading, { color: tema.colors.textPrimary }]}>
              Bem-vindo(a) ao ACESSO{nome.trim() ? `, ${nome.trim().split(" ")[0]}` : ""}!
            </Text>
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>
              Seu e-mail foi confirmado e sua conta já está pronta. Entre com o e-mail e a senha que você acabou de
              cadastrar para começar a usar o ACESSO.
            </Text>
            <Botao onPress={() => onVoltarParaLogin(email.trim())}>Ir para o login</Botao>
          </Cartao>
        </ScrollView>
      </ContainerTela>
    );
  }

  if (etapa === "confirmar-email") {
    return (
      <ContainerTela>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: tema.spacing.lg, paddingVertical: tema.spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
            <Cartao elevacao="md" style={{ gap: tema.spacing.md }}>
              <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>Confirme seu e-mail</Text>
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
                Enviamos um código de 6 dígitos para {email.trim()}. Verifique sua caixa de entrada (e a pasta de
                spam) e informe o código abaixo.
              </Text>

              <CampoTexto
                rotulo="Código de confirmação"
                placeholder="000000"
                value={codigo}
                onChangeText={setCodigo}
                keyboardType="number-pad"
                maxLength={6}
                editable={!confirmando}
                erro={erroConfirmar ?? undefined}
              />

              {reenviado ? (
                <Text accessibilityLiveRegion="polite" style={[tema.typography.bodySmall, { color: tema.colors.success.solid }]}>
                  Código reenviado.
                </Text>
              ) : null}

              <Botao onPress={() => void confirmarEmail()} carregando={confirmando} disabled={confirmando || !codigo.trim()}>
                Confirmar e-mail
              </Botao>
              <Botao variant="outline" onPress={() => void reenviarCodigo()} carregando={reenviando} disabled={reenviando}>
                Reenviar código
              </Botao>
              <Botao variant="ghost" onPress={() => onVoltarParaLogin()} disabled={confirmando || reenviando}>
                Voltar para o login
              </Botao>
            </Cartao>
          </ScrollView>
        </KeyboardAvoidingView>
      </ContainerTela>
    );
  }

  return (
    <ContainerTela>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ gap: tema.spacing.lg, paddingVertical: tema.spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[tema.typography.heading, { color: tema.colors.textPrimary }]}>Criar conta</Text>

          <Cartao elevacao="md" style={{ gap: tema.spacing.md }}>
            <ControleSegmentado
              rotulo="Tipo de conta"
              value={tipoConta}
              onChange={setTipoConta}
              opcoes={[
                { rotulo: "Candidato", value: "candidato" },
                { rotulo: "Empresa", value: "empresa" },
              ]}
            />

            <CampoTexto rotulo="Nome" value={nome} onChangeText={setNome} editable={!carregando} />
            <CampoTexto
              rotulo="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!carregando}
            />
            <CampoTexto
              rotulo="Telefone"
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
              editable={!carregando}
              textoAjuda="Opcional."
            />

            {tipoConta === "candidato" ? (
              <CampoTexto
                rotulo="CPF"
                value={cpf}
                onChangeText={setCpf}
                keyboardType="number-pad"
                maxLength={11}
                editable={!carregando}
                textoAjuda="Opcional — somente números."
              />
            ) : (
              <>
                <CampoTexto
                  rotulo="CNPJ"
                  value={cnpj}
                  onChangeText={setCnpj}
                  keyboardType="number-pad"
                  maxLength={14}
                  editable={!carregando}
                  textoAjuda="Somente números."
                />
                <CampoTexto rotulo="Razão social" value={razaoSocial} onChangeText={setRazaoSocial} editable={!carregando} />
                <CampoTexto
                  rotulo="Nome fantasia"
                  value={nomeFantasia}
                  onChangeText={setNomeFantasia}
                  editable={!carregando}
                  textoAjuda="Opcional — os demais dados da empresa (logo, setor, endereço) podem ser preenchidos depois, no perfil."
                />
              </>
            )}

            <CampoTexto
              rotulo="Senha"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!mostrarSenha}
              textContentType="newPassword"
              editable={!carregando}
              textoAjuda="Mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo."
            />
            <CampoTexto
              rotulo="Confirmar senha"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry={!mostrarSenha}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => void cadastrar()}
              editable={!carregando}
            />
            <Pressable
              onPress={() => setMostrarSenha((valor) => !valor)}
              accessibilityRole="button"
              accessibilityLabel={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              hitSlop={14}
              style={{ alignSelf: "flex-end" }}
            >
              <Text style={[tema.typography.bodySmall, { color: tema.colors.primary.solid }]}>
                {mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              </Text>
            </Pressable>

            {erro ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={[tema.typography.caption, { color: tema.colors.error.solid }]}
              >
                {erro}
              </Text>
            ) : null}

            <Botao onPress={() => void cadastrar()} carregando={carregando} disabled={carregando}>
              Criar conta
            </Botao>
            <Botao variant="ghost" onPress={() => onVoltarParaLogin()} disabled={carregando}>
              Já tenho conta
            </Botao>
          </Cartao>
        </ScrollView>
      </KeyboardAvoidingView>
    </ContainerTela>
  );
}
