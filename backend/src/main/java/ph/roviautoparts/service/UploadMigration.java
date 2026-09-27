package ph.roviautoparts.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

/**
 * When Supabase Storage is configured, moves every local upload into the bucket and rewrites the
 * stored URLs. Safe to rerun: a file that fails is retried on the next start.
 */
@Component
public class UploadMigration {
    private static final Logger log = LoggerFactory.getLogger(UploadMigration.class);

    private final SupabaseStorage supabase;
    private final FileStorageService files;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;

    public UploadMigration(SupabaseStorage supabase, FileStorageService files, JdbcTemplate jdbc,
                           PlatformTransactionManager txManager) {
        this.supabase = supabase;
        this.files = files;
        this.jdbc = jdbc;
        this.tx = new TransactionTemplate(txManager);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void migrate() {
        if (!supabase.enabled()) return;
        try {
            supabase.ensureBucket();
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.warn("Could not check the Supabase bucket: {}", e.getMessage());
            return;
        }
        Path root = files.root();
        if (!Files.isDirectory(root)) return;

        List<Path> local;
        try (Stream<Path> s = Files.list(root)) {
            local = s.filter(p -> FileStorageService.SAFE_NAME.matcher(p.getFileName().toString()).matches()).toList();
        } catch (IOException e) {
            log.warn("Could not list {}: {}", root, e.getMessage());
            return;
        }
        int moved = 0;
        for (Path p : local) {
            String name = p.getFileName().toString();
            try {
                byte[] bytes = Files.readAllBytes(p);
                String ext = name.substring(name.lastIndexOf('.') + 1);
                String url = supabase.upload(name, bytes, FileStorageService.contentType(ext));
                String old = FileStorageService.LOCAL_PREFIX + name;
                tx.executeWithoutResult(s -> {
                    jdbc.update("update product_images set url = ? where url = ?", url, old);
                    jdbc.update("update users set avatar_url = ? where avatar_url = ?", url, old);
                    jdbc.update("update order_items set image_url = ? where image_url = ?", url, old);
                });
                Files.deleteIfExists(p);
                moved++;
            } catch (Exception e) {
                log.warn("Could not move {} to Supabase (will retry next start): {}", name, e.getMessage());
            }
        }
        if (moved > 0) log.info("Moved {} local upload(s) to Supabase Storage", moved);
    }
}
