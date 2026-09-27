package ph.roviautoparts.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import ph.roviautoparts.dto.Dtos.*;
import ph.roviautoparts.model.*;
import ph.roviautoparts.repo.CartItemRepository;
import ph.roviautoparts.repo.OrderRepository;
import ph.roviautoparts.repo.ProductRepository;
import ph.roviautoparts.repo.UserRepository;
import ph.roviautoparts.web.ApiException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    public static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Manila");
    public static final Set<OrderStatus> OPEN = EnumSet.of(OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.READY_FOR_PICKUP);
    private static final String REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final DateTimeFormatter REF_DATE = DateTimeFormatter.ofPattern("yyMMdd");
    private static final int MAX_PICKUP_DAYS_AHEAD = 60;

    private final OrderRepository orders;
    private final CartItemRepository cart;
    private final ProductRepository products;
    private final UserRepository users;
    private final ChatService chat;
    private final TransactionTemplate tx;
    private final SecureRandom random = new SecureRandom();
    private final int holdDays;
    private final int graceDays;

    public OrderService(OrderRepository orders, CartItemRepository cart, ProductRepository products, UserRepository users,
                        ChatService chat, PlatformTransactionManager txManager,
                        @Value("${app.reservations.hold-days:7}") int holdDays,
                        @Value("${app.reservations.grace-days-after-pickup:2}") int graceDays) {
        this.orders = orders;
        this.cart = cart;
        this.products = products;
        this.users = users;
        this.chat = chat;
        this.tx = new TransactionTemplate(txManager);
        this.holdDays = holdDays;
        this.graceDays = graceDays;
    }

    // ---------- Customer ----------

    @Transactional(readOnly = true)
    public List<OrderDto> forCustomer(Long customerId) {
        return orders.findForCustomer(customerId).stream().map(OrderDto::of).toList();
    }

    @Transactional
    public OrderDto checkout(Long customerId, CheckoutRequest req) {
        User customer = users.findById(customerId).orElseThrow(() -> ApiException.notFound("Account not found."));
        List<CartItem> lines = cart.findForUser(customerId);
        if (lines.isEmpty()) throw ApiException.badRequest("Your bag is empty.");

        LocalDate pickup = parsePickupDate(req == null ? null : req.pickupDate());

        Order order = new Order();
        order.setCustomer(customer);
        order.setReference(newReference());
        String note = req == null || req.note() == null ? null : req.note().trim();
        order.setNote(note == null || note.isEmpty() ? null : note);
        order.setPickupDate(pickup == null ? null : pickup.toString());

        BigDecimal total = BigDecimal.ZERO;
        for (CartItem line : lines) {
            // Lock the row so two customers can't reserve the last unit at the same time.
            Product p = products.findLockedById(line.getProduct().getId())
                    .orElseThrow(() -> ApiException.conflict("A part in your bag is no longer available."));
            if (!p.isActive()) throw ApiException.conflict(p.getName() + " is no longer available.");
            if (p.getStock() <= 0) throw ApiException.conflict(p.getName() + " has just sold out.");
            if (line.getQuantity() > p.getStock()) {
                throw ApiException.conflict("Only " + p.getStock() + " left of " + p.getName() + ".");
            }
            p.setStock(p.getStock() - line.getQuantity());
            OrderItem item = new OrderItem(order, p, line.getQuantity(), line.getOption());
            order.getItems().add(item);
            total = total.add(p.getPrice().multiply(BigDecimal.valueOf(line.getQuantity())));
        }
        order.setTotal(total);
        order.setHoldUntil(holdFor(order.getCreatedAt(), pickup));
        orders.save(order);
        cart.deleteForUser(customerId);
        return OrderDto.of(order);
    }

    @Transactional
    public OrderDto cancelByCustomer(Long customerId, Long orderId) {
        Order order = orders.findWithCustomer(orderId)
                .filter(o -> o.getCustomer().getId().equals(customerId))
                .orElseThrow(() -> ApiException.notFound("Reservation not found."));
        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.CONFIRMED) {
            throw ApiException.badRequest("This reservation can no longer be cancelled online. Please message us.");
        }
        restock(order);
        order.setStatus(OrderStatus.CANCELLED);
        return OrderDto.of(order);
    }

    // ---------- Admin ----------

    @Transactional(readOnly = true)
    public List<OrderDto> all() {
        return orders.findAllWithCustomer().stream().map(OrderDto::of).toList();
    }

    @Transactional
    public OrderDto updateStatus(Long orderId, StatusUpdate req, Long adminId) {
        Order order = orders.findWithCustomer(orderId).orElseThrow(() -> ApiException.notFound("Reservation not found."));
        OrderStatus next = req.status();
        if (order.getStatus() == next) return OrderDto.of(order);
        if (!order.getStatus().isOpen()) {
            throw ApiException.badRequest("Completed or cancelled reservations can't be changed.");
        }
        if (next == OrderStatus.PENDING) {
            throw ApiException.badRequest("A reservation can't be moved back to pending.");
        }
        User admin = users.findById(adminId).orElse(null);

        if (next == OrderStatus.COMPLETED) {
            if (req.paymentMethod() == null) throw ApiException.badRequest("Choose how the customer paid.");
            order.setPaymentMethod(req.paymentMethod());
            String ref = req.paymentReference() == null ? null : req.paymentReference().trim();
            order.setPaymentReference(ref == null || ref.isEmpty() ? null : ref);
            order.setPaidAt(Instant.now());
        }
        if (next == OrderStatus.CANCELLED) restock(order);
        order.setStatus(next);

        String ref = order.getReference();
        String message = switch (next) {
            case CONFIRMED -> "Your reservation " + ref + " is confirmed. We're pulling the parts from the yard and will message you when they're ready.";
            case READY_FOR_PICKUP -> "Good news — reservation " + ref + " is ready for pickup at our Panganiban Street shop, Cebu City. Please bring your reference number.";
            case COMPLETED -> "Thank you for choosing Rovi Autoparts Surplus. Reservation " + ref + " is complete — paid by " + order.getPaymentMethod().label() + ".";
            case CANCELLED -> "Reservation " + ref + " has been cancelled. Reply here if you have any questions.";
            default -> null;
        };
        if (message != null) chat.postFromShop(order.getCustomer(), admin, message);
        return OrderDto.of(order);
    }

    @Transactional
    public OrderDto extendHold(Long orderId, int days) {
        Order order = orders.findWithCustomer(orderId).orElseThrow(() -> ApiException.notFound("Reservation not found."));
        if (!order.getStatus().isOpen()) throw ApiException.badRequest("Only open reservations can be extended.");
        Instant now = Instant.now();
        Instant from = order.getHoldUntil() != null && order.getHoldUntil().isAfter(now) ? order.getHoldUntil() : now;
        order.setHoldUntil(from.plus(days, ChronoUnit.DAYS));
        return OrderDto.of(order);
    }

    // ---------- Holds ----------

    /** max(createdAt + holdDays, start of day (pickup + grace + 1) in Manila), or createdAt + holdDays. */
    public Instant holdFor(Instant createdAt, LocalDate pickup) {
        Instant base = createdAt.plus(holdDays, ChronoUnit.DAYS);
        if (pickup == null) return base;
        Instant afterPickup = pickup.plusDays(graceDays + 1L).atStartOfDay(SHOP_ZONE).toInstant();
        return afterPickup.isAfter(base) ? afterPickup : base;
    }

    /** Gives any open reservation without a hold one, then releases the overdue ones. */
    public int releaseExpired() {
        tx.executeWithoutResult(s -> {
            for (Order o : orders.findOpenWithoutHold(OPEN)) {
                LocalDate pickup = null;
                try {
                    if (o.getPickupDate() != null) pickup = LocalDate.parse(o.getPickupDate());
                } catch (DateTimeParseException ignored) {
                    // keep the default hold
                }
                o.setHoldUntil(holdFor(o.getCreatedAt(), pickup));
            }
        });
        List<Long> expired = tx.execute(s -> orders.findExpired(OPEN, Instant.now()).stream().map(Order::getId).toList());
        int released = 0;
        for (Long id : expired == null ? List.<Long>of() : expired) {
            try {
                Boolean done = tx.execute(s -> releaseOne(id));
                if (Boolean.TRUE.equals(done)) released++;
            } catch (RuntimeException e) {
                log.error("Could not release reservation {}", id, e);
            }
        }
        return released;
    }

    private boolean releaseOne(Long id) {
        Order order = orders.findWithCustomer(id).orElse(null);
        if (order == null || !order.getStatus().isOpen() || order.getHoldUntil() == null
                || !order.getHoldUntil().isBefore(Instant.now())) return false;
        restock(order);
        order.setStatus(OrderStatus.CANCELLED);
        chat.postFromShop(order.getCustomer(), null, "Reservation " + order.getReference()
                + " was not collected in time, so the parts have been released back to stock. If you still need them, "
                + "just reply here and we'll check availability for you.");
        log.info("Released overdue reservation {}", order.getReference());
        return true;
    }

    // ---------- Helpers ----------

    private void restock(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() == null) continue;
            products.findLockedById(item.getProduct().getId())
                    .ifPresent(p -> p.setStock(p.getStock() + item.getQuantity()));
        }
    }

    private LocalDate parsePickupDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        LocalDate date;
        try {
            date = LocalDate.parse(raw.trim());
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("Please choose a valid pickup date.");
        }
        LocalDate today = LocalDate.now(SHOP_ZONE);
        if (!date.isAfter(today)) throw ApiException.badRequest("Please choose a pickup date from tomorrow onwards.");
        if (date.isAfter(today.plusDays(MAX_PICKUP_DAYS_AHEAD))) {
            throw ApiException.badRequest("Pickup dates can be at most 60 days ahead.");
        }
        return date;
    }

    private String newReference() {
        String date = LocalDate.now(SHOP_ZONE).format(REF_DATE);
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder("RA-").append(date).append('-');
            for (int i = 0; i < 4; i++) sb.append(REF_ALPHABET.charAt(random.nextInt(REF_ALPHABET.length())));
            String ref = sb.toString();
            if (!orders.existsByReference(ref)) return ref;
        }
        throw new IllegalStateException("Could not generate a unique reference");
    }
}
