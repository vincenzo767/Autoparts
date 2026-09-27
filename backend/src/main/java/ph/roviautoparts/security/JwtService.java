package ph.roviautoparts.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ph.roviautoparts.model.User;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Issues and verifies HS256 session tokens and short-lived WebSocket tickets.
 * A ticket is never accepted as a session, and a session is never accepted as a ticket.
 */
@Service
public class JwtService {
    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final String ISSUER = "roviautoparts";
    private static final String TYPE_CLAIM = "typ";
    private static final String WS_TYPE = "ws";
    private static final Duration TICKET_TTL = Duration.ofSeconds(60);

    private final SecretKey key;
    private final Duration ttl;

    public JwtService(@Value("${app.jwt.secret:}") String secret, @Value("${app.jwt.ttl-minutes:120}") long ttlMinutes) {
        byte[] bytes;
        if (secret == null || secret.isBlank()) {
            bytes = new byte[64];
            new SecureRandom().nextBytes(bytes);
            log.warn("JWT_SECRET is not set. Using a random key: sessions will not survive a restart. Set JWT_SECRET in production.");
        } else {
            bytes = secret.getBytes(StandardCharsets.UTF_8);
            if (bytes.length < 32) {
                throw new IllegalStateException("JWT_SECRET must be at least 32 bytes long.");
            }
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }

    public Duration ttl() { return ttl; }

    public String issueSession(User user) {
        return issueSession(user.getId(), user.getTokenVersion());
    }

    public String issueSession(Long userId, int tokenVersion) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(ISSUER)
                .subject(String.valueOf(userId))
                .claim("ver", tokenVersion)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public String issueWsTicket(Long userId, int tokenVersion) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(ISSUER)
                .subject(String.valueOf(userId))
                .claim("ver", tokenVersion)
                .claim(TYPE_CLAIM, WS_TYPE)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(TICKET_TTL)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /** Returns the claims of a valid session token, or null. */
    public Claims parseSession(String token) {
        Claims c = parse(token);
        return c != null && c.get(TYPE_CLAIM) == null ? c : null;
    }

    /** Returns the claims of a valid WebSocket ticket, or null. */
    public Claims parseTicket(String token) {
        Claims c = parse(token);
        return c != null && WS_TYPE.equals(c.get(TYPE_CLAIM)) ? c : null;
    }

    private Claims parse(String token) {
        if (token == null || token.isBlank() || token.length() > 2048) return null;
        try {
            return Jwts.parser().verifyWith(key).requireIssuer(ISSUER).build().parseSignedClaims(token).getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
