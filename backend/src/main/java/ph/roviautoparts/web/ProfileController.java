package ph.roviautoparts.web;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ph.roviautoparts.dto.Dtos.*;
import ph.roviautoparts.model.User;
import ph.roviautoparts.repo.CartItemRepository;
import ph.roviautoparts.repo.FavoriteRepository;
import ph.roviautoparts.repo.OrderRepository;
import ph.roviautoparts.security.AuthCookies;
import ph.roviautoparts.security.AuthStateCache;
import ph.roviautoparts.security.CurrentUser;
import ph.roviautoparts.service.ChatService;
import ph.roviautoparts.service.FileStorageService;

import java.util.Map;

/** Profile, avatar and password for any signed-in user. */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final CurrentUser current;
    private final PasswordEncoder encoder;
    private final AuthCookies cookies;
    private final AuthStateCache states;
    private final FileStorageService files;
    private final FavoriteRepository favorites;
    private final CartItemRepository cart;
    private final OrderRepository orders;
    private final ChatService chat;

    public ProfileController(CurrentUser current, PasswordEncoder encoder, AuthCookies cookies, AuthStateCache states,
                             FileStorageService files, FavoriteRepository favorites, CartItemRepository cart,
                             OrderRepository orders, ChatService chat) {
        this.current = current;
        this.encoder = encoder;
        this.cookies = cookies;
        this.states = states;
        this.files = files;
        this.favorites = favorites;
        this.cart = cart;
        this.orders = orders;
        this.chat = chat;
    }

    @GetMapping
    public UserDto get() {
        return UserDto.of(current.load());
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public ProfileStats stats() {
        Long id = current.id();
        long unread = current.isAdmin() ? chat.unreadForAdmins() : chat.unreadForCustomer(id);
        return new ProfileStats(favorites.countActive(id), cart.sumQuantity(id), orders.countByCustomerId(id),
                orders.spentBy(id), unread);
    }

    @PutMapping
    @Transactional
    public UserDto update(@Valid @RequestBody ProfileUpdate req) {
        User u = current.load();
        u.setFullName(req.fullName().trim().replaceAll("\\s+", " "));
        u.setPhone(blankToNull(req.phone()));
        u.setAddress(blankToNull(req.address()));
        u.setBio(blankToNull(req.bio()));
        return UserDto.of(u);
    }

    @PostMapping("/avatar")
    @Transactional
    public UserDto avatar(@RequestParam("file") MultipartFile file) {
        User u = current.load();
        String old = u.getAvatarUrl();
        u.setAvatarUrl(files.store(file));
        files.deleteIfOwned(old);
        return UserDto.of(u);
    }

    @DeleteMapping("/avatar")
    @Transactional
    public UserDto removeAvatar() {
        User u = current.load();
        String old = u.getAvatarUrl();
        u.setAvatarUrl(null);
        files.deleteIfOwned(old);
        return UserDto.of(u);
    }

    @PostMapping("/password")
    @Transactional
    public Map<String, Boolean> password(@Valid @RequestBody PasswordChange req, HttpServletResponse response) {
        User u = current.load();
        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("Your current password is incorrect.");
        }
        if (encoder.matches(req.newPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("Choose a password you haven't used here before.");
        }
        u.setPasswordHash(encoder.encode(req.newPassword()));
        // Signs out every other device; this device gets a fresh cookie.
        u.setTokenVersion(u.getTokenVersion() + 1);
        states.evict(u.getId());
        cookies.issue(response, u);
        return Map.of("ok", true);
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
