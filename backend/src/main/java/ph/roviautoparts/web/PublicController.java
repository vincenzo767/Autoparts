package ph.roviautoparts.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ph.roviautoparts.dto.Dtos.PublicProduct;
import ph.roviautoparts.repo.ProductRepository;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/** Open endpoints for the landing site. */
@RestController
@RequestMapping("/api/public")
public class PublicController {
    private record Cached(List<PublicProduct> items, Instant at) {}

    private static final Duration TTL = Duration.ofSeconds(60);
    private final ProductRepository products;
    private volatile Cached cache;

    public PublicController(ProductRepository products) {
        this.products = products;
    }

    @GetMapping("/featured")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PublicProduct>> featured() {
        Cached c = cache;
        if (c == null || c.at().plus(TTL).isBefore(Instant.now())) {
            List<PublicProduct> items = products.findTop8ByActiveTrueAndFeaturedTrueOrderByIdAsc().stream()
                    .map(p -> new PublicProduct(p.getId(), p.getName(), p.getCategory(), p.getTag(), p.getBrand(),
                            p.getPrice(), p.getStock() > 0, p.getImages().stream().limit(2).toList()))
                    .toList();
            c = new Cached(items, Instant.now());
            cache = c;
        }
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic()).body(c.items());
    }
}
