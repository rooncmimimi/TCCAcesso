import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";

import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";
import { useSessao } from "@/hooks/useSessao";
import { esquecerDispositivoConfiavel, obterRefreshToken } from "@/services/api";
import segurancaService, { mensagemDeErroSeguranca } from "@/services/seguranca.service";
import { useEstadoDaSeguranca } from "@/hooks/useEstadoDaSeguranca";

/**
 * "Acho que invadiram minha conta", para quem ainda está logado: encerra as OUTRAS sessões, remove a confiança nos
 * dispositivos e leva à troca de senha. Pede a senha atual (um aparelho esquecido logado não pode usar isto). Só aparece com o
 * recurso ligado.
 */
export function SecaoContaComprometida() {
  const { usuario } = useSessao();
  const { data: estado } = useEstadoDaSeguranca();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  if (!estado?.habilitado) return null;

  const pedeSenha = usuario?.temSenha !== false;

  function abrir() {
    setSenha("");
    setErro(undefined);
    setAberto(true);
  }

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviandoRef.current) return;

    if (pedeSenha && !senha) {
      setErro("Informe a sua senha atual.");
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErro(undefined);

    try {
      await segurancaService.protegerAgora(pedeSenha ? senha : undefined, obterRefreshToken());
      esquecerDispositivoConfiavel();
      void queryClient.invalidateQueries({ queryKey: ["seguranca"] });
      setAberto(false);
      toast.success("Conta protegida. Troque a sua senha agora.");
      void navigate({ to: "/configuracoes/senha" });
    } catch (falha) {
      setErro(mensagemDeErroSeguranca(falha, "Não foi possível proteger a conta agora."));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <Card className="border-destructive/40 shadow-none">
      <CardHeader className="space-y-1.5">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="size-5 text-destructive" aria-hidden="true" /> Acho que invadiram minha conta
        </CardTitle>
        <CardDescription>
          Encerra as outras sessões, remove a confiança nos dispositivos e leva você a criar uma nova senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="destructive" className="min-h-11" onClick={abrir}>
          Proteger minha conta agora
        </Button>
      </CardContent>

      <Dialog open={aberto} onOpenChange={(valor) => !valor && !enviando && setAberto(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proteger a conta agora?</DialogTitle>
            <DialogDescription>
              Todos os outros dispositivos perdem o acesso na hora e precisarão do código enviado por e-mail para entrar. Esta sessão continua, e a
              próxima etapa é trocar a senha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={confirmar} className="space-y-4" noValidate>
            {pedeSenha && (
              <Campo id="proteger-senha" rotulo="Senha atual" erro={erro}>
                <PasswordInput
                  id="proteger-senha"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(evento) => {
                    setSenha(evento.target.value);
                    setErro(undefined);
                  }}
                  disabled={enviando}
                  aria-invalid={Boolean(erro)}
                  aria-describedby={descricao("proteger-senha", false, Boolean(erro))}
                />
              </Campo>
            )}
            {!pedeSenha && erro && (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => setAberto(false)} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" className="min-h-11" disabled={enviando}>
                {enviando ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> Protegendo…
                  </>
                ) : (
                  "Proteger a conta"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
