package ph.roviautoparts.security;

import ph.roviautoparts.model.Role;

import java.security.Principal;

/** The authenticated principal. Its name is the user id, which STOMP uses for user destinations. */
public record AuthUser(Long id, String email, Role role, int tokenVersion) implements Principal {
    @Override
    public String getName() {
        return String.valueOf(id);
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
