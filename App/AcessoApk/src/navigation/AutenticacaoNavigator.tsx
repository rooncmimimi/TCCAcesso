import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RecuperarSenhaScreen } from "../screens/autenticacao/RecuperarSenhaScreen";
import { EntrarScreen } from "../screens/autenticacao/EntrarScreen";
import { CadastroScreen } from "../screens/autenticacao/CadastroScreen";
import { RedefinirSenhaScreen } from "../screens/autenticacao/RedefinirSenhaScreen";
import type { AutenticacaoStackParamList } from "./types";

const Stack = createNativeStackNavigator<AutenticacaoStackParamList>();

/**
 * As telas em si (`EntrarScreen`/`RecuperarSenhaScreen`/`RedefinirSenhaScreen`/
 * `CadastroScreen`) recebem callbacks simples (`onVoltar`, `onTenhoCodigo`,
 * etc.), não `navigation`/`route` diretamente; as funções abaixo só adaptam
 * esses callbacks para chamadas reais de navegação, mantendo as telas
 * desacopladas do React Navigation (o que já as deixava fáceis de testar
 * isoladamente).
 */
function LoginRoute({ navigation, route }: NativeStackScreenProps<AutenticacaoStackParamList, "Login">) {
  return (
    <EntrarScreen
      onEsqueciSenha={() => navigation.navigate("ForgotPassword")}
      onCriarConta={() => navigation.navigate("Register")}
      emailInicial={route.params?.email}
    />
  );
}

function RegisterRoute({ navigation }: NativeStackScreenProps<AutenticacaoStackParamList, "Register">) {
  return (
    <CadastroScreen
      onVoltarParaLogin={(emailConfirmado) => navigation.navigate("Login", { email: emailConfirmado })}
    />
  );
}

function ForgotPasswordRoute({ navigation }: NativeStackScreenProps<AutenticacaoStackParamList, "ForgotPassword">) {
  return (
    <RecuperarSenhaScreen
      onVoltar={() => navigation.navigate("Login")}
      onTenhoCodigo={(email) => navigation.navigate("ResetPassword", { email })}
    />
  );
}

function ResetPasswordRoute({ navigation, route }: NativeStackScreenProps<AutenticacaoStackParamList, "ResetPassword">) {
  return (
    <RedefinirSenhaScreen
      emailInicial={route.params?.email ?? ""}
      onVoltar={() => navigation.navigate("Login")}
      onConcluido={() => navigation.navigate("Login")}
    />
  );
}

/** Pilha das telas de entrada: login, recuperação e redefinição de senha e cadastro. */
export function AutenticacaoNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginRoute} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordRoute} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordRoute} />
      <Stack.Screen name="Register" component={RegisterRoute} />
    </Stack.Navigator>
  );
}
