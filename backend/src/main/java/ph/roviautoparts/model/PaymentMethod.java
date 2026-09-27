package ph.roviautoparts.model;

public enum PaymentMethod {
    CASH("cash"), GCASH("GCash"), MAYA("Maya"), CARD("card"), BANK_TRANSFER("bank transfer");

    private final String label;

    PaymentMethod(String label) { this.label = label; }

    /** Label used inside chat sentences, e.g. "paid by GCash". */
    public String label() { return label; }
}
