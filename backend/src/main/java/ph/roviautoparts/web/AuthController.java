package ph.roviautoparts.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.roviautoparts.dto.Dtos.*;
import ph.roviautoparts.model.Role;
import ph.roviautoparts.model.User;
import ph.roviautoparts.repo.UserRepository;
import ph.roviautoparts.security.*;
import ph.roviautoparts.service.ChatService;
import ph.roviautoparts.service.DataSeeder;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final String INVALID = "Invalid email or password.";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthCookies cookies;
    private final AuthStateCache states;
    private final JwtService jwt;
    private final RateLimiter limiter;
    private final ChatService chat;
    private final String dummyHash;

    @Value("${app.security.max-failed-logins:5}") private int maxFailed;
    @Value("${app.security.lock-minutes:15}") private int lockMinutes;
    @Value("${app.security.ip-login-attempts-per-15min:30}") private int ipLogins;
    @Value("${app.security.ip-registrations-per-hour:10}") private int ipRegistrations;

    public AuthController(UserRepository users, PasswordEncoder encoder, AuthCookies cookies, AuthStateCache states,
                          JwtService jwt, RateLimiter limiter, ChatService chat) {
        this.users = users;
        this.encoder = encoder;
        this.cookies = cookies;
        this.states = states;
        this.jwt = jwt;
        this.limiter = limiter;
        this.chat = chat;
        // Compared against for unknown emails so every attempt costs the same time.
        this.dummyHash = encoder.encode("dummy-password-for-timing");
    }

    @GetMapping("/session")
    public Map<String, Object> session() {
        AuthUser p = CurrentUser.principal();
        Map<String, Object> body = new LinkedHashMap<>();
        if (p == null) {
            body.put("authenticated", false);
            return body;
        }
        User u = users.findById(p.id()).orElse(null);
        body.put("authenticated", u != null);
        if (u != null) body.put("user", UserDto.of(u));
        return body;
    }

    @PostMapping("/login")
    public UserDto login(@Valid @RequestBody LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        if (!limiter.tryAcquire("login", request.getRemoteAddr(), ipLogins, Duration.ofMinutes(15))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many sign-in attempts. Please wait a few minutes and try again.");
        }
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        User user = users.findByEmail(email).orElse(null);
        if (user == null) {
            encoder.matches(req.password(), dummyHash);
            throw new ApiException(HttpStatus.UNAUTHORIZED, INVALID);
        }
        if (user.isLocked()) throw locked(user);

        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            int failed = user.getFailedLogins() + 1;
            if (failed >= maxFailed) {
                user.setFailedLogins(0);
                user.setLockedUntil(Instant.now().plus(Duration.ofMinutes(lockMinutes)));
                users.save(user);
                throw locked(user);
            }
            user.setFailedLogins(failed);
            users.save(user);
            int left = maxFailed - failed;
            String message = left <= 2
                    ? INVALID + " " + left + " attempt" + (left == 1 ? "" : "s") + " left before a temporary lock."
                    : INVALID;
            throw new ApiException(HttpStatus.UNAUTHORIZED, message);
        }
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account has been suspended. Please contact the shop.");
        }
        user.setFailedLogins(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        users.save(user);
        cookies.issue(response, user);
        return UserDto.of(user);
    }

    private ApiException locked(User user) {
        long minutes = Math.max(1, (Duration.between(Instant.now(), user.getLockedUntil()).toSeconds() + 59) / 60);
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "This account is temporarily locked after several failed attempts. Try again in "
                + minutes + " minute" + (minutes == 1 ? "" : "s") + ".");
    }

    @PostMapping("/register")
    @Transactional
    public UserDto register(@Valid @RequestBody RegisterRequest req, HttpServletRequest request, HttpServletResponse response) {
        if (!limiter.tryAcquire("register", request.getRemoteAddr(), ipRegistrations, Duration.ofHours(1))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many new accounts from this connection. Please try again later.");
        }
        if (req.website() != null && !req.website().isBlank()) {
            throw ApiException.badRequest("We couldn't create your account.");
        }
        String name = req.fullName().trim().replaceAll("\\s+", " ");
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        String local = email.substring(0, Math.max(0, email.indexOf('@')));
        if (local.length() >= 3 && req.password().toLowerCase(Locale.ROOT).contains(local)) {
            throw ApiException.badRequest("Your password shouldn't contain your email name.");
        }
        if (users.existsByEmail(email)) {
            throw ApiException.conflict("An account with this email already exists. Try signing in.");
        }
        User user = new User();
        user.setFullName(name);
        user.setEmail(email);
        user.setPasswordHash(encoder.encode(req.password()));
        user.setRole(Role.CUSTOMER); // never read from the request
        String phone = req.phone() == null ? null : req.phone().trim();
        user.setPhone(phone == null || phone.isEmpty() ? null : phone);
        user.setLastLoginAt(Instant.now());
        users.save(user);
        chat.postFromShop(user, null, DataSeeder.welcomeMessage(name));
        cookies.issue(response, user);
        return UserDto.of(user);
    }

    @GetMapping("/ws-ticket")
    public Map<String, String> wsTicket() {
        AuthUser p = CurrentUser.principal();
        if (p == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in to continue.");
        return Map.of("ticket", jwt.issueWsTicket(p.id(), p.tokenVersion()));
    }

    @PostMapping("/logout")
    @Transactional
    public Map<String, Boolean> logout(HttpServletResponse response) {
        AuthUser p = CurrentUser.principal();
        if (p != null) {
            users.findById(p.id()).ifPresent(u -> {
                u.setTokenVersion(u.getTokenVersion() + 1);
                states.evict(u.getId());
            });
        }
        cookies.clear(response);
        return Map.of("ok", true);
    }
}
