package ph.roviautoparts.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ph.roviautoparts.model.CartItem;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    @Query("select c from CartItem c join fetch c.product where c.user.id = :userId order by c.createdAt asc, c.id asc")
    List<CartItem> findForUser(@Param("userId") Long userId);

    @Query("select c from CartItem c where c.user.id = :userId and c.product.id = :productId " +
           "and ((:option is null and c.option is null) or c.option = :option)")
    Optional<CartItem> findLine(@Param("userId") Long userId, @Param("productId") Long productId, @Param("option") String option);

    Optional<CartItem> findByIdAndUserId(Long id, Long userId);

    @Query("select coalesce(sum(c.quantity), 0) from CartItem c where c.user.id = :userId")
    long sumQuantity(@Param("userId") Long userId);

    @Modifying
    @Query("delete from CartItem c where c.user.id = :userId")
    void deleteForUser(@Param("userId") Long userId);

    @Modifying
    @Query("delete from CartItem c where c.product.id = :productId")
    void deleteForProduct(@Param("productId") Long productId);
}
