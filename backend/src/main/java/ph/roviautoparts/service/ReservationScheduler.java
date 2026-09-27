package ph.roviautoparts.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Releases reservations that weren't collected before their hold ran out. */
@Component
public class ReservationScheduler {
    private static final Logger log = LoggerFactory.getLogger(ReservationScheduler.class);
    private final OrderService orders;

    public ReservationScheduler(OrderService orders) {
        this.orders = orders;
    }

    @Scheduled(initialDelayString = "PT1M", fixedDelayString = "${app.reservations.check-interval:PT30M}")
    public void releaseOverdue() {
        try {
            int released = orders.releaseExpired();
            if (released > 0) log.info("Released {} overdue reservation(s)", released);
        } catch (RuntimeException e) {
            log.error("Reservation check failed", e);
        }
    }
}
