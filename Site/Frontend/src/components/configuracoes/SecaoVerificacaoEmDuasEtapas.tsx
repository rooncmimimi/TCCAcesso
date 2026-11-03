import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

import { CodigosDeRecuperacao } from "@/components/seguranca/CodigosDeRecuperacao";
import { ConfiguradorTotp } from "@/components/seguranca/ConfiguradorTotp";
import { DialogoReautenticacao } from "@/components/seguranca/DialogoReautenticacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessao } from "@/hooks/useSessao";
import totpService, { type ConfiguracaoTotp, type Reautenticacao } from "@/services/totp.service";

const CHAVE_TOTP = ["seguranca", "totp"] as const;

/** Abaixo disto o aviso de "poucos códigos" aparece. */
const POUCOS_CODIGOS = 3;

type Fluxo =
  | { tipo: "ativar" }
  | { tipo: "trocar"; configuracao: ConfiguracaoTotp }
  | { tipo: "codigos"; codigos: string[] };

type Dialogo = "codigos" | "trocar" | "desativar" | null;

/**
 * Configurações → Segurança → Verificação em duas etapas (aplicativo autenticador).
 *
 * - Obrigatória para administradores: aparece como tal e **não tem** o botão de desativar (o servidor também
 *   recusa). Para trocar de aparelho, refazem a configuração com a senha e um código.
 * - Opcional para candidatos e empresas: ativam e desativam à vontade (desativar pede senha e código).
 * - Some inteira quando o recurso está desligado no servidor, para não oferecer o que não funciona.
 */
