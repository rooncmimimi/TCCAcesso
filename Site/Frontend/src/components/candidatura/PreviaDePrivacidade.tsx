import { CopiaCompartilhadaLista } from "@/components/candidatura/CopiaCompartilhada";
import type { PreviaDaCandidatura } from "@/types/adaptacoes";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * "O que a empresa receberá?": a prévia, montada pelo servidor com a MESMA função que grava a cópia,
 * então o que aparece aqui é exatamente o que será enviado. Separa os dados profissionais, o currículo
 * e as adaptações autorizadas, e diz o que nunca vai.
 */
export function PreviaDePrivacidade({ previa }: { previa: PreviaDaCandidatura }) {
  const { t } = useIdioma();
  const d = previa.dadosProfissionais;
  const local = [d.cidade, d.estado].filter(Boolean).join(" / ");

  return (
    <div className="space-y-5">
      <section aria-labelledby="previa-profissionais" className="space-y-2">
        <h3 id="previa-profissionais" className="text-sm font-bold">
          {t("candidatura.previaDePrivacidade.dadosProfissionais")}
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Nome: {d.nome ?? t("candidatura.previaDePrivacidade.naoInformado")}</li>
          <li>E-mail de contato: {d.emailDeContato ?? t("candidatura.previaDePrivacidade.naoInformado")}</li>
          <li>Título profissional: {d.tituloProfissional ?? t("candidatura.previaDePrivacidade.naoInformado")}</li>
          <li>Cidade e estado: {local || t("candidatura.previaDePrivacidade.naoInformado")}</li>
          <li>Escolaridade: {d.escolaridade ?? t("candidatura.previaDePrivacidade.naoInformada")}</li>
        </ul>
      </section>

      <section aria-labelledby="previa-curriculo" className="space-y-2">
        <h3 id="previa-curriculo" className="text-sm font-bold">
          {t("candidatura.previaDePrivacidade.curriculoEPerfil")}
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Currículo: {d.curriculo ?? t("candidatura.previaDePrivacidade.voceAindaNaoEnviouUmCurriculo")}</li>
          <li>Experiências: {d.experiencias}</li>
          <li>Formação: {d.formacoes}</li>
          <li>Habilidades: {d.habilidades}</li>
          <li>Sobre mim: {d.biografia ? "será mostrado" : t("candidatura.previaDePrivacidade.naoPreenchido")}</li>
        </ul>
      </section>

      <section aria-labelledby="previa-adaptacoes" className="space-y-2 rounded-lg border-2 border-primary/40 bg-primary-soft/40 p-3">
        <h3 id="previa-adaptacoes" className="text-sm font-bold">
          Adaptações que você autorizou ({previa.adaptacoes.total})
        </h3>
        <CopiaCompartilhadaLista itens={previa.adaptacoes.itens} />
      </section>

      <section aria-labelledby="previa-nao" className="space-y-2">
        <h3 id="previa-nao" className="text-sm font-bold">
          {t("candidatura.previaDePrivacidade.oQueNaoSeraCompartilhado")}
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {previa.naoCompartilhado.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
