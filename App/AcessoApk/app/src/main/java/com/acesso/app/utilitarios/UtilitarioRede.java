package com.acesso.app.utilitarios;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;

public final class UtilitarioRede {

    private UtilitarioRede() {
    }

    public static boolean estaConectado(Context contexto) {
        ConnectivityManager gerenciador =
                (ConnectivityManager) contexto.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (gerenciador == null) {
            return false;
        }
        Network rede = gerenciador.getActiveNetwork();
        if (rede == null) {
            return false;
        }
        NetworkCapabilities recursos = gerenciador.getNetworkCapabilities(rede);
        return recursos != null
                && recursos.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }
}
