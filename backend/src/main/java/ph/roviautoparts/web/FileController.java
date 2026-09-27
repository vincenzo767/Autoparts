package ph.roviautoparts.web;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ph.roviautoparts.service.FileStorageService;
import ph.roviautoparts.service.SupabaseStorage;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/** Serves local uploads. After a move to Supabase, redirects to the new URL. */
@RestController
@RequestMapping("/api/files")
public class FileController {
    private final FileStorageService files;
    private final SupabaseStorage supabase;

    public FileController(FileStorageService files, SupabaseStorage supabase) {
        this.files = files;
        this.supabase = supabase;
    }

    @GetMapping("/{name}")
    public ResponseEntity<Resource> get(@PathVariable String name) {
        Path p = files.resolveLocal(name);
        if (p == null) throw ApiException.notFound("Not found.");
        if (!Files.isRegularFile(p)) {
            if (supabase.enabled()) {
                return ResponseEntity.status(HttpStatus.MOVED_PERMANENTLY).location(URI.create(supabase.publicUrl(name))).build();
            }
            throw ApiException.notFound("Not found.");
        }
        String ext = name.substring(name.lastIndexOf('.') + 1);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(FileStorageService.contentType(ext)))
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .body(new FileSystemResource(p));
    }
}
