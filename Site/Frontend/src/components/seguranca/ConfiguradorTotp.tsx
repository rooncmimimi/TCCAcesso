import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { CampoCodigo } from "@/components/seguranca/CampoCodigo";
import { CodigosDeRecuperacao } from "@/components/seguranca/CodigosDeRecuperacao";
import { Button } from "@/components/ui/button";
import {
  mensagemDeErroTotp,
  totpService,
  type ConfiguracaoTotp,
} from "@/services/totp.service";

type Fase = "inicio" | "configurando" | "codigos";

/**
 * A configuração da verificação em duas etapas, em três passos: instalar/abrir o aplicativo e ler o QR code
 * (ou digitar a chave), confirmar com o primeiro código e guardar os códigos de recuperação.
 *
 * Nada fica ativo até o código ser confirmado. A chave também aparece em texto, para quem não consegue ler o
 * QR code (leitor de tela, câmera, computador sem câmera). O QR code é desenhado aqui no navegador: o segredo
 * não passa por nenhum serviço de terceiros.
 *
 * `configuracaoInicial` vem pronta na troca de aparelho de quem já tem TOTP: a senha e o código já foram
 * conferidos antes (no diálogo), e a pessoa começa direto no passo de conectar o aplicativo novo.
 */
export function ConfiguradorTotp({
  aoConcluir,
  aoCancelar,
  configuracaoInicial,
  introducao,
}: {
  aoConcluir: () => void;
  aoCancelar?: () => void;
  configuracaoInicial?: ConfiguracaoTotp;
  introducao?: string;
}) {
  const [fase, setFase] = useState<Fase>(configuracaoInicial ? "configurando" : "inicio");
  const [configuracao, setConfiguracao] = useState<ConfiguracaoTotp | null>(configuracaoInicial ?? null);
  const [qr, setQr] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [carregando, setCarregando] = useState(false);
  const [codigosDeRecuperacao, setCodigosDeRecuperacao] = useState<string[]>([]);
  const trabalhando = useRef(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  // Depois de um erro o foco volta ao campo, mas só quando ele já foi reabilitado (enquanto envia, fica desabilitado).
  const [pedirFoco, setPedirFoco] = useState(0);

  useEffect(() => {
    if (pedirFoco > 0) campoRef.current?.focus();
  }, [pedirFoco]);

  // Cada passo troca o conteúdo inteiro; o foco vai para o título dele, para o leitor de tela anunciar onde está.
  useEffect(() => {
    tituloRef.current?.focus();
  }, [fase]);

  useEffect(() => {
    if (!configuracao) return;

    let ativo = true;

    QRCode.toDataURL(configuracao.uri, { margin: 1, width: 224, errorCorrectionLevel: "M" })
      .then((imagem) => {
        if (ativo) setQr(imagem);
      })
      .catch(() => {
        // Sem QR code a chave em texto continua servindo.
        if (ativo) setQr(null);
      });

    return () => {
      ativo = false;
    };
  }, [configuracao]);

  async function comecar() {
    if (trabalhando.current) return;
    trabalhando.current = true;
    setCarregando(true);
    setErro(undefined);

    try {
      setConfiguracao(await totpService.iniciar());
      setFase("configurando");
    } catch (falha) {
      setErro(mensagemDeErroTotp(falha, "Não foi possível começar agora. Tente novamente."));
    } finally {
      trabalhando.current = false;
      setCarregando(false);
    }
  }

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault();
    if (trabalhando.current || !configuracao) return;

    if (codigo.replace(/\s+/g, "").length !== 6) {
      setErro("Digite os 6 números que o aplicativo mostra.");
      campoRef.current?.focus();
      return;
    }

    trabalhando.current = true;
    setCarregando(true);
    setErro(undefined);

    try {
      const resultado = await totpService.ativar(configuracao.configuracao, codigo);
      setCodigosDeRecuperacao(resultado.codigosRecuperacao);
      // O segredo já foi gravado no servidor; não há motivo para ele continuar na memória da tela.
      setConfiguracao(null);
      setQr(null);
      setCodigo("");
      setFase("codigos");
    } catch (falha) {
      setErro(mensagemDeErroTotp(falha, "Não foi possível ativar agora. Tente novamente."));
      setCodigo("");
      setPedirFoco((n) => n + 1);
    } finally {
      trabalhando.current = false;
      setCarregando(false);
    }
  }

  async function copiarChave() {
    if (!configuracao) return;

    try {
      await navigator.clipboard.writeText(configuracao.segredo);
      toast.success("Chave copiada. Cole no aplicativo autenticador.");
    } catch {
      toast.error("Não foi possível copiar. Selecione a chave e copie à mão.");
    }
  }

  if (fase === "codigos") {
    return (
      <section aria-labelledby="titulo-codigos" className="space-y-4">
        <h3 id="titulo-codigos" ref={tituloRef} tabIndex={-1} className="text-xl font-bold outline-none">
          Verificação em duas etapas ativada
        </h3>
        <p className="text-sm text-muted-foreground">
          Da próxima vez que você entrar, depois da senha o ACESSO vai pedir o código do aplicativo. Estes são os seus
          códigos de recuperação.
        </p>
        <CodigosDeRecuperacao codigos={codigosDeRecuperacao} aoConcluir={aoConcluir} />
      </section>
    );
  }

  if (fase === "inicio" || !configuracao) {
    return (
      <section aria-labelledby="titulo-inicio" className="space-y-4">
        <h3 id="titulo-inicio" ref={tituloRef} tabIndex={-1} className="text-xl font-bold outline-none">
          Ative a verificação em duas etapas
        </h3>
        <p className="text-sm text-muted-foreground">
          {introducao ??
            "Além da senha, você vai digitar um código de 6 números gerado por um aplicativo autenticador no seu celular, como o Google Authenticator ou o Microsoft Authenticator. Leva cerca de dois minutos."}
        </p>
        {erro && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {erro}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-12 text-base" onClick={comecar} disabled={carregando}>
            {carregando ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" /> Preparando…
              </>
            ) : (
              <>
                <Smartphone aria-hidden="true" /> Começar
              </>
            )}
          </Button>
          {aoCancelar && (
            <Button type="button" variant="ghost" className="min-h-12" onClick={aoCancelar} disabled={carregando}>
              Cancelar
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-configurando" className="space-y-5">
      <h3 id="titulo-configurando" ref={tituloRef} tabIndex={-1} className="text-xl font-bold outline-none">
        Conecte o aplicativo autenticador
      </h3>

      {configuracao.troca && (
        <p className="text-sm text-muted-foreground">
          Ao confirmar, o aparelho antigo deixa de funcionar e os seus códigos de recuperação são refeitos.
        </p>
      )}

      <ol className="list-decimal space-y-5 pl-5 text-sm">
        <li className="space-y-2 pl-1">
          <p>
            Abra o aplicativo autenticador no celular e escolha adicionar uma conta. Se ainda não tem um, instale o
            Google Authenticator ou o Microsoft Authenticator.
          </p>
        </li>

        <li className="space-y-3 pl-1">
          <p>Leia o QR code com o aplicativo, ou digite a chave abaixo.</p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {qr && (
              <img
                src={qr}
                width={224}
                height={224}
                alt="QR code para o aplicativo autenticador. Se você não consegue ler imagens, use a chave ao lado."
                className="rounded-md border bg-white p-1"
              />
            )}

            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chave de configuração</p>
              <p
                data-testid="chave-totp"
                className="break-all rounded-md border bg-muted px-3 py-2 font-mono text-base tracking-wider"
              >
                {configuracao.segredoAgrupado}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="min-h-11" onClick={copiarChave}>
                  <Copy aria-hidden="true" /> Copiar chave
                </Button>
                <Button asChild variant="outline" className="min-h-11">
                  <a href={configuracao.uri}>Abrir no aplicativo</a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O tipo da chave é por tempo, com 6 dígitos. O nome da conta que aparece no aplicativo é o seu e-mail.
              </p>
            </div>
          </div>
        </li>

        <li className="pl-1">
          <form onSubmit={confirmar} className="space-y-3" noValidate>
            <CampoCodigo
              id="codigo-ativacao"
              rotulo="Código de 6 números do aplicativo"
              valor={codigo}
              aoMudar={(valor) => {
                setCodigo(valor);
                setErro(undefined);
              }}
              erro={erro}
              ajuda="O código muda a cada 30 segundos. Digite o que estiver aparecendo agora."
              desabilitado={carregando}
              refInput={campoRef}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="min-h-12 text-base" disabled={carregando}>
                {carregando ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> Verificando…
                  </>
                ) : (
                  "Confirmar e ativar"
                )}
              </Button>
              {aoCancelar && (
                <Button type="button" variant="ghost" className="min-h-12" onClick={aoCancelar} disabled={carregando}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </li>
      </ol>
    </section>
  );
}
