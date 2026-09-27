package ph.roviautoparts.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ph.roviautoparts.dto.Dtos.*;
import ph.roviautoparts.model.ChatMessage;
import ph.roviautoparts.model.Product;
import ph.roviautoparts.model.Role;
import ph.roviautoparts.model.User;
import ph.roviautoparts.repo.ChatMessageRepository;
import ph.roviautoparts.repo.ProductRepository;
import ph.roviautoparts.repo.UserRepository;
import ph.roviautoparts.web.ApiException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * One thread per customer with the shop. Messages are persisted, then pushed over the
 * WebSocket to the customer and every admin after the transaction commits.
 */
@Service
public class ChatService {
    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ChatMessageRepository messages;
    private final UserRepository users;
    private final ProductRepository products;
    private final SimpMessagingTemplate broker;

    public ChatService(ChatMessageRepository messages, UserRepository users, ProductRepository products,
                       SimpMessagingTemplate broker) {
        this.messages = messages;
        this.users = users;
        this.products = products;
        this.broker = broker;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> thread(Long customerId) {
        return messages.findThread(customerId).stream().map(ChatMessageDto::of).toList();
    }

    /** A message from the customer themselves. Inactive attached parts are silently dropped. */
    @Transactional
    public ChatMessageDto sendFromCustomer(Long customerId, ChatSend req) {
        User customer = users.findById(customerId).orElseThrow(() -> ApiException.notFound("Customer not found."));
        Product product = null;
        if (req.productId() != null) {
            product = products.findById(req.productId()).filter(Product::isActive).orElse(null);
        }
        return save(customer, customer, req.content().trim(), product);
    }

    /** A message from an admin on the shop's behalf. Can start a thread with any customer. */
    @Transactional
    public ChatMessageDto sendFromAdmin(Long adminId, Long customerId, ChatSend req) {
        User admin = users.findById(adminId).orElseThrow(() -> ApiException.notFound("Account not found."));
        User customer = users.findById(customerId)
                .filter(u -> u.getRole() == Role.CUSTOMER)
                .orElseThrow(() -> ApiException.notFound("Customer not found."));
        Product product = req.productId() == null ? null : products.findById(req.productId()).orElse(null);
        return save(customer, admin, req.content().trim(), product);
    }

    /**
     * Posts a message from the shop. Uses the acting admin when given, otherwise the first admin.
     * Does nothing if no admin exists yet.
     */
    @Transactional
    public void postFromShop(User customer, User actingAdmin, String content) {
        User sender = actingAdmin != null ? actingAdmin : users.findFirstByRoleOrderByIdAsc(Role.ADMIN).orElse(null);
        if (sender == null) {
            log.info("No admin account exists yet, so the shop message to {} was skipped.", customer.getEmail());
            return;
        }
        save(customer, sender, content, null);
    }

    private ChatMessageDto save(User customer, User sender, String content, Product product) {
        ChatMessage m = messages.save(new ChatMessage(customer, sender, content, product));
        ChatMessageDto dto = ChatMessageDto.of(m);
        publish(new ChatEvent("message", customer.getId(), dto));
        return dto;
    }

    /** Marks messages sent to the reader as read, and tells the other side if anything changed. */
    @Transactional
    public void markRead(Long customerId, boolean readerIsAdmin) {
        // An admin reads what the customer sent (fromAdmin = false), and vice versa.
        int changed = messages.markRead(customerId, !readerIsAdmin);
        if (changed > 0) {
            publish(new ChatEvent(readerIsAdmin ? "read-by-admin" : "read-by-customer", customerId, null));
        }
    }

    @Transactional(readOnly = true)
    public long unreadForCustomer(Long customerId) {
        return messages.countByCustomerIdAndFromAdminTrueAndReadByRecipientFalse(customerId);
    }

    @Transactional(readOnly = true)
    public long unreadForAdmins() {
        return messages.countByFromAdminFalseAndReadByRecipientFalse();
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> conversations() {
        Map<Long, Long> unread = new HashMap<>();
        for (Object[] row : messages.unreadByCustomer()) unread.put((Long) row[0], ((Number) row[1]).longValue());
        return messages.findLatestPerCustomer().stream().map(m -> {
            User c = m.getCustomer();
            return new ConversationDto(c.getId(), c.getFullName(), c.getEmail(), c.getAvatarUrl(), m.getContent(),
                    m.isFromAdmin(), m.getCreatedAt(), unread.getOrDefault(c.getId(), 0L));
        }).toList();
    }

    private void publish(ChatEvent event) {
        List<Long> adminIds = users.findAdminIds();
        Runnable push = () -> {
            try {
                broker.convertAndSendToUser(String.valueOf(event.customerId()), "/queue/chat", event);
                for (Long id : adminIds) {
                    broker.convertAndSendToUser(String.valueOf(id), "/queue/chat", event);
                }
            } catch (RuntimeException e) {
                log.warn("Could not push chat event: {}", e.getMessage());
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    push.run();
                }
            });
        } else {
            push.run();
        }
    }
}
