package ph.roviautoparts.web;

import jakarta.validation.Valid;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.roviautoparts.dto.Dtos.*;
import ph.roviautoparts.model.Category;
import ph.roviautoparts.model.Role;
import ph.roviautoparts.model.User;
import ph.roviautoparts.repo.OrderRepository;
import ph.roviautoparts.repo.ProductRepository;
import ph.roviautoparts.repo.UserRepository;
import ph.roviautoparts.security.AuthStateCache;
import ph.roviautoparts.security.CurrentUser;
import ph.roviautoparts.service.ChatService;
import ph.roviautoparts.service.OrderService;

import java.math.BigDecimal;
import java.util.*;

/** The owner's console: dashboard, reservations, customers and the inbox. */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private static final String STATS_SQL = """
            SELECT
              (SELECT COUNT(*) FROM products),
              (SELECT COUNT(*) FROM products WHERE active = TRUE),
              (SELECT COALESCE(SUM(stock), 0) FROM products),
              (SELECT COALESCE(SUM(price * stock), 0) FROM products),
              (SELECT COUNT(*) FROM products WHERE stock > 0 AND stock <= 3),
              (SELECT COUNT(*) FROM products WHERE stock = 0),
              (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER'),
              (SELECT COUNT(*) FROM orders WHERE status = 'PENDING'),
              (SELECT COUNT(*) FROM orders WHERE status IN ('PENDING', 'CONFIRMED', 'READY_FOR_PICKUP')),
              (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'COMPLETED'),
              (SELECT COUNT(*) FROM chat_messages WHERE from_admin = FALSE AND read_by_recipient = FALSE)
            """;

    private static final String COUNTS_SQL = """
            SELECT
              (SELECT COUNT(*) FROM chat_messages WHERE from_admin = FALSE AND read_by_recipient = FALSE),
              (SELECT COUNT(*) FROM orders WHERE status = 'PENDING'),
              (SELECT COUNT(*) FROM products WHERE stock <= 3)
            """;

    private final JdbcTemplate jdbc;
    private final ProductRepository products;
    private final OrderRepository orderRepo;
    private final UserRepository users;
    private final OrderService orders;
    private final ChatService chat;
    private final AuthStateCache states;
    private final CurrentUser current;

    public AdminController(JdbcTemplate jdbc, ProductRepository products, OrderRepository orderRepo, UserRepository users,
                           OrderService orders, ChatService chat, AuthStateCache states, CurrentUser current) {
        this.jdbc = jdbc;
        this.products = products;
        this.orderRepo = orderRepo;
        this.users = users;
        this.orders = orders;
        this.chat = chat;
        this.states = states;
        this.current = current;
    }

    // ---------- Dashboard ----------

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public StatsDto stats() {
        long[] n = new long[11];
        BigDecimal[] money = new BigDecimal[2];
        jdbc.query(STATS_SQL, rs -> {
            for (int i = 0; i < 11; i++) {
                if (i == 3 || i == 9) continue;
                n[i] = rs.getLong(i + 1);
            }
            money[0] = rs.getBigDecimal(4);
            money[1] = rs.getBigDecimal(10);
        });

        Map<Category, CategoryStat> byCat = new EnumMap<>(Category.class);
        for (Category c : Category.values()) byCat.put(c, new CategoryStat(c, 0, 0, BigDecimal.ZERO));
        for (Object[] row : products.categoryStats()) {
            Category c = (Category) row[0];
            byCat.put(c, new CategoryStat(c, ((Number) row[1]).longValue(), ((Number) row[2]).longValue(), toDecimal(row[3])));
        }

        List<ProductDto> low = products.findTop6ByStockLessThanEqualOrderByStockAscIdAsc(3).stream()
                .map(p -> ProductDto.of(p, false)).toList();
        List<OrderDto> recent = orderRepo.findTop6ByOrderByCreatedAtDescIdDesc().stream().map(OrderDto::of).toList();

        return new StatsDto(n[0], n[1], n[2], nz(money[0]), n[4], n[5], n[6], n[7], n[8], nz(money[1]), n[10],
                new ArrayList<>(byCat.values()), low, recent);
    }

    @GetMapping("/counts")
    public Map<String, Long> counts() {
        Map<String, Long> out = new LinkedHashMap<>();
        jdbc.query(COUNTS_SQL, rs -> {
            out.put("unread", rs.getLong(1));
            out.put("pending", rs.getLong(2));
            out.put("lowStock", rs.getLong(3));
        });
        return out;
    }

    // ---------- Reservations ----------

    @GetMapping("/orders")
    public List<OrderDto> orders() {
        return orders.all();
    }

    @PatchMapping("/orders/{id}/status")
    public OrderDto status(@PathVariable Long id, @Valid @RequestBody StatusUpdate req) {
        return orders.updateStatus(id, req, current.id());
    }

    @PatchMapping("/orders/{id}/hold")
    public OrderDto hold(@PathVariable Long id, @Valid @RequestBody HoldExtension req) {
        return orders.extendHold(id, req.days());
    }

    // ---------- Customers ----------

    @GetMapping("/customers")
    @Transactional(readOnly = true)
    public List<CustomerDto> customers() {
        Map<Long, Object[]> totals = new HashMap<>();
        for (Object[] row : orderRepo.customerTotals()) totals.put((Long) row[0], row);
        return users.findByRoleOrderByCreatedAtDesc(Role.CUSTOMER).stream().map(u -> toCustomer(u, totals.get(u.getId()))).toList();
    }

    @PatchMapping("/customers/{id}/status")
    @Transactional
    public CustomerDto customerStatus(@PathVariable Long id, @Valid @RequestBody CustomerStatus req) {
        User u = users.findById(id).filter(x -> x.getRole() == Role.CUSTOMER)
                .orElseThrow(() -> ApiException.notFound("Customer not found."));
        boolean enable = req.enabled();
        if (u.isEnabled() != enable) {
            u.setEnabled(enable);
            if (!enable) u.setTokenVersion(u.getTokenVersion() + 1); // signs them out everywhere
            states.evict(u.getId());
        }
        Object[] row = null;
        for (Object[] r : orderRepo.customerTotals()) if (r[0].equals(u.getId())) row = r;
        return toCustomer(u, row);
    }

    private static CustomerDto toCustomer(User u, Object[] totals) {
        long count = totals == null ? 0 : ((Number) totals[1]).longValue();
        BigDecimal spent = totals == null ? BigDecimal.ZERO : toDecimal(totals[2]);
        return new CustomerDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getAddress(), u.getAvatarUrl(),
                u.isEnabled(), u.getCreatedAt(), u.getLastLoginAt(), count, spent);
    }

    // ---------- Inbox ----------

    @GetMapping("/chat/conversations")
    public List<ConversationDto> conversations() {
        return chat.conversations();
    }

    @GetMapping("/chat/{customerId}/messages")
    public List<ChatMessageDto> thread(@PathVariable Long customerId) {
        return chat.thread(customerId);
    }

    @PostMapping("/chat/{customerId}/messages")
    public ChatMessageDto send(@PathVariable Long customerId, @Valid @RequestBody ChatSend req) {
        return chat.sendFromAdmin(current.id(), customerId, req);
    }

    @PostMapping("/chat/{customerId}/read")
    public Map<String, Boolean> read(@PathVariable Long customerId) {
        chat.markRead(customerId, true);
        return Map.of("ok", true);
    }

    private static BigDecimal toDecimal(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal b) return b;
        return new BigDecimal(o.toString());
    }

    private static BigDecimal nz(BigDecimal b) {
        return b == null ? BigDecimal.ZERO : b;
    }
}
