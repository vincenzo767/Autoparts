package ph.roviautoparts.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ph.roviautoparts.model.Order;
import ph.roviautoparts.model.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    boolean existsByReference(String reference);

    @Query("select o from Order o join fetch o.customer where o.customer.id = :customerId order by o.createdAt desc, o.id desc")
    List<Order> findForCustomer(@Param("customerId") Long customerId);

    @Query("select o from Order o join fetch o.customer order by o.createdAt desc, o.id desc")
    List<Order> findAllWithCustomer();

    @Query("select o from Order o join fetch o.customer where o.id = :id")
    Optional<Order> findWithCustomer(@Param("id") Long id);

    List<Order> findTop6ByOrderByCreatedAtDescIdDesc();

    @Query("select o from Order o join fetch o.customer where o.status in :statuses and o.holdUntil < :now")
    List<Order> findExpired(@Param("statuses") Collection<OrderStatus> statuses, @Param("now") Instant now);

    @Query("select o from Order o where o.status in :statuses and o.holdUntil is null")
    List<Order> findOpenWithoutHold(@Param("statuses") Collection<OrderStatus> statuses);

    long countByCustomerId(Long customerId);

    @Query("select coalesce(sum(o.total), 0) from Order o where o.customer.id = :customerId " +
           "and o.status <> ph.roviautoparts.model.OrderStatus.CANCELLED")
    BigDecimal spentBy(@Param("customerId") Long customerId);

    /** Rows of [customerId, orders, spent] for every customer with reservations. */
    @Query("select o.customer.id, count(o), coalesce(sum(case when o.status <> ph.roviautoparts.model.OrderStatus.CANCELLED " +
           "then o.total else 0 end), 0) from Order o group by o.customer.id")
    List<Object[]> customerTotals();

    @Modifying
    @Query("update OrderItem i set i.product = null where i.product.id = :productId")
    void detachProduct(@Param("productId") Long productId);
}
