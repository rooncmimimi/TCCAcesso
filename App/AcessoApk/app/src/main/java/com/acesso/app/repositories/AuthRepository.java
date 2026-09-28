package com.acesso.app.repositories;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.acesso.app.models.AuthSession;
import com.acesso.app.models.SignUpResult;
import com.acesso.app.services.SupabaseClient;
import com.acesso.app.services.SupabaseErrorMapper;
import com.acesso.app.utils.NetworkUtils;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Toda a comunicação com o Supabase Auth: entrar, criar conta, recuperar
 * senha, renovar a sessão e sair. As telas não chamam o Supabase direto.
 */
public class AuthRepository {

    /** Endereço que o link do e-mail de recuperação abre no aparelho (ver AndroidManifest). */
    public static final String PASSWORD_RESET_REDIRECT = "acesso://redefinir-senha";

    private final Context context;
    private final Handler mainThread = new Handler(Looper.getMainLooper());

    public AuthRepository(Context context) {
        this.context = context.getApplicationContext();
    }

    public void signIn(String email, String password, RepositoryCallback<AuthSession> callback) {
        JsonObject body = new JsonObject();
        body.addProperty("email", email.trim());
        body.addProperty("password", password);

        Request request = SupabaseClient.request(SupabaseClient.authUrl("token?grant_type=password"))
                .post(RequestBody.create(body.toString(), SupabaseClient.JSON))
                .build();

        execute(request, callback, json -> parseSession(json));
    }

    /**
     * Cria a conta no Supabase Auth. Nome, cidade, data de nascimento e aceite dos
     * termos vão juntos em "data"; um gatilho no banco usa esses dados para criar
     * a linha em profiles com o mesmo UUID (ver supabase/001_profiles.sql).
     *
     * @param birthDateIso data no formato aaaa-mm-dd, ou null se não informada.
     */
    public void signUp(String name, String email, String password, String city,
                       String birthDateIso, RepositoryCallback<SignUpResult> callback) {
        JsonObject data = new JsonObject();
        data.addProperty("name", name.trim());
        data.addProperty("city", city.trim());
        if (birthDateIso != null) {
            data.addProperty("birth_date", birthDateIso);
        }
        data.addProperty("terms_accepted", true);

        JsonObject body = new JsonObject();
        body.addProperty("email", email.trim());
        body.addProperty("password", password);
        body.add("data", data);

        Request request = SupabaseClient.request(SupabaseClient.authUrl("signup"))
                .post(RequestBody.create(body.toString(), SupabaseClient.JSON))
                .build();

        execute(request, callback, json -> {
            if (json.has("access_token")) {
                return new SignUpResult(parseSession(json));
            }
            // Com a confirmação de e-mail ligada, o Supabase devolve só o usuário.
            // Se o e-mail já existe, ele devolve um usuário "falso" sem identities,
            // para não revelar quem tem conta; tratamos isso como e-mail já cadastrado.
            JsonArray identities = json.has("identities") && json.get("identities").isJsonArray()
                    ? json.getAsJsonArray("identities") : null;
            if (identities != null && identities.isEmpty()) {
                throw new FriendlyException(SupabaseErrorMapper.fromHttpError(422, "{\"error_code\":\"user_already_exists\"}"));
            }
            return new SignUpResult(null);
        });
    }

    public void sendPasswordReset(String email, RepositoryCallback<Void> callback) {
        JsonObject body = new JsonObject();
        body.addProperty("email", email.trim());

        Request request = SupabaseClient.request(
                        SupabaseClient.authUrl("recover?redirect_to=" + PASSWORD_RESET_REDIRECT))
                .post(RequestBody.create(body.toString(), SupabaseClient.JSON))
                .build();

        execute(request, callback, json -> null);
    }

    /** Troca a senha usando o token que veio no link de recuperação. */
    public void updatePassword(String accessToken, String newPassword, RepositoryCallback<Void> callback) {
        JsonObject body = new JsonObject();
        body.addProperty("password", newPassword);

        Request request = SupabaseClient.authenticatedRequest(SupabaseClient.authUrl("user"), accessToken)
                .put(RequestBody.create(body.toString(), SupabaseClient.JSON))
                .build();

        execute(request, callback, json -> null);
    }

    public void refreshSession(String refreshToken, RepositoryCallback<AuthSession> callback) {
        JsonObject body = new JsonObject();
        body.addProperty("refresh_token", refreshToken);

        Request request = SupabaseClient.request(SupabaseClient.authUrl("token?grant_type=refresh_token"))
                .post(RequestBody.create(body.toString(), SupabaseClient.JSON))
                .build();

        execute(request, callback, json -> parseSession(json));
    }

    /** Invalida a sessão no Supabase. Mesmo se falhar (ex.: sem internet), o app apaga a sessão local. */
    public void signOut(String accessToken) {
        Request request = SupabaseClient.authenticatedRequest(SupabaseClient.authUrl("logout"), accessToken)
                .post(RequestBody.create("{}", SupabaseClient.JSON))
                .build();
        SupabaseClient.http().newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
            }

            @Override
            public void onResponse(Call call, Response response) {
                response.close();
            }
        });
    }

    // ---------------------------------------------------------------------

    private interface ResponseParser<T> {
        T parse(JsonObject json);
    }

    /** Erro de regra de negócio cuja mensagem já está pronta para o usuário. */
    private static class FriendlyException extends RuntimeException {
        FriendlyException(String message) {
            super(message);
        }
    }

    private <T> void execute(Request request, RepositoryCallback<T> callback, ResponseParser<T> parser) {
        if (!SupabaseClient.isConfigured()) {
            postError(callback, "O app ainda não foi configurado com o Supabase. Veja o README.");
            return;
        }
        if (!NetworkUtils.isConnected(context)) {
            postError(callback, SupabaseErrorMapper.NO_INTERNET);
            return;
        }

        SupabaseClient.http().newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                postError(callback, SupabaseErrorMapper.SERVER_UNREACHABLE);
            }

            @Override
            public void onResponse(Call call, Response response) {
                try (ResponseBody responseBody = response.body()) {
                    String text = responseBody != null ? responseBody.string() : "";
                    if (!response.isSuccessful()) {
                        postError(callback, SupabaseErrorMapper.fromHttpError(response.code(), text));
                        return;
                    }
                    JsonObject json = text.isEmpty()
                            ? new JsonObject()
                            : JsonParser.parseString(text).getAsJsonObject();
                    T result = parser.parse(json);
                    mainThread.post(() -> callback.onSuccess(result));
                } catch (FriendlyException e) {
                    postError(callback, e.getMessage());
                } catch (IOException | RuntimeException e) {
                    postError(callback, SupabaseErrorMapper.GENERIC);
                }
            }
        });
    }

    private <T> void postError(RepositoryCallback<T> callback, String message) {
        mainThread.post(() -> callback.onError(message));
    }

    private static AuthSession parseSession(JsonObject json) {
        JsonObject user = json.getAsJsonObject("user");
        long expiresAtMillis = json.has("expires_at")
                ? json.get("expires_at").getAsLong() * 1000
                : System.currentTimeMillis() + json.get("expires_in").getAsLong() * 1000;
        return new AuthSession(
                user.get("id").getAsString(),
                user.has("email") && !user.get("email").isJsonNull() ? user.get("email").getAsString() : null,
                json.get("access_token").getAsString(),
                json.get("refresh_token").getAsString(),
                expiresAtMillis);
    }
}
