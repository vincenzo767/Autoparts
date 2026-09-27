package ph.roviautoparts.dto;

import jakarta.validation.constraints.*;
import ph.roviautoparts.model.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/** Every request and response shape. Entities are never exposed. */
public final class Dtos {
    private Dtos() {}

    public static final String PASSWORD_RULE = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,72}$";
    public static final String PASSWORD_MESSAGE = "Password must be 8–72 characters with upper and lower case letters, a number and a symbol.";
    public static final String NAME_RULE = "^[\\p{L}][\\p{L} .'-]{1,79}$";
    public static final String NAME_MESSAGE = "Please enter your full name using letters only.";
    public static final String PHONE_RULE = "^$|^[+0-9 ()-]{7,20}$";
    public static final String PHONE_MESSAGE = "Please enter a valid phone number.";

    // ---------- Auth & profile ----------

    public record LoginRequest(
            @NotBlank(message = "Please enter your email.") @Email(message = "Please enter a valid email address.")
            @Size(max = 160, message = "Email is too long.") String email,
            @NotBlank(message = "Please enter your password.") @Size(max = 72, message = "Password is too long.") String password) {}

    public record RegisterRequest(
            @NotBlank(message = "Please enter your full name.") @Pattern(regexp = NAME_RULE, message = NAME_MESSAGE) String fullName,
            @NotBlank(message = "Please enter your email.") @Email(message = "Please enter a valid email address.")
            @Size(max = 160, message = "Email is too long.") String email,
            @NotBlank(message = "Please create a password.") @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String password,
            @Pattern(regexp = PHONE_RULE, message = PHONE_MESSAGE) String phone,
            String website /* honeypot */) {}

    public record UserDto(Long id, String fullName, String email, Role role, String phone, String address,
                          String bio, String avatarUrl, Instant createdAt) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.getPhone(), u.getAddress(),
                    u.getBio(), u.getAvatarUrl(), u.getCreatedAt());
        }
    }

    public record ProfileUpdate(
            @NotBlank(message = "Please enter your full name.") @Pattern(regexp = NAME_RULE, message = NAME_MESSAGE) String fullName,
            @Pattern(regexp = PHONE_RULE, message = PHONE_MESSAGE) String phone,
            @Size(max = 255, message = "Address must be 255 characters or fewer.") String address,
            @Size(max = 400, message = "This note must be 400 characters or fewer.") String bio) {}

    public record PasswordChange(
            @NotBlank(message = "Please enter your current password.") @Size(max = 72, message = "Password is too long.") String currentPassword,
            @NotBlank(message = "Please choose a new password.") @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String newPassword) {}

    public record ProfileStats(long favorites, long cartItems, long orders, BigDecimal spent, long unreadMessages) {}

    // ---------- Catalogue ----------

    public record ProductDto(Long id, String name, Category category, String description, String tag, String brand,
                             String fitment, String partNumber, String condition, Origin origin, List<String> options,
                             String optionLabel, BigDecimal price, int stock, boolean active, boolean featured,
                             List<String> images, Instant createdAt, boolean favorite) {
        public static ProductDto of(Product p, boolean favorite) {
            return new ProductDto(p.getId(), p.getName(), p.getCategory(), p.getDescription(), p.getTag(), p.getBrand(),
                    p.getFitment(), p.getPartNumber(), p.getCondition(), p.getOrigin(), splitOptions(p.getOptions()),
                    optionLabelOf(p), p.getPrice(), p.getStock(), p.isActive(), p.isFeatured(),
                    List.copyOf(p.getImages()), p.getCreatedAt(), favorite);
        }
    }

    public static List<String> splitOptions(String options) {
        if (options == null || options.isBlank()) return List.of();
        return Arrays.stream(options.trim().split("\\s*,\\s*")).filter(s -> !s.isBlank()).toList();
    }

    public static String optionLabelOf(Product p) {
        return p.getOptionLabel() == null || p.getOptionLabel().isBlank() ? "Option" : p.getOptionLabel();
    }

    public record ProductRequest(
            @NotBlank(message = "Please give the part a name.") @Size(max = 120, message = "Name must be 120 characters or fewer.") String name,
            @NotNull(message = "Please choose a category.") Category category,
            @Size(max = 2000, message = "Description must be 2000 characters or fewer.") String description,
            @Size(max = 32, message = "Label must be 32 characters or fewer.") String tag,
            @Size(max = 80, message = "Brand must be 80 characters or fewer.") String brand,
            @Size(max = 160, message = "Fitment must be 160 characters or fewer.") String fitment,
            @Size(max = 60, message = "Part number must be 60 characters or fewer.") String partNumber,
            @Size(max = 60, message = "Condition must be 60 characters or fewer.") String condition,
            Origin origin,
            @Size(max = 40, message = "Option label must be 40 characters or fewer.") String optionLabel,
            @Size(max = 120, message = "Options must be 120 characters or fewer.")
            @Pattern(regexp = "^[0-9A-Za-z.,/ ()-]*$", message = "Options must be a comma-separated list.") String options,
            @NotNull(message = "Please enter a price.") @DecimalMin(value = "0.00", message = "Price can't be negative.")
            @Digits(integer = 10, fraction = 2, message = "Please enter a valid price.") BigDecimal price,
            @Min(value = 0, message = "Stock can't be negative.") @Max(value = 100000, message = "Stock is too large.") int stock,
            boolean active,
            boolean featured,
            @NotNull(message = "Add between 1 and 8 images.") @Size(min = 1, max = 8, message = "Add between 1 and 8 images.")
            List<@NotBlank @Size(max = 400, message = "Image links must be 400 characters or fewer.") String> images) {}

    public record StockUpdate(@Min(value = 0, message = "Stock can't be negative.")
                              @Max(value = 100000, message = "Stock is too large.") int stock) {}

    public record VisibilityUpdate(Boolean active, Boolean featured) {}

    public record PublicProduct(Long id, String name, Category category, String tag, String brand, BigDecimal price,
                                boolean inStock, List<String> images) {}

    // ---------- Cart ----------

    public record CartAdd(@NotNull(message = "Please choose a part.") Long productId,
                          @Min(value = 1, message = "Quantity must be at least 1.") @Max(value = 20, message = "You can reserve up to 20 of a part.") int quantity,
                          @Size(max = 40) String option) {}

    public record CartQuantity(@Min(value = 1, message = "Quantity must be at least 1.")
                               @Max(value = 20, message = "You can reserve up to 20 of a part.") int quantity) {}

    public record CartItemDto(Long id, ProductDto product, int quantity, String option, BigDecimal lineTotal) {}

    public record CartDto(List<CartItemDto> items, int count, BigDecimal subtotal) {}

    // ---------- Reservations ----------

    public record CheckoutRequest(@Size(max = 500, message = "Notes must be 500 characters or fewer.") String note,
                                  @Size(max = 40) String pickupDate) {}

    public record StatusUpdate(@NotNull(message = "Please choose a status.") OrderStatus status,
                               PaymentMethod paymentMethod,
                               @Size(max = 80, message = "Reference must be 80 characters or fewer.")
                               @Pattern(regexp = "^[\\p{L}\\p{N} ._/#-]*$", message = "Reference can only contain letters, numbers, spaces and . _ / # -") String paymentReference) {}

    public record HoldExtension(@Min(value = 1, message = "Extend by 1 to 30 days.") @Max(value = 30, message = "Extend by 1 to 30 days.") int days) {}

    public record OrderItemDto(Long productId, String productName, String imageUrl, BigDecimal unitPrice, int quantity, String option) {
        public static OrderItemDto of(OrderItem i) {
            return new OrderItemDto(i.getProduct() == null ? null : i.getProduct().getId(), i.getProductName(),
                    i.getImageUrl(), i.getUnitPrice(), i.getQuantity(), i.getOption());
        }
    }

    public record OrderDto(Long id, String reference, OrderStatus status, BigDecimal total, String note, String pickupDate,
                           List<OrderItemDto> items, Instant createdAt, Instant updatedAt, Long customerId,
                           String customerName, String customerEmail, PaymentMethod paymentMethod,
                           String paymentReference, Instant paidAt, Instant holdUntil) {
        public static OrderDto of(Order o) {
            User c = o.getCustomer();
            return new OrderDto(o.getId(), o.getReference(), o.getStatus(), o.getTotal(), o.getNote(), o.getPickupDate(),
                    o.getItems().stream().map(OrderItemDto::of).toList(), o.getCreatedAt(), o.getUpdatedAt(),
                    c.getId(), c.getFullName(), c.getEmail(), o.getPaymentMethod(), o.getPaymentReference(),
                    o.getPaidAt(), o.getHoldUntil());
        }
    }

    // ---------- Chat ----------

    public record ChatSend(@NotBlank(message = "Please write a message.") @Size(max = 2000, message = "Messages must be 2000 characters or fewer.") String content,
                           Long productId) {}

    public record ChatProductDto(Long id, String name, BigDecimal price, String image) {}

    public record ChatMessageDto(Long id, Long customerId, Long senderId, String senderName, String senderAvatar,
                                 boolean fromAdmin, String content, ChatProductDto product, boolean read, Instant createdAt) {
        public static ChatMessageDto of(ChatMessage m) {
            Product p = m.getProduct();
            ChatProductDto pd = p == null ? null : new ChatProductDto(p.getId(), p.getName(), p.getPrice(),
                    p.getImages().isEmpty() ? null : p.getImages().get(0));
            User s = m.getSender();
            return new ChatMessageDto(m.getId(), m.getCustomer().getId(), s.getId(), s.getFullName(), s.getAvatarUrl(),
                    m.isFromAdmin(), m.getContent(), pd, m.isReadByRecipient(), m.getCreatedAt());
        }
    }

    public record ConversationDto(Long customerId, String customerName, String customerEmail, String customerAvatar,
                                  String lastMessage, boolean lastFromAdmin, Instant lastAt, long unread) {}

    /** type is "message", "read-by-admin" or "read-by-customer". */
    public record ChatEvent(String type, Long customerId, ChatMessageDto message) {}

    // ---------- Admin ----------

    public record CustomerDto(Long id, String fullName, String email, String phone, String address, String avatarUrl,
                              boolean enabled, Instant createdAt, Instant lastLoginAt, long orders, BigDecimal spent) {}

    public record CustomerStatus(@NotNull(message = "Please choose a status.") Boolean enabled) {}

    public record CategoryStat(Category category, long products, long units, BigDecimal value) {}

    public record StatsDto(long products, long activeProducts, long totalUnits, BigDecimal inventoryValue, long lowStock,
                           long soldOut, long customers, long pendingOrders, long openOrders, BigDecimal revenue,
                           long unreadMessages, List<CategoryStat> byCategory, List<ProductDto> lowStockProducts,
                           List<OrderDto> recentOrders) {}

    public record ApiError(String message, Map<String, String> fields) {}
}
