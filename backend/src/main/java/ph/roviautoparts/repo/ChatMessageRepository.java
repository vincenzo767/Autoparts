package ph.roviautoparts.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ph.roviautoparts.model.ChatMessage;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("select m from ChatMessage m join fetch m.sender join fetch m.customer left join fetch m.product " +
           "where m.customer.id = :customerId order by m.createdAt asc, m.id asc")
    List<ChatMessage> findThread(@Param("customerId") Long customerId);

    @Query("select m from ChatMessage m join fetch m.sender join fetch m.customer left join fetch m.product where m.id = :id")
    ChatMessage findFull(@Param("id") Long id);

    /** Messages the customer hasn't read yet (sent by the shop). */
    long countByCustomerIdAndFromAdminTrueAndReadByRecipientFalse(Long customerId);

    /** Messages from customers that no admin has read yet. */
    long countByFromAdminFalseAndReadByRecipientFalse();

    @Modifying
    @Query("update ChatMessage m set m.readByRecipient = true where m.customer.id = :customerId " +
           "and m.fromAdmin = :fromAdmin and m.readByRecipient = false")
    int markRead(@Param("customerId") Long customerId, @Param("fromAdmin") boolean fromAdmin);

    /** The newest message of every conversation, newest first. */
    @Query("select m from ChatMessage m join fetch m.customer where m.id in " +
           "(select max(m2.id) from ChatMessage m2 group by m2.customer.id) order by m.createdAt desc, m.id desc")
    List<ChatMessage> findLatestPerCustomer();

    /** Rows of [customerId, unread] for messages from customers. */
    @Query("select m.customer.id, count(m) from ChatMessage m where m.fromAdmin = false and m.readByRecipient = false " +
           "group by m.customer.id")
    List<Object[]> unreadByCustomer();

    @Modifying
    @Query("update ChatMessage m set m.product = null where m.product.id = :productId")
    void detachProduct(@Param("productId") Long productId);
}
