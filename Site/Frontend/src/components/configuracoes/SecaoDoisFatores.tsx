import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { extrairMensagemErro } from "@/services/api";
import { authService } from "@/services/auth.service";
import { useSpeech } from "@/contexts/SpeechContext";
import type { AtivacaoDoisFatores } from "@/types";

const CHAVE_STATUS = ["seguranca", "2fa-status"] as const;

/** Diálogo de ativação: confirma a senha, depois mostra o QR/segredo e pede o código de confirmação. */
function AtivarDoisFatoresDialog({ onAtivado }: { onAtivado: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<"senha" | "configurar">("senha");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [codigo, setCodigo] = useState("");
  const [dadosAtivacao, setDadosAtivacao] = useState<AtivacaoDoisFatores | null>(null);
  const [copiado, setCopiado] = useState(false);
  const { speak, choice } = useSpeech();

  function reiniciar() {
    setEtapa("senha");
    setSenhaAtual("");
    setCodigo("");
    setDadosAtivacao(null);
    setCopiado(false);
  }

  const iniciar = useMutation({
    mutationFn: () => authService.iniciar2FA(senhaAtual),
    onSuccess: (dados) => {
      setDadosAtivacao(dados);
      setEtapa("configurar");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível confirmar sua senha.")),
  });

  const confirmar = useMutation({
    mutationFn: () => authService.confirmar2FA(codigo),
    onSuccess: () => {
      toast.success("Autenticação de dois fatores ativada.");
      if (choice === "accepted") {
        speak("Autenticação de dois fatores ativada.");
      }
      setAberto(false);
      reiniciar();
      onAtivado();
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, "Código inválido. Tente novamente."));
      setCodigo("");
    },
  });

  async function copiarSegredo() {
    if (!dadosAtivacao) return;
    try {
      await navigator.clipboard.writeText(dadosAtivacao.segredo);
      setCopiado(true);
      toast.success("Segredo copiado.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        setAberto(valor);
        if (!valor) reiniciar();
      }}
    >
      <DialogTrigger asChild>
        <Button className="min-h-11 gap-2">
          <ShieldCheck className="size-4" aria-hidden="true" /> Ativar autenticação de dois fatores
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {etapa === "senha" ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirme sua senha</DialogTitle>
              <DialogDescription>
                Por segurança, confirme sua senha atual antes de ativar a autenticação de dois fatores.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(evento) => {
                evento.preventDefault();
                iniciar.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="senha-2fa-ativar">Senha atual</Label>
                <Input
                  id="senha-2fa-ativar"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senhaAtual}
                  onChange={(evento) => setSenhaAtual(evento.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={iniciar.isPending || !senhaAtual} className="min-h-11 gap-2">
                  {iniciar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  Continuar
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : dadosAtivacao ? (
          <>
            <DialogHeader>
              <DialogTitle>Configurar aplicativo autenticador</DialogTitle>
              <DialogDescription>
                Escaneie o QR code com um app como Google Authenticator ou Authy — ou digite o código manualmente.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-3">
              <img
                src={dadosAtivacao.qrCodeDataUrl}
                alt="QR code para configurar a autenticação de dois fatores no aplicativo autenticador"
                className="size-48 rounded-lg border p-2"
              />
              <div className="flex w-full items-center gap-2">
                <Label htmlFor="segredo-2fa" className="sr-only">
                  Código para digitação manual
                </Label>
                <Input id="segredo-2fa" readOnly value={dadosAtivacao.segredo} className="font-mono text-sm" />
                <Button type="button" size="icon" variant="outline" onClick={copiarSegredo} aria-label="Copiar código">
                  {copiado ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                </Button>
              </div>
            </div>

            <form
              className="space-y-2"
              onSubmit={(evento) => {
                evento.preventDefault();
                confirmar.mutate();
              }}
            >
              <Label htmlFor="codigo-2fa-confirmar">Digite o código gerado pelo app</Label>
              <InputOTP id="codigo-2fa-confirmar" maxLength={6} value={codigo} onChange={setCodigo}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={confirmar.isPending || codigo.length !== 6} className="min-h-11 gap-2">
                  {confirmar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  Confirmar e ativar
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Diálogo de desativação: exige confirmar a senha antes de desligar o 2FA. */
function DesativarDoisFatoresDialog({ onDesativado }: { onDesativado: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const { speak, choice } = useSpeech();

  const desativar = useMutation({
    mutationFn: () => authService.desativar2FA(senhaAtual),
    onSuccess: () => {
      toast.success("Autenticação de dois fatores desativada.");
      if (choice === "accepted") {
        speak("Autenticação de dois fatores desativada.");
      }
      setAberto(false);
      setSenhaAtual("");
      onDesativado();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível confirmar sua senha.")),
  });

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        setAberto(valor);
        if (!valor) setSenhaAtual("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-11 gap-2 text-destructive hover:text-destructive">
          <ShieldOff className="size-4" aria-hidden="true" /> Desativar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desativar autenticação de dois fatores?</DialogTitle>
          <DialogDescription>
            Sua conta ficará protegida só por senha. Confirme sua senha atual para continuar.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            desativar.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="senha-2fa-desativar">Senha atual</Label>
            <Input
              id="senha-2fa-desativar"
              type="password"
              autoComplete="current-password"
              required
              value={senhaAtual}
              onChange={(evento) => setSenhaAtual(evento.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={desativar.isPending || !senhaAtual}
              className="min-h-11 gap-2"
            >
              {desativar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Desativar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Seção "Autenticação de dois fatores" da página Configurações → Segurança. */
export function SecaoDoisFatores() {
  const queryClient = useQueryClient();

  const { data: status, isLoading, isError, refetch } = useQuery({
    queryKey: CHAVE_STATUS,
    queryFn: () => authService.status2FA(),
  });

  const atualizarStatus = () => queryClient.invalidateQueries({ queryKey: CHAVE_STATUS });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Autenticação de dois fatores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          A autenticação de dois fatores adiciona uma camada extra de segurança à sua conta: além da senha, você
          precisa de um código gerado por um aplicativo autenticador (como Google Authenticator ou Authy) para
          entrar.
        </p>

        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando status…
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>Não foi possível carregar o status da autenticação de dois fatores.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={status?.ativado ? "default" : "outline"} className="font-medium">
                {status?.ativado ? "Ativada" : "Desativada"}
              </Badge>
            </div>

            {status?.ativado ? (
              <DesativarDoisFatoresDialog onDesativado={atualizarStatus} />
            ) : (
              <AtivarDoisFatoresDialog onAtivado={atualizarStatus} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
