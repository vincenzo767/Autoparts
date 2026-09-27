package ph.roviautoparts.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import ph.roviautoparts.web.ApiException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.regex.Pattern;

/** Minimal client for Supabase Storage (public-read bucket for part photos and avatars). */
@Service
public class SupabaseStorage {
    private static final Logger log = LoggerFactory.getLogger(SupabaseStorage.class);
    private static final Pattern BUCKET = Pattern.compile("^[a-z0-9][a-z0-9_-]{1,62}$");

    private final String baseUrl;
    private final String key;
    private final String bucket;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public SupabaseStorage(@Value("${app.supabase.url:}") String url,
                           @Value("${app.supabase.secret-key:}") String key,
                           @Value("${app.supabase.bucket:parts}") String bucket) {
        String u = url == null ? "" : url.trim();
        while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
        this.baseUrl = u;
        this.key = key == null ? "" : key.trim();
        this.bucket = bucket == null || bucket.isBlank() ? "parts" : bucket.trim();
        if (enabled()) {
            boolean local = u.startsWith("http://localhost") || u.startsWith("http://127.0.0.1");
            if (!u.startsWith("https://") && !local) {
                throw new IllegalStateException("SUPABASE_URL must start with https://");
            }
            if (!BUCKET.matcher(this.bucket).matches()) {
                throw new IllegalStateException("SUPABASE_BUCKET must match " + BUCKET.pattern());
            }
        }
    }

    public boolean enabled() {
        return !baseUrl.isEmpty() && !key.isEmpty();
    }

    public String publicUrl(String name) {
        return baseUrl + "/storage/v1/object/public/" + bucket + "/" + name;
    }

    /** The object name if the URL points at our bucket, otherwise null. */
    public String nameFromPublicUrl(String url) {
        if (!enabled() || url == null) return null;
        String prefix = baseUrl + "/storage/v1/object/public/" + bucket + "/";
        if (!url.startsWith(prefix)) return null;
        String name = url.substring(prefix.length());
        return FileStorageService.SAFE_NAME.matcher(name).matches() ? name : null;
    }

    public String upload(String name, byte[] bytes, String contentType) {
        HttpRequest req = auth(HttpRequest.newBuilder(URI.create(baseUrl + "/storage/v1/object/" + bucket + "/" + name)))
                .header("Content-Type", contentType)
                .header("cache-control", "31536000")
                .header("x-upsert", "true")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofByteArray(bytes))
                .build();
        try {
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                log.warn("Supabase upload failed ({}): {}", res.statusCode(), res.body());
                throw new ApiException(HttpStatus.BAD_GATEWAY, "We couldn't save the image right now. Please try again.");
            }
            return publicUrl(name);
        } catch (IOException e) {
            log.warn("Supabase upload failed: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "We couldn't save the image right now. Please try again.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "We couldn't save the image right now. Please try again.");
        }
    }

    public void delete(String name) {
        HttpRequest req = auth(HttpRequest.newBuilder(URI.create(baseUrl + "/storage/v1/object/" + bucket + "/" + name)))
                .timeout(Duration.ofSeconds(15))
                .DELETE()
                .build();
        try {
            http.send(req, HttpResponse.BodyHandlers.discarding());
        } catch (IOException e) {
            log.warn("Supabase delete failed for {}: {}", name, e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /** Creates the public bucket (5 MB limit, images only) if it doesn't exist yet. */
    public void ensureBucket() throws IOException, InterruptedException {
        HttpRequest get = auth(HttpRequest.newBuilder(URI.create(baseUrl + "/storage/v1/bucket/" + bucket)))
                .timeout(Duration.ofSeconds(15)).GET().build();
        HttpResponse<String> res = http.send(get, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() / 100 == 2) return;
        String body = "{\"id\":\"" + bucket + "\",\"name\":\"" + bucket + "\",\"public\":true," +
                "\"file_size_limit\":5242880,\"allowed_mime_types\":[\"image/jpeg\",\"image/png\",\"image/webp\",\"image/gif\"]}";
        HttpRequest create = auth(HttpRequest.newBuilder(URI.create(baseUrl + "/storage/v1/bucket")))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> created = http.send(create, HttpResponse.BodyHandlers.ofString());
        if (created.statusCode() / 100 != 2 && !created.body().contains("already exists")) {
            throw new IOException("Could not create bucket " + bucket + ": " + created.statusCode() + " " + created.body());
        }
        log.info("Created public Supabase Storage bucket '{}'", bucket);
    }

    private HttpRequest.Builder auth(HttpRequest.Builder b) {
        b.header("apikey", key);
        // Legacy service_role keys are JWTs and must also be sent as a bearer token.
        if (key.startsWith("eyJ")) b.header("Authorization", "Bearer " + key);
        return b;
    }
}
