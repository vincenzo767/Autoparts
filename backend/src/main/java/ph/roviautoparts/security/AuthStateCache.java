package ph.roviautoparts.security;

import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ph.roviautoparts.model.Role;
import ph.roviautoparts.repo.UserRepository;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Short-lived cache of the fields the auth filter checks on every request.
 * Any change that must revoke sessions calls {@link #evict(Long)}.
 */
@Component
public class AuthStateCache {
    public record AuthState(Long id, String email, Role role, boolean enabled, int tokenVersion) {}

    private record Entry(AuthState state, Instant loadedAt) {}

    private static final Duration TTL = Duration.ofSeconds(60);
    private static final int MAX_ENTRIES = 10_000;

    private final Map<Long, Entry> cache = new ConcurrentHashMap<>();
    private final UserRepository users;

    public AuthStateCache(UserRepository users) {
        this.users = users;
    }

    public AuthState get(Long id) {
        Entry e = cache.get(id);
        if (e != null && e.loadedAt().plus(TTL).isAfter(Instant.now())) return e.state();
        AuthState state = users.findById(id)
                .map(u -> new AuthState(u.getId(), u.getEmail(), u.getRole(), u.isEnabled(), u.getTokenVersion()))
                .orElse(null);
        if (state == null) {
            cache.remove(id);
            return null;
        }
        if (cache.size() >= MAX_ENTRIES) cache.clear();
        cache.put(id, new Entry(state, Instant.now()));
        return state;
    }

    /** Evicts now, and again after the surrounding transaction commits. */
    public void evict(Long id) {
        cache.remove(id);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    cache.remove(id);
                }
            });
        }
    }
}
