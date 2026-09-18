import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Avatar, Cartao } from "../../components/ui";
import type { Candidato } from "../../perfil";
import type { Tema } from "../../tema";

/**
 * Cabeçalho do perfil com nome, título profissional, localização e biografia, só para exibição. A
 * edição fica em "Dados pessoais", que por isso não repete esses campos.
 */
export function CabecalhoPerfil({ candidato, tema }: { candidato: Candidato; tema: Tema }) {
  const usuario = candidato.usuario;
  const localizacao = [candidato.cidade, candidato.estado].filter(Boolean).join(" - ");

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.sm, alignItems: "center" }}>
      <Avatar nome={usuario?.nome} fotoUrl={usuario?.fotoPerfil} size="xlarge" />
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text
          accessibilityRole="header"
          style={[tema.typography.heading, { color: tema.colors.textPrimary, textAlign: "center" }]}
        >
          {usuario?.nome}
        </Text>
        {candidato.tituloProfissional ? (
          <Text style={[tema.typography.body, { color: tema.colors.textSecondary, textAlign: "center" }]}>
            {candidato.tituloProfissional}
          </Text>
        ) : null}
        {localizacao ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Ionicons name="location-outline" size={tema.sizes.iconSmall} color={tema.colors.textMuted} />
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>{localizacao}</Text>
          </View>
        ) : null}
      </View>
      {candidato.biografia ? (
        <Text style={[tema.typography.body, { color: tema.colors.textSecondary, textAlign: "center" }]}>
          {candidato.biografia}
        </Text>
      ) : null}
    </Cartao>
  );
}
