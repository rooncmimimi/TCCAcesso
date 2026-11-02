# APK do app ACESSO (Android)

| | |
|---|---|
| Arquivo | `Acesso-Android.apk` |
| Versão | 1.0 (versionCode 1) |
| Gerado em | 02/11/2026, a partir da `main` (código do app em `App/AcessoApk`) |
| Tipo | Release (sem depuração, sem minificação) |
| Android mínimo | 8.0 (API 26) |
| API usada | `https://acesso-backend.onrender.com/api` (a publicada) |
| SHA-256 do arquivo | `3a648269e5958621fd888eda2bb2f544c21868fd2d889fe68fcba78003a6ac94` |

## Como instalar

1. Copie o `Acesso-Android.apk` para o celular (ou baixe pelo GitHub no próprio celular).
2. Abra o arquivo e permita a instalação de "fontes desconhecidas" quando o Android pedir.
3. Se uma versão anterior do ACESSO assinada com outra chave estiver instalada, desinstale-a antes.

A primeira tela pode demorar até um minuto para carregar dados: o servidor gratuito da API "acorda"
na primeira chamada.

## Assinatura

O APK está assinado com uma **chave de desenvolvimento** (certificado "Android Debug"). Ele instala em
qualquer celular Android, mas **não serve para publicar na Play Store**. Para publicar, a equipe
precisa criar uma chave de assinatura própria (guardada fora do Git) e gerar o APK/AAB com ela.

## Como gerar de novo

Dentro de `App/AcessoApk`:

```bash
./gradlew testDebugUnitTest lintRelease assembleRelease
```

O Gradle gera `app/build/outputs/apk/release/app-release-unsigned.apk`; assine com `apksigner` (Android
SDK build-tools) antes de copiar para esta pasta. Não coloque arquivos de chave (`.jks`, `.keystore`)
nem senhas no repositório.
