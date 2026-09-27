package ph.roviautoparts.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ph.roviautoparts.model.Favorite;
import ph.roviautoparts.model.Product;

import java.util.List;
import java.util.Set;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    boolean existsByUserIdAndProductId(Long userId, Long productId);

    @Query("select f.product.id from Favorite f where f.user.id = :userId")
    Set<Long> findProductIds(@Param("userId") Long userId);

    @Query("select f.product from Favorite f where f.user.id = :userId and f.product.active = true order by f.createdAt desc, f.id desc")
    List<Product> findActiveProducts(@Param("userId") Long userId);

    @Query("select count(f) from Favorite f where f.user.id = :userId and f.product.active = true")
    long countActive(@Param("userId") Long userId);

    @Modifying
    @Query("delete from Favorite f where f.user.id = :userId and f.product.id = :productId")
    void deleteOne(@Param("userId") Long userId, @Param("productId") Long productId);

    @Modifying
    @Query("delete from Favorite f where f.product.id = :productId")
    void deleteForProduct(@Param("productId") Long productId);
}
