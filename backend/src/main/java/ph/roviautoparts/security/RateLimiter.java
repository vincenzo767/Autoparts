package ph.roviautoparts.security;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Fixed-window, in-memory rate limiter keyed by bucket and client (usually an IP address). */
@Component
public class RateLimiter {
    private static final class Window {
        Instant start;
        int count;

        Window(Instant start) { this.start = start; }
    }

    private static final int MAX_KEYS = 20_000;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** Returns true if the call is allowed, false if the limit for this window is used up. */
    public boolean tryAcquire(String bucket, String client, int limit, Duration window) {
        Instant now = Instant.now();
        if (windows.size() > MAX_KEYS) {
            windows.values().removeIf(w -> w.start.plus(Duration.ofHours(1)).isBefore(now));
        }
        Window w = windows.compute(bucket + ":" + client, (k, existing) ->
                existing == null || existing.start.plus(window).isBefore(now) ? new Window(now) : existing);
        synchronized (w) {
            if (w.count >= limit) return false;
            w.count++;
            return true;
        }
    }
}
