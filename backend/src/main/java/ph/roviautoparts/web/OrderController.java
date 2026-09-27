package ph.roviautoparts.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ph.roviautoparts.dto.Dtos.CheckoutRequest;
import ph.roviautoparts.dto.Dtos.OrderDto;
import ph.roviautoparts.security.CurrentUser;
import ph.roviautoparts.service.OrderService;

import java.util.List;

/** The customer's reservations. */
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orders;
    private final CurrentUser current;

    public OrderController(OrderService orders, CurrentUser current) {
        this.orders = orders;
        this.current = current;
    }

    @GetMapping
    public List<OrderDto> list() {
        return orders.forCustomer(current.id());
    }

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDto checkout(@Valid @RequestBody(required = false) CheckoutRequest req) {
        return orders.checkout(current.id(), req);
    }

    @PostMapping("/{id}/cancel")
    public OrderDto cancel(@PathVariable Long id) {
        return orders.cancelByCustomer(current.id(), id);
    }
}
