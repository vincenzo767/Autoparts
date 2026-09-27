package ph.roviautoparts.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "chat_messages", indexes = @Index(name = "idx_chat_customer_created", columnList = "customer_id, createdAt"))
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The conversation key: every customer has exactly one thread with the shop. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, length = 2000)
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    private boolean fromAdmin;
    private boolean readByRecipient;
    private Instant createdAt = Instant.now();

    public ChatMessage() {}

    public ChatMessage(User customer, User sender, String content, Product product) {
        this.customer = customer;
        this.sender = sender;
        this.content = content;
        this.product = product;
        this.fromAdmin = sender.isAdmin();
    }

    public Long getId() { return id; }
    public User getCustomer() { return customer; }
    public User getSender() { return sender; }
    public String getContent() { return content; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public boolean isFromAdmin() { return fromAdmin; }
    public boolean isReadByRecipient() { return readByRecipient; }
    public void setReadByRecipient(boolean readByRecipient) { this.readByRecipient = readByRecipient; }
    public Instant getCreatedAt() { return createdAt; }
}
