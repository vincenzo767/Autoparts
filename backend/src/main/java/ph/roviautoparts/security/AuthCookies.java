package ph.roviautoparts.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import ph.roviautoparts.model.User;

import java.time.Duration;

@Component
public class AuthCookies {
    public static final String SESSION_COOKIE = "RA_SESSION";

    private final JwtService jwt;
    private final boolean secure;

    public AuthCookies(JwtService jwt, @Value("${app.cookie.secure:false}") boolean secure) {
        this.jwt = jwt;
        this.secure = secure;
    }

    public void issue(HttpServletResponse response, User user) {
        write(response, jwt.issueSession(user), jwt.ttl());
    }

    public void issue(HttpServletResponse response, Long userId, int tokenVersion) {
        write(response, jwt.issueSession(userId, tokenVersion), jwt.ttl());
    }

    public void clear(HttpServletResponse response) {
        write(response, "", Duration.ZERO);
    }

    private void write(HttpServletResponse response, String value, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(SESSION_COOKIE, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public static String read(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (var c : request.getCookies()) {
            if (SESSION_COOKIE.equals(c.getName())) return c.getValue();
        }
        return null;
    }
}
