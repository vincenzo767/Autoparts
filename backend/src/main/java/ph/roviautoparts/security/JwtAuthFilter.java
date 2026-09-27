package ph.roviautoparts.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

/**
 * Authenticates each request from the RA_SESSION cookie (or, on /ws only, a ?ticket=).
 * The token version must match the user's current version, so revocation takes effect on the next request.
 */
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final AuthStateCache states;
    private final AuthCookies cookies;

    public JwtAuthFilter(JwtService jwt, AuthStateCache states, AuthCookies cookies) {
        this.jwt = jwt;
        this.states = states;
        this.cookies = cookies;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        boolean wsPath = path.equals("/ws") || path.startsWith("/ws/");
        Claims claims = null;
        boolean fromCookie = false;

        String ticket = wsPath ? request.getParameter("ticket") : null;
        if (ticket != null) {
            claims = jwt.parseTicket(ticket);
        } else {
            claims = jwt.parseSession(AuthCookies.read(request));
            fromCookie = claims != null;
        }

        if (claims != null) {
            authenticate(request, response, claims, fromCookie, path);
        }
        chain.doFilter(request, response);
    }

    private void authenticate(HttpServletRequest request, HttpServletResponse response, Claims claims,
                              boolean fromCookie, String path) {
        Long id;
        try {
            id = Long.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            return;
        }
        Integer ver = claims.get("ver", Integer.class);
        AuthStateCache.AuthState state = states.get(id);
        if (state == null || !state.enabled() || ver == null || ver != state.tokenVersion()) return;

        AuthUser principal = new AuthUser(state.id(), state.email(), state.role(), state.tokenVersion());
        var auth = new UsernamePasswordAuthenticationToken(principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + state.role().name())));
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);

        // Sliding session: refresh once the token is past half its lifetime.
        if (fromCookie && !path.equals("/api/auth/logout")) {
            Instant issued = claims.getIssuedAt().toInstant();
            Instant expires = claims.getExpiration().toInstant();
            Instant halfway = issued.plus(java.time.Duration.between(issued, expires).dividedBy(2));
            if (Instant.now().isAfter(halfway)) {
                cookies.issue(response, state.id(), state.tokenVersion());
            }
        }
    }
}