export function SecaoVerificacaoEmDuasEtapas() {
  const { usuario, recarregar } = useSessao();
  const clienteQuery = useQueryClient();
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const { data: estado, isPending, isError } = useQuery({ queryKey: CHAVE_TOTP, queryFn: () => totpService.estado() });

  // Quem não tem senha (conta criada pelo Google) prova só com o código.
  const pedeSenha = usuario?.temSenha !== false;
  const obrigatoria = Boolean(estado?.mfaExigido);

  async function atualizar() {
    await clienteQuery.invalidateQueries({ queryKey: CHAVE_TOTP });
    await recarregar();
  }

  if (isPending) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6" role="status">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Carregando a verificação em duas etapas…</p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !estado) {
    return (
      <Card>
        <CardContent className="p-6">
          <p role="alert" className="text-sm font-medium text-destructive">
            Não foi possível carregar a verificação em duas etapas agora. Tente de novo em instantes.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!estado.mfaDisponivel) {
    return null;
  }

  async function aoConcluirConfiguracao() {
    setFluxo(null);
    await atualizar();
    toast.success("Verificação em duas etapas ativada.");
  }

  async function gerarCodigos(reautenticacao: Reautenticacao) {
    const codigos = await totpService.regenerarCodigos(reautenticacao);
    setDialogo(null);
    setFluxo({ tipo: "codigos", codigos });
    await clienteQuery.invalidateQueries({ queryKey: CHAVE_TOTP });
  }

  async function desativar(reautenticacao: Reautenticacao) {
    await totpService.desativar(reautenticacao);
    setDialogo(null);
    await atualizar();
    toast.success("Verificação em duas etapas desativada.");
  }

  async function iniciarTroca(reautenticacao: Reautenticacao) {
    // O servidor confere senha e código ao gerar a chave nova; se algo estiver errado, a chamada lança e o erro
    // aparece no próprio diálogo, que continua aberto.
    const configuracao = await totpService.iniciar(reautenticacao);
    setDialogo(null);
    setFluxo({ tipo: "trocar", configuracao });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <CardTitle className="text-lg">Verificação em duas etapas</CardTitle>
        </div>
        {estado.mfaConfigurado ? <Badge variant="default">Ativada</Badge> : <Badge variant="outline">Desativada</Badge>}
      </CardHeader>

      <CardContent className="space-y-4">
        {fluxo?.tipo === "ativar" && (
          <ConfiguradorTotp aoConcluir={aoConcluirConfiguracao} aoCancelar={() => setFluxo(null)} />
        )}

        {fluxo?.tipo === "trocar" && (
          <ConfiguradorTotp
            configuracaoInicial={fluxo.configuracao}
            aoConcluir={aoConcluirConfiguracao}
            aoCancelar={() => setFluxo(null)}
          />
        )}

        {fluxo?.tipo === "codigos" && (
          <section aria-labelledby="titulo-novos-codigos" className="space-y-4">
            <h3 id="titulo-novos-codigos" className="text-xl font-bold">
              Novos códigos de recuperação
            </h3>
            <p className="text-sm text-muted-foreground">Os códigos anteriores deixaram de valer.</p>
            <CodigosDeRecuperacao codigos={fluxo.codigos} aoConcluir={() => setFluxo(null)} />
          </section>
        )}

        {!fluxo && !estado.mfaConfigurado && (
          <>
            <p className="text-sm text-muted-foreground">
              Além da senha, você digita um código de 6 números gerado por um aplicativo autenticador no celular. Mesmo que
              alguém descubra a sua senha, não consegue entrar sem o código.
            </p>
            <Button type="button" className="min-h-11" onClick={() => setFluxo({ tipo: "ativar" })}>
              Ativar verificação em duas etapas
            </Button>
          </>
        )}

        {!fluxo && estado.mfaConfigurado && (
          <>
            <p className="text-sm text-muted-foreground">
              Ao entrar, depois da senha o ACESSO pede o código do aplicativo autenticador.
              {obrigatoria && " É obrigatória para administradores e não pode ser desativada."}
            </p>

            <p
              role={estado.codigosRestantes <= POUCOS_CODIGOS ? "status" : undefined}
              className={estado.codigosRestantes <= POUCOS_CODIGOS ? "text-sm font-semibold text-warning-foreground" : "text-sm"}
            >
              Códigos de recuperação restantes: <strong>{estado.codigosRestantes}</strong>
              {estado.codigosRestantes <= POUCOS_CODIGOS && " Restam poucos: gere novos para não ficar sem acesso."}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setDialogo("codigos")}>
                Gerar novos códigos de recuperação
              </Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setDialogo("trocar")}>
                Trocar de aparelho
              </Button>
              {!obrigatoria && (
                <Button type="button" variant="outline" className="min-h-11 text-destructive" onClick={() => setDialogo("desativar")}>
                  Desativar
                </Button>
              )}
            </div>

            {obrigatoria && (
              <p className="text-xs text-muted-foreground">
                Perdeu o aplicativo e os códigos de recuperação? Peça a outro administrador para reiniciar a sua verificação.
                Quem é o único administrador pede à equipe técnica, que reinicia pelo servidor.
              </p>
            )}
          </>
        )}
      </CardContent>

      <DialogoReautenticacao
        aberto={dialogo === "codigos"}
        titulo="Gerar novos códigos de recuperação"
        texto="Os códigos atuais deixam de valer. Confirme que é você."
        rotuloConfirmar="Gerar códigos"
        pedeSenha={pedeSenha}
        aoConfirmar={gerarCodigos}
        aoFechar={() => setDialogo(null)}
      />
      <DialogoReautenticacao
        aberto={dialogo === "trocar"}
        titulo="Trocar de aparelho"
        texto="Confirme que é você. Em seguida você conecta o aparelho novo, e o antigo deixa de funcionar."
        rotuloConfirmar="Continuar"
        pedeSenha={pedeSenha}
        aoConfirmar={iniciarTroca}
        aoFechar={() => setDialogo(null)}
      />
      <DialogoReautenticacao
        aberto={dialogo === "desativar"}
        titulo="Desativar a verificação em duas etapas"
        texto="Sua conta volta a pedir só a senha. Confirme que é você."
        rotuloConfirmar="Desativar"
        destrutivo
        pedeSenha={pedeSenha}
        aoConfirmar={desativar}
        aoFechar={() => setDialogo(null)}
      />
    </Card>
  );
}
