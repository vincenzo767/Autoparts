package ph.roviautoparts.web;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.roviautoparts.dto.Dtos.ProductDto;
import ph.roviautoparts.model.Favorite;
import ph.roviautoparts.model.Product;
import ph.roviautoparts.repo.FavoriteRepository;
import ph.roviautoparts.repo.ProductRepository;
import ph.roviautoparts.repo.UserRepository;
import ph.roviautoparts.security.CurrentUser;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {
    private final FavoriteRepository favorites;
    private final ProductRepository products;
    private final UserRepository users;
    private final CurrentUser current;

    public FavoriteController(FavoriteRepository favorites, ProductRepository products, UserRepository users,
                              CurrentUser current) {
        this.favorites = favorites;
        this.products = products;
        this.users = users;
        this.current = current;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ProductDto> list() {
        return favorites.findActiveProducts(current.id()).stream().map(p -> ProductDto.of(p, true)).toList();
    }

    @PostMapping("/{productId}")
    @Transactional
    public Map<String, Boolean> add(@PathVariable Long productId) {
        Long userId = current.id();
        Product p = products.findById(productId).filter(Product::isActive)
                .orElseThrow(() -> ApiException.notFound("Part not found."));
        if (!favorites.existsByUserIdAndProductId(userId, productId)) {
            favorites.save(new Favorite(users.getReferenceById(userId), p));
        }
        return Map.of("favorite", true);
    }

    @DeleteMapping("/{productId}")
    @Transactional
    public Map<String, Boolean> remove(@PathVariable Long productId) {
        favorites.deleteOne(current.id(), productId);
        return Map.of("favorite", false);
    }
}
