package ph.roviautoparts.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import ph.roviautoparts.model.Role;
import ph.roviautoparts.model.User;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

    Optional<User> findFirstByRoleOrderByIdAsc(Role role);

    List<User> findByRole(Role role);

    List<User> findByRoleOrderByCreatedAtDesc(Role role);

    @Query("select u.id from User u where u.role = ph.roviautoparts.model.Role.ADMIN")
    List<Long> findAdminIds();
}
