package com.acesso.app.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.fragment.app.Fragment;

import com.acesso.app.R;
import com.acesso.app.activities.MainActivity;
import com.acesso.app.databinding.FragmentPlaceholderBinding;
import com.acesso.app.models.AuthSession;
import com.acesso.app.repositories.AuthRepository;
import com.acesso.app.utils.SessionManager;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/**
 * Conteúdo provisório das abas. Na aba Perfil também mostra o botão Sair,
 * que depois vai para a tela de Configurações.
 */
public class PlaceholderFragment extends Fragment {

    private static final String ARG_TITLE = "title";
    private static final String ARG_SHOW_LOGOUT = "show_logout";

    public static PlaceholderFragment newInstance(@StringRes int title, boolean showLogout) {
        Bundle args = new Bundle();
        args.putInt(ARG_TITLE, title);
        args.putBoolean(ARG_SHOW_LOGOUT, showLogout);
        PlaceholderFragment fragment = new PlaceholderFragment();
        fragment.setArguments(args);
        return fragment;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        FragmentPlaceholderBinding binding = FragmentPlaceholderBinding.inflate(inflater, container, false);
        Bundle args = requireArguments();
        binding.titleText.setText(args.getInt(ARG_TITLE));

        if (args.getBoolean(ARG_SHOW_LOGOUT)) {
            SessionManager sessionManager = new SessionManager(requireContext());
            AuthSession session = sessionManager.get();
            if (session != null && session.getEmail() != null) {
                binding.loggedInText.setText(getString(R.string.logged_in_as, session.getEmail()));
                binding.loggedInText.setVisibility(View.VISIBLE);
            }
            binding.logoutButton.setVisibility(View.VISIBLE);
            binding.logoutButton.setOnClickListener(v -> confirmLogout(sessionManager));
        }
        return binding.getRoot();
    }

    private void confirmLogout(SessionManager sessionManager) {
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.logout_confirm_title)
                .setMessage(R.string.logout_confirm_message)
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.action_logout, (dialog, which) -> {
                    AuthSession session = sessionManager.get();
                    if (session != null) {
                        new AuthRepository(requireContext()).signOut(session.getAccessToken());
                    }
                    sessionManager.clear();
                    ((MainActivity) requireActivity()).goToLogin();
                })
                .show();
    }
}
