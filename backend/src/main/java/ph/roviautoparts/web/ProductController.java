package ph.roviautoparts.web;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.roviautoparts.dto.Dtos.ProductDto;
import ph.roviautoparts.model.Category;
import ph.roviautoparts.model.Product;
import ph.roviautoparts.repo.FavoriteRepository;
import ph.roviautoparts.repo.ProductRepository;
import ph.roviautoparts.security.AuthUser;
import ph.roviautoparts.security.CurrentUser;

import java.util.*;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductRepository products;
    private final FavoriteRepository favorites;

    public ProductController(ProductRepository products, FavoriteRepository favorites) {
        this.products = products;
        this.favorites = favorites;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ProductDto> list(@RequestParam(required = false) String category,
                                 @RequestParam(required = false) String q,
                                 @RequestParam(required = false, defaultValue = "featured") String sort,
                                 @RequestParam(required = false) Boolean inStock,
                                 @RequestParam(required = false) Boolean featured,
                                 @RequestParam(required = false) Integer limit) {
        Category cat = parseCategory(category);
        String[] terms = q == null || q.isBlank() ? new String[0] : q.trim().toLowerCase(Locale.ROOT).split("\\s+");

        Stream<Product> s = products.findByActiveTrue().stream();
        if (cat != null) s = s.filter(p -> p.getCategory() == cat);
        if (Boolean.TRUE.equals(inStock)) s = s.filter(p -> p.getStock() > 0);
        if (Boolean.TRUE.equals(featured)) s = s.filter(Product::isFeatured);
        if (terms.length > 0) s = s.filter(p -> matches(p, terms));

        s = s.sorted(comparator(sort));
        int max = limit == null ? 100 : Math.max(1, Math.min(limit, 100));
        Set<Long> favs = favoriteIds();
        return s.limit(max).map(p -> ProductDto.of(p, favs.contains(p.getId()))).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ProductDto get(@PathVariable Long id) {
        Product p = products.findById(id)
                .filter(x -> x.isActive() || CurrentUser.principal() != null && CurrentUser.principal().isAdmin())
                .orElseThrow(() -> ApiException.notFound("Part not found."));
        return ProductDto.of(p, favoriteIds().contains(p.getId()));
    }

    @GetMapping("/{id}/related")
    @Transactional(readOnly = true)
    public List<ProductDto> related(@PathVariable Long id) {
        Product p = products.findById(id).orElseThrow(() -> ApiException.notFound("Part not found."));
        Set<Long> favs = favoriteIds();
        return products.findTop4ByCategoryAndActiveTrueAndIdNotOrderByFeaturedDescIdAsc(p.getCategory(), p.getId())
                .stream().map(x -> ProductDto.of(x, favs.contains(x.getId()))).toList();
    }

    /** The signed-in customer's favourites (always empty for admins). */
    private Set<Long> favoriteIds() {
        AuthUser u = CurrentUser.principal();
        if (u == null || u.isAdmin()) return Set.of();
        return favorites.findProductIds(u.id());
    }

    static Category parseCategory(String category) {
        if (category == null || category.isBlank()) return null;
        try {
            return Category.valueOf(category.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** Every search term must appear in at least one searchable field. */
    static boolean matches(Product p, String[] terms) {
        String hay = String.join("\n", Stream.of(p.getName(), p.getBrand(), p.getFitment(), p.getPartNumber(), p.getTag(),
                p.getDescription(), p.getCategory().label(), p.getOrigin() == null ? null : p.getOrigin().label())
                .filter(Objects::nonNull).toList()).toLowerCase(Locale.ROOT);
        for (String t : terms) if (!hay.contains(t)) return false;
        return true;
    }

    static Comparator<Product> comparator(String sort) {
        Comparator<Product> byId = Comparator.comparing(Product::getId);
        return switch (sort == null ? "featured" : sort) {
            case "new" -> Comparator.comparing(Product::getCreatedAt).reversed().thenComparing(byId.reversed());
            case "price-asc" -> Comparator.comparing(Product::getPrice).thenComparing(byId);
            case "price-desc" -> Comparator.comparing(Product::getPrice).reversed().thenComparing(byId);
            case "name" -> Comparator.comparing((Product p) -> p.getName().toLowerCase(Locale.ROOT)).thenComparing(byId);
            default -> Comparator.comparing((Product p) -> !p.isFeatured()).thenComparing(byId);
        };
    }
}
