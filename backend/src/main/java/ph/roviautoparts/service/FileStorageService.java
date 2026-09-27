package ph.roviautoparts.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ph.roviautoparts.web.ApiException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Stores uploaded images. The type is detected from magic bytes only; anything that isn't
 * a JPEG, PNG, GIF or WEBP (including SVG) is rejected.
 */
@Service
public class FileStorageService {
    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    public static final Pattern SAFE_NAME = Pattern.compile("^[a-f0-9-]{36}\\.(jpg|png|webp|gif)$");
    public static final String LOCAL_PREFIX = "/api/files/";
    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final Path root;
    private final SupabaseStorage supabase;

    public FileStorageService(@Value("${app.upload-dir:./uploads}") String uploadDir, SupabaseStorage supabase) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
        this.supabase = supabase;
    }

    public Path root() { return root; }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Please choose an image.");
        if (file.getSize() > MAX_BYTES) {
            throw new ApiException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE, "Images must be 5 MB or smaller.");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw ApiException.badRequest("Please choose an image.");
        }
        String ext = detect(bytes);
        if (ext == null) throw ApiException.badRequest("Only JPG, PNG, WEBP or GIF images are allowed.");
        String name = UUID.randomUUID() + "." + ext;

        if (supabase.enabled()) {
            return supabase.upload(name, bytes, contentType(ext));
        }
        try {
            Files.createDirectories(root);
            Files.write(root.resolve(name), bytes);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return LOCAL_PREFIX + name;
    }

    /** Detects the image type from its first bytes. Returns the extension or null. */
    public static String detect(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "jpg";
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return "png";
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8'
                && (b[4] == '7' || b[4] == '9') && b[5] == 'a') return "gif";
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "webp";
        return null;
    }

    public static String contentType(String ext) {
        return switch (ext) {
            case "jpg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            default -> "application/octet-stream";
        };
    }

    /** Resolves a local upload by its safe name, or returns null (no traversal possible). */
    public Path resolveLocal(String name) {
        if (name == null || !SAFE_NAME.matcher(name).matches()) return null;
        Path p = root.resolve(name).normalize();
        return p.startsWith(root) ? p : null;
    }

    /** True if this app uploaded the file behind the URL (never an external link). */
    public boolean isOwned(String url) {
        if (url == null) return false;
        if (url.startsWith(LOCAL_PREFIX)) return SAFE_NAME.matcher(url.substring(LOCAL_PREFIX.length())).matches();
        return supabase.nameFromPublicUrl(url) != null;
    }

    /** Deletes a file this app uploaded. External links are never touched. */
    public void deleteIfOwned(String url) {
        if (url == null) return;
        if (url.startsWith(LOCAL_PREFIX)) {
            Path p = resolveLocal(url.substring(LOCAL_PREFIX.length()));
            if (p != null) {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException e) {
                    log.warn("Could not delete {}: {}", p, e.getMessage());
                }
            }
            return;
        }
        String name = supabase.nameFromPublicUrl(url);
        if (name != null) supabase.delete(name);
    }
}
