import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

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
import { useSession } from "@/contexts/SessionContext";
import { useSpeech } from "@/contexts/SpeechContext";

/** Troca de e-mail: senha atual + novo e-mail, depois confirma com o código enviado ao novo endereço. */
export function SecaoTrocarEmail() {
  const { user, update } = useSession();
  const { speak, choice } = useSpeech();
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<"pedido" | "confirmar">("pedido");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [codigo, setCodigo] = useState("");

  function reiniciar() {
    setEtapa("pedido");
    setSenhaAtual("");
    setNovoEmail("");
    setCodigo("");
  }

  const solicitar = useMutation({
    mutationFn: () => authService.solicitarTrocaEmail(senhaAtual, novoEmail),
    onSuccess: () => {
      toast.success("Código enviado para o novo e-mail.");
      setEtapa("confirmar");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível solicitar a troca de e-mail.")),
  });

  const confirmar = useMutation({
    mutationFn: () => authService.confirmarTrocaEmail(codigo),
    onSuccess: (usuarioAtualizado) => {
      update({ email: usuarioAtualizado.email });
      toast.success("E-mail atualizado com sucesso.");
      if (choice === "accepted") {
        speak("E-mail atualizado com sucesso.");
      }
      setAberto(false);
      reiniciar();
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, "Código inválido. Tente novamente."));
      setCodigo("");
    },
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">E-mail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          E-mail atual: <span className="font-medium text-foreground">{user?.email}</span>
        </p>

        <Dialog
          open={aberto}
          onOpenChange={(valor) => {
            setAberto(valor);
            if (!valor) reiniciar();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="min-h-11 gap-2">
              <Mail className="size-4" aria-hidden="true" /> Alterar e-mail
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            {etapa === "pedido" ? (
              <>
                <DialogHeader>
                  <DialogTitle>Alterar e-mail</DialogTitle>
                  <DialogDescription>
                    Confirme sua senha e informe o novo e-mail. Vamos enviar um código de confirmação para lá.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    solicitar.mutate();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="senha-trocar-email">Senha atual</Label>
                    <Input
                      id="senha-trocar-email"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={senhaAtual}
                      onChange={(evento) => setSenhaAtual(evento.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="novo-email">Novo e-mail</Label>
                    <Input
                      id="novo-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={novoEmail}
                      onChange={(evento) => setNovoEmail(evento.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={solicitar.isPending || !senhaAtual || !novoEmail}
                      className="min-h-11 gap-2"
                    >
                      {solicitar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                      Enviar código
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Confirme o novo e-mail</DialogTitle>
                  <DialogDescription>Digite o código de 6 dígitos enviado para {novoEmail}.</DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    confirmar.mutate();
                  }}
                >
                  <Label htmlFor="codigo-trocar-email">Código de confirmação</Label>
                  <InputOTP id="codigo-trocar-email" maxLength={6} value={codigo} onChange={setCodigo}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setEtapa("pedido")}>
                      Voltar
                    </Button>
                    <Button type="submit" disabled={confirmar.isPending || codigo.length !== 6} className="min-h-11 gap-2">
                      {confirmar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                      Confirmar
                    </Button>
                  </DialogFooter>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
