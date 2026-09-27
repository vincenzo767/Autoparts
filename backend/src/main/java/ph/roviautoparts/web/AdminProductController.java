package ph.roviautoparts.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ph.roviautoparts.dto.Dtos.*;
import ph.roviautoparts.model.Product;
import ph.roviautoparts.repo.*;
import ph.roviautoparts.service.FileStorageService;

import java.util.*;

/** The owner's catalogue: parts, stock, visibility and photo uploads. */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductController {
    private final ProductRepository products;
    private final FavoriteRepository favorites;
    private final CartItemRepository cart;
    private final OrderRepository orders;
    private final ChatMessageRepository messages;
    private final FileStorageService files;

    public AdminProductController(ProductRepository products, FavoriteRepository favorites, CartItemRepository cart,
                                  OrderRepository orders, ChatMessageRepository messages, FileStorageService files) {
        this.products = products;
        this.favorites = favorites;
        this.cart = cart;
        this.orders = orders;
        this.messages = messages;
        this.files = files;
    }

    @GetMapping("/products")
    @Transactional(readOnly = true)
    public List<ProductDto> list() {
        return products.findAllByOrderByCreatedAtDescIdDesc().stream().map(p -> ProductDto.of(p, false)).toList();
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ProductDto create(@Valid @RequestBody ProductRequest req) {
        Product p = new Product();
        apply(p, req);
        return ProductDto.of(products.save(p), false);
    }

    @PutMapping("/products/{id}")
    @Transactional
    public ProductDto update(@PathVariable Long id, @Valid @RequestBody ProductRequest req) {
        Product p = products.findLockedById(id).orElseThrow(() -> ApiException.notFound("Part not found."));
        List<String> before = new ArrayList<>(p.getImages());
        apply(p, req);
        products.saveAndFlush(p);
        for (String url : before) {
            if (!p.getImages().contains(url)) deleteImageIfUnused(url);
        }
        return ProductDto.of(p, false);
    }

    @PatchMapping("/products/{id}/stock")
    @Transactional
    public ProductDto stock(@PathVariable Long id, @Valid @RequestBody StockUpdate req) {
        Product p = products.findLockedById(id).orElseThrow(() -> ApiException.notFound("Part not found."));
        p.setStock(req.stock());
        return ProductDto.of(p, false);
    }

    @PatchMapping("/products/{id}/visibility")
    @Transactional
    public ProductDto visibility(@PathVariable Long id, @RequestBody VisibilityUpdate req) {
        Product p = products.findById(id).orElseThrow(() -> ApiException.notFound("Part not found."));
        if (req.active() != null) p.setActive(req.active());
        if (req.featured() != null) p.setFeatured(req.featured());
        return ProductDto.of(p, false);
    }

    @DeleteMapping("/products/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Product p = products.findById(id).orElseThrow(() -> ApiException.notFound("Part not found."));
        List<String> images = new ArrayList<>(p.getImages());
        favorites.deleteForProduct(id);
        cart.deleteForProduct(id);
        orders.detachProduct(id);
        messages.detachProduct(id);
        products.delete(p);
        products.flush();
        for (String url : images) deleteImageIfUnused(url);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/uploads")
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) {
        return Map.of("url", files.store(file));
    }

    private void deleteImageIfUnused(String url) {
        if (files.isOwned(url) && !products.isImageUsedByOrder(url)) files.deleteIfOwned(url);
    }

    private static void apply(Product p, ProductRequest req) {
        for (String url : req.images()) {
            if (url == null || !(url.startsWith(FileStorageService.LOCAL_PREFIX) || url.startsWith("https://"))) {
                throw ApiException.badRequest("Images must be uploaded files or secure (https) links.");
            }
        }
        p.setName(req.name().trim());
        p.setCategory(req.category());
        p.setDescription(trim(req.description()));
        p.setTag(trim(req.tag()));
        p.setBrand(trim(req.brand()));
        p.setFitment(trim(req.fitment()));
        p.setPartNumber(trim(req.partNumber()));
        p.setCondition(trim(req.condition()));
        p.setOrigin(req.origin());
        p.setOptionLabel(trim(req.optionLabel()));
        String options = trim(req.options());
        if (options != null) {
            options = String.join(", ", Arrays.stream(options.split("\\s*,\\s*")).map(String::trim)
                    .filter(s -> !s.isEmpty()).distinct().toList());
            if (options.isEmpty()) options = null;
        }
        p.setOptions(options);
        p.setPrice(req.price());
        p.setStock(req.stock());
        p.setActive(req.active());
        p.setFeatured(req.featured());
        p.getImages().clear();
        p.getImages().addAll(req.images().stream().map(String::trim).toList());
    }

    private static String trim(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
