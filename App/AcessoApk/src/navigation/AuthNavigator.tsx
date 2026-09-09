import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * As telas em si (`LoginScreen`/`ForgotPasswordScreen`/`ResetPasswordScreen`)
 * são exatamente as da Fase 3, sem nenhuma alteração — inclusive os testes
 * delas continuam passando exatamente como estavam. Elas recebem callbacks
 * simples (`onVoltar`, `onTenhoCodigo`, etc.), não `navigation`/`route`
 * diretamente; as três funções abaixo só adaptam esses callbacks para
 * chamadas reais de navegação, mantendo as telas desacopladas do React
 * Navigation (o que já as deixava fáceis de testar isoladamente).
 */
function LoginRoute({ navigation }: NativeStackScreenProps<AuthStackParamList, "Login">) {
  return <LoginScreen onEsqueciSenha={() => navigation.navigate("ForgotPassword")} />;
}

function ForgotPasswordRoute({ navigation }: NativeStackScreenProps<AuthStackParamList, "ForgotPassword">) {
  return (
    <ForgotPasswordScreen
      onVoltar={() => navigation.navigate("Login")}
      onTenhoCodigo={(email) => navigation.navigate("ResetPassword", { email })}
    />
  );
}

function ResetPasswordRoute({ navigation, route }: NativeStackScreenProps<AuthStackParamList, "ResetPassword">) {
  return (
    <ResetPasswordScreen
      emailInicial={route.params?.email ?? ""}
      onVoltar={() => navigation.navigate("Login")}
      onConcluido={() => navigation.navigate("Login")}
    />
  );
}

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginRoute} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordRoute} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordRoute} />
    </Stack.Navigator>
  );
}
