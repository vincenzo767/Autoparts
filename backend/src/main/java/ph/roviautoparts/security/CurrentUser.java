package ph.roviautoparts.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import ph.roviautoparts.model.User;
import ph.roviautoparts.repo.UserRepository;
import ph.roviautoparts.web.ApiException;

@Component
public class CurrentUser {
    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    /** The signed-in principal, or null. */
    public static AuthUser principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AuthUser u ? u : null;
    }

    public AuthUser require() {
        AuthUser u = principal();
        if (u == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in to continue.");
        return u;
    }

    public Long id() {
        return require().id();
    }

    public User load() {
        return users.findById(id()).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in to continue."));
    }

    public boolean isAdmin() {
        AuthUser u = principal();
        return u != null && u.isAdmin();
    }
}
