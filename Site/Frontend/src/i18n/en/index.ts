import type { Dicionario } from "../dicionario";
import { auth } from "./auth";
import { boasVindas } from "./boasVindas";
import { busca } from "./busca";
import { cadastro } from "./cadastro";
import { cidade } from "./cidade";
import { comum } from "./comum";
import { erros } from "./erros";
import { inicio } from "./inicio";
import { layout } from "./layout";
import { sobre } from "./sobre";
import { status } from "./status";
import { vagas } from "./vagas";
import { validacao } from "./validacao";

export const en: Dicionario = { auth, boasVindas, busca, cadastro, cidade, comum, erros, inicio, layout, sobre, status, vagas, validacao };
