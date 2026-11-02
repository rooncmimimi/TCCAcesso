/**
 * Países (ISO 3166-1 alpha-2) e estados brasileiros aceitos pela API.
 *
 * O banco só confere o formato (`CHECK pais ~ '^[A-Z]{2}$'`) para um país novo não exigir migration;
 * quem confere que o código **existe** é a API, com esta lista. O Frontend tem a lista dos mesmos
 * códigos (com os nomes) em `dados/paises.ts`, e um teste garante que as duas não divergem.
 */

const CODIGOS_ISO_3166_1 = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO
JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR
MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO
RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV
TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`;

export const CODIGOS_DE_PAIS = new Set(CODIGOS_ISO_3166_1.split(/\s+/));

/** O código existe no ISO 3166-1 alpha-2? Aceita minúsculas (a API grava sempre em maiúsculas). */
export function ehCodigoDePais(codigo) {
    return CODIGOS_DE_PAIS.has(String(codigo ?? "").trim().toUpperCase());
}

const SIGLAS_DOS_ESTADOS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO";

/** As 26 UFs e o Distrito Federal. */
export const SIGLAS_DE_ESTADO = new Set(SIGLAS_DOS_ESTADOS.split(" "));

export function ehSiglaDeEstado(sigla) {
    return SIGLAS_DE_ESTADO.has(String(sigla ?? "").trim().toUpperCase());
}
