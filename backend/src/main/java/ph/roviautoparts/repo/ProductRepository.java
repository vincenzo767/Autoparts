package ph.roviautoparts.repo;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ph.roviautoparts.model.Category;
import ph.roviautoparts.model.Product;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findLockedById(@Param("id") Long id);

    List<Product> findByActiveTrue();

    List<Product> findAllByOrderByCreatedAtDescIdDesc();

    List<Product> findTop8ByActiveTrueAndFeaturedTrueOrderByIdAsc();

    List<Product> findTop4ByCategoryAndActiveTrueAndIdNotOrderByFeaturedDescIdAsc(Category category, Long id);

    List<Product> findTop6ByStockLessThanEqualOrderByStockAscIdAsc(int stock);

    /** Rows of [category, products, units, value]. */
    @Query("select p.category, count(p), coalesce(sum(p.stock), 0), coalesce(sum(p.price * p.stock), 0) " +
           "from Product p group by p.category")
    List<Object[]> categoryStats();

    @Query("select count(i) > 0 from OrderItem i where i.imageUrl = :url")
    boolean isImageUsedByOrder(@Param("url") String url);
}
