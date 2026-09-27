package ph.roviautoparts.model;

import jakarta.persistence.*;

import java.math.BigDecimal;

/** A snapshot of a reserved part, so later catalogue edits never rewrite history. */
@Entity
@Table(name = "order_items")
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false, length = 120)
    private String productName;

    @Column(length = 400)
    private String imageUrl;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    private int quantity;

    @Column(name = "item_option", length = 40)
    private String option;

    public OrderItem() {}

    public OrderItem(Order order, Product product, int quantity, String option) {
        this.order = order;
        this.product = product;
        this.productName = product.getName();
        this.imageUrl = product.getImages().isEmpty() ? null : product.getImages().get(0);
        this.unitPrice = product.getPrice();
        this.quantity = quantity;
        this.option = option;
    }

    public Long getId() { return id; }
    public Order getOrder() { return order; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public String getProductName() { return productName; }
    public String getImageUrl() { return imageUrl; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public int getQuantity() { return quantity; }
    public String getOption() { return option; }
}
