package ph.roviautoparts.web;

import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.roviautoparts.dto.Dtos;
import ph.roviautoparts.dto.Dtos.*;
import ph.roviautoparts.model.CartItem;
import ph.roviautoparts.model.Product;
import ph.roviautoparts.repo.CartItemRepository;
import ph.roviautoparts.repo.FavoriteRepository;
import ph.roviautoparts.repo.ProductRepository;
import ph.roviautoparts.repo.UserRepository;
import ph.roviautoparts.security.CurrentUser;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** The customer's bag. Every endpoint returns the full bag. */
@RestController
@RequestMapping("/api/cart")
public class CartController {
    private final CartItemRepository cart;
    private final ProductRepository products;
    private final FavoriteRepository favorites;
    private final UserRepository users;
    private final CurrentUser current;

    public CartController(CartItemRepository cart, ProductRepository products, FavoriteRepository favorites,
                          UserRepository users, CurrentUser current) {
        this.cart = cart;
        this.products = products;
        this.favorites = favorites;
        this.users = users;
        this.current = current;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public CartDto get() {
        return build(current.id());
    }

    @PostMapping
    @Transactional
    public CartDto add(@Valid @RequestBody CartAdd req) {
        Long userId = current.id();
        Product p = products.findById(req.productId()).filter(Product::isActive)
                .orElseThrow(() -> ApiException.notFound("Part not found."));
        String option = normaliseOption(p, req.option());
        CartItem line = cart.findLine(userId, p.getId(), option).orElse(null);
        int wanted = (line == null ? 0 : line.getQuantity()) + req.quantity();
        if (wanted > 20) throw ApiException.badRequest("You can reserve up to 20 of a part.");
        checkStock(p, wanted);
        if (line == null) {
            cart.save(new CartItem(users.getReferenceById(userId), p, wanted, option));
        } else {
            line.setQuantity(wanted);
        }
        cart.flush();
        return build(userId);
    }

    @PatchMapping("/{itemId}")
    @Transactional
    public CartDto quantity(@PathVariable Long itemId, @Valid @RequestBody CartQuantity req) {
        Long userId = current.id();
        CartItem line = cart.findByIdAndUserId(itemId, userId).orElseThrow(() -> ApiException.notFound("That item isn't in your bag."));
        checkStock(line.getProduct(), req.quantity());
        line.setQuantity(req.quantity());
        cart.flush();
        return build(userId);
    }

    @DeleteMapping("/{itemId}")
    @Transactional
    public CartDto remove(@PathVariable Long itemId) {
        Long userId = current.id();
        cart.findByIdAndUserId(itemId, userId).ifPresent(cart::delete);
        cart.flush();
        return build(userId);
    }

    /** Matches the chosen option case-insensitively and stores the catalogue spelling. */
    static String normaliseOption(Product p, String requested) {
        List<String> options = Dtos.splitOptions(p.getOptions());
        if (options.isEmpty()) return null;
        String label = Dtos.optionLabelOf(p).toLowerCase(Locale.ROOT);
        if (requested == null || requested.isBlank()) throw ApiException.badRequest("Please choose a " + label + ".");
        return options.stream().filter(o -> o.equalsIgnoreCase(requested.trim())).findFirst()
                .orElseThrow(() -> ApiException.badRequest("That " + label + " isn't available for this part."));
    }

    static void checkStock(Product p, int quantity) {
        if (p.getStock() <= 0) throw ApiException.conflict(p.getName() + " is sold out.");
        if (quantity > p.getStock()) throw ApiException.conflict("Only " + p.getStock() + " of " + p.getName() + " available.");
    }

    private CartDto build(Long userId) {
        List<CartItem> lines = cart.findForUser(userId);
        Set<Long> favs = favorites.findProductIds(userId);
        BigDecimal subtotal = BigDecimal.ZERO;
        int count = 0;
        List<CartItemDto> items = new java.util.ArrayList<>();
        for (CartItem l : lines) {
            BigDecimal line = l.getProduct().getPrice().multiply(BigDecimal.valueOf(l.getQuantity()));
            subtotal = subtotal.add(line);
            count += l.getQuantity();
            items.add(new CartItemDto(l.getId(), ProductDto.of(l.getProduct(), favs.contains(l.getProduct().getId())),
                    l.getQuantity(), l.getOption(), line));
        }
        return new CartDto(items, count, subtotal);
    }
}
