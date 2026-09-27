package ph.roviautoparts.model;

public enum OrderStatus {
    PENDING, CONFIRMED, READY_FOR_PICKUP, COMPLETED, CANCELLED;

    public boolean isOpen() { return this == PENDING || this == CONFIRMED || this == READY_FOR_PICKUP; }
}
