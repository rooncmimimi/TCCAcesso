import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { IconeGoogle } from "@/components/cadastro/BotaoGoogle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useSessao } from "@/hooks/useSessao";
import {
  ErroGoogleNavegador,
  lerCodigoDoFragmento,
  lerVinculo,
  limparVinculo,
  tirarCodigoDaUrl,
} from "@/lib/googleNavegador";
import { extrairMensagemErro } from "@/services/api";
import googleService, { mensagemDeErroGoogle } from "@/services/google.service";

const CHAVE_GOOGLE = ["seguranca", "google"] as const;

const OUTRO_NAVEGADOR =
  "Esta vinculação com o Google não começou neste navegador. Clique em Vincular de novo para recomeçar.";

/**
 * O que acontece quando o Google devolve o navegador a esta tela: o código vem no fragmento
 * (`#codigo=`) e o erro, na query (`?erro=`). Os dois saem da barra de endereço ao serem lidos.
 *
 * Com o código, só quem começou a vinculação **neste navegador** o apresenta (segredo da aba), e o
 * servidor só o aceita para esta sessão. Termina sempre com um aviso na tela, e o segredo da aba é
 * descartado — o código é de uso único.
 */
function useRetornoDaVinculacao(aoMudar: () => void) {
  // Em desenvolvimento o React monta duas vezes; sem isto o código seria trocado duas vezes.
  const jaTratou = useRef(false);

  useEffect(() => {
    if (jaTratou.current) return;

    const codigo = lerCodigoDoFragmento();
    const erro = new URLSearchParams(window.location.search).get("erro");
    if (!codigo && !erro) return;

    jaTratou.current = true;
    tirarCodigoDaUrl(["codigo", "erro"]);

    if (!codigo) {
      limparVinculo();
      toast.error(
        erro === "cancelado"
          ? "Você cancelou a vinculação com o Google."
          : "Não foi possível vincular a conta Google. Tente novamente.",
      );
      return;
    }

    if (lerVinculo() === null) {
      toast.error(OUTRO_NAVEGADOR);
      return;
    }

    googleService
      .vincular(codigo)
      .then(() => {
        toast.success("Conta Google vinculada. Agora você também pode entrar com ela.");
        aoMudar();
      })
      .catch((falha) =>
        toast.error(mensagemDeErroGoogle(falha, "Não foi possível vincular a conta Google. Tente novamente.")),
      )
      .finally(limparVinculo);
    // `aoMudar` só invalida uma consulta; a vinculação roda uma vez por retorno.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

type Acao = "vincular" | "desvincular";

const TEXTOS: Record<Acao, { titulo: string; descricao: string; confirmar: string; enviando: string }> = {
  vincular: {
    titulo: "Vincular conta Google",
    descricao:
      "Por segurança, confirme sua senha do ACESSO. Depois você escolhe a conta Google na página do próprio Google, e a sua senha do Google nunca passa por aqui.",
    confirmar: "Continuar para o Google",
    enviando: "Abrindo o Google…",
  },
  desvincular: {
    titulo: "Desvincular conta Google",
    descricao:
      "Depois de desvincular, você entra no ACESSO apenas com e-mail e senha. Confirme sua senha para continuar.",
    confirmar: "Desvincular",
    enviando: "Desvinculando…",
  },
};

/** Pede a senha atual antes de uma ação sensível sobre a conta Google. */
function DialogoSenha({
  acao,
  enviando,
  erro,
  aoConfirmar,
  aoFechar,
}: {
  acao: Acao;
  enviando: boolean;
  erro: string | null;
  aoConfirmar: (senha: string) => void;
  aoFechar: () => void;
}) {
  const [senha, setSenha] = useState("");
  const campoRef = useRef<HTMLInputElement>(null);
  const textos = TEXTOS[acao];

  // O campo fica desabilitado enquanto envia e o foco cai no diálogo; com o erro na tela, volta
  // para o campo, para a pessoa corrigir a senha sem precisar achá-lo de novo.
  useEffect(() => {
    if (erro) campoRef.current?.focus();
  }, [erro]);

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !enviando && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault();
            if (!enviando && senha) aoConfirmar(senha);
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>{textos.titulo}</DialogTitle>
            <DialogDescription>{textos.descricao}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="senha-conta-google">Senha atual</Label>
            <PasswordInput
              id="senha-conta-google"
              ref={campoRef}
              autoComplete="current-password"
              className="min-h-12"
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
              aria-invalid={Boolean(erro)}
              aria-describedby={erro ? "senha-conta-google-erro" : undefined}
              disabled={enviando}
            />
            {erro && (
              <p id="senha-conta-google-erro" role="alert" className="text-sm font-medium text-destructive">
                {erro}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={enviando} onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || !senha} variant={acao === "desvincular" ? "destructive" : "default"}>
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" /> {textos.enviando}
                </>
              ) : (
                textos.confirmar
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Seção "Contas conectadas" de Configurações → Segurança: vincular e desvincular o Google de uma
 * conta que já existe (achados 7 e 20 da auditoria).
 *
 * É o caminho de saída de quem tentou entrar com o Google e caiu em "já existe conta com este
 * e-mail": entra com a senha e, aqui, anexa o Google. As duas ações pedem a **senha atual** — uma
 * sessão aberta, sozinha, não basta para dar à conta um segundo jeito de entrar — e a pessoa é
 * avisada no Site e por e-mail.
 *
 * Só aparece para conta de candidato: o login com o Google nasce como login de candidato, e a conta
 * de empresa é outra conta, com e-mail e senha próprios.
 */
export function SecaoContasConectadas() {
  const { usuario } = useSessao();
  const queryClient = useQueryClient();
  const ehCandidato = usuario?.tipo === "candidato";

  const { data: conta, isLoading, isError, refetch } = useQuery({
    queryKey: CHAVE_GOOGLE,
    queryFn: () => googleService.conta(),
    enabled: ehCandidato,
  });

  const [acao, setAcao] = useState<Acao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const atualizar = () => queryClient.invalidateQueries({ queryKey: CHAVE_GOOGLE });
  useRetornoDaVinculacao(() => void atualizar());

  const fechar = () => {
    setAcao(null);
    setErro(null);
  };

  const mensagemDoErro = (falha: unknown, padrao: string) =>
    falha instanceof ErroGoogleNavegador ? falha.message : extrairMensagemErro(falha, padrao);

  const vincular = useMutation({
    mutationFn: (senha: string) => googleService.iniciarVinculo(senha),
    // Segue para o Google: a tela é trocada, então o diálogo fica como está até lá.
    onSuccess: (url) => window.location.assign(url),
    onError: (falha) => setErro(mensagemDoErro(falha, "Não foi possível começar a vinculação.")),
  });

  const desvincular = useMutation({
    mutationFn: (senha: string) => googleService.desvincular(senha),
    onSuccess: () => {
      toast.success("Conta Google desvinculada. Você entra apenas com e-mail e senha.");
      fechar();
      void atualizar();
    },
    onError: (falha) => setErro(mensagemDoErro(falha, "Não foi possível desvincular a conta Google.")),
  });

  if (!ehCandidato) return null;

  // Nada a oferecer: o recurso não existe neste ambiente e não há vínculo para desfazer.
  if (conta && !conta.vinculado && (!conta.disponivel || !conta.elegivel)) return null;

  const enviando = vincular.isPending || vincular.isSuccess || desvincular.isPending;

  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Contas conectadas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Outras contas com as quais você pode entrar no ACESSO, além de e-mail e senha.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando contas conectadas…
          </div>
        ) : isError || !conta ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>Não foi possível carregar suas contas conectadas.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-lg border p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary">
              <IconeGoogle className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                Google
                <Badge variant={conta.vinculado ? "secondary" : "outline"} className="font-medium">
                  {conta.vinculado ? "Vinculada" : "Não vinculada"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {conta.vinculado
                  ? "Você pode entrar no ACESSO com a sua conta Google."
                  : "Vincule para entrar com um toque, sem digitar a senha do ACESSO."}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              {conta.vinculado ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive sm:w-auto"
                  onClick={() => setAcao("desvincular")}
                  aria-label="Desvincular conta Google"
                >
                  Desvincular
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setAcao("vincular")}
                  aria-label="Vincular conta Google"
                >
                  Vincular
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {acao && (
        <DialogoSenha
          acao={acao}
          enviando={enviando}
          erro={erro}
          aoConfirmar={(senha) => {
            setErro(null);
            if (acao === "vincular") vincular.mutate(senha);
            else desvincular.mutate(senha);
          }}
          aoFechar={fechar}
        />
      )}
    </Card>
  );
}
