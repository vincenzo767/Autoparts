package ph.roviautoparts.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "cart_items")
public class CartItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private int quantity;

    // "option" is reserved in MySQL
    @Column(name = "item_option", length = 40)
    private String option;

    private Instant createdAt = Instant.now();

    public CartItem() {}

    public CartItem(User user, Product product, int quantity, String option) {
        this.user = user;
        this.product = product;
        this.quantity = quantity;
        this.option = option;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public Product getProduct() { return product; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public String getOption() { return option; }
    public Instant getCreatedAt() { return createdAt; }
}
